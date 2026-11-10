import User from "../models/userModel.js";
import UserProfile from "../models/userProfileModel.js";
import Referral from "../models/referralModel.js";
import CoinTransaction from "../models/coinTransactionModel.js";
import { MILESTONES, ELITE_TIERS, REWARDS } from "../config/referralConfig.js";
import { STORE_ITEMS } from "../config/storeConfig.js";
import { ensureReferralCode } from "../utils/referralService.js";
import { buildThemeStore, themeAccess, tierBasisCoins as tierBasis } from "../utils/storeAccess.js";

const buildEliteClub = (coins) => {
  let current = ELITE_TIERS[0];
  let next = null;

  for (let i = 0; i < ELITE_TIERS.length; i++) {
    if (coins >= ELITE_TIERS[i].minCoins) {
      current = ELITE_TIERS[i];
      next = ELITE_TIERS[i + 1] || null;
    }
  }

  return {
    tier: { key: current.key, name: current.name, perks: current.perks, minCoins: current.minCoins },
    nextTier: next ? { key: next.key, name: next.name, perks: next.perks, minCoins: next.minCoins } : null,
    coinsToNext: next ? Math.max(next.minCoins - coins, 0) : 0,
    // How many more referrals reach the next tier - a concrete, motivating goal.
    friendsToNext: next ? Math.ceil(Math.max(next.minCoins - coins, 0) / Math.max(REWARDS.REFERRER_COINS, 1)) : 0,
    // Lifetime-earned coins the tier was computed from (>= spendable balance).
    basisCoins: coins,
    allTiers: ELITE_TIERS,
  };
};

// GET /api/referrals/me
export const getMyReferralData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Defensive backfill - covers any account that reached this endpoint
    // without having gone through findOrCreateUser (e.g. data created before
    // this feature shipped, or via an admin/script path).
    if (!user.referralCode) {
      user.referralCode = await ensureReferralCode(userId);
    }

    const referrals = await Referral.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .populate("referredUserId", "name photoURL createdAt activeDaysCount expenseCount")
      .lean();

    // Profile-completion lookup for any still-pending invitees.
    const pendingUserIds = referrals
      .filter((r) => r.status === "pending" && r.referredUserId)
      .map((r) => r.referredUserId._id);

    const profiles = pendingUserIds.length
      ? await UserProfile.find({ userId: { $in: pendingUserIds } }).lean()
      : [];
    const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

    const invited = referrals.map((r) => {
      const friend = r.referredUserId;
      let progress = null;

      if (r.status === "pending" && friend) {
        const profile = profileMap.get(String(friend._id)) || {};
        const profileComplete = MILESTONES.PROFILE_COMPLETE_FIELDS.every(
          (field) => !!String(profile[field] || "").trim()
        );
        progress = {
          activeDays: { current: friend.activeDaysCount || 0, required: MILESTONES.MIN_ACTIVE_DAYS },
          expenses: { current: friend.expenseCount || 0, required: MILESTONES.MIN_EXPENSES },
          profileComplete: MILESTONES.REQUIRE_PROFILE_COMPLETE ? profileComplete : true,
        };
      }

      return {
        id: r._id,
        friend: friend ? { id: friend._id, name: friend.name, photoURL: friend.photoURL, joinedAt: friend.createdAt } : null,
        status: r.status,
        progress,
        referrerRewardAmount: r.referrerRewardAmount,
        referredRewardAmount: r.referredRewardAmount,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        rewardedAt: r.rewardedAt,
      };
    });

    const successfulReferrals = referrals.filter((r) => r.status === "rewarded").length;
    const totalEarned = referrals
      .filter((r) => r.status === "rewarded")
      .reduce((sum, r) => sum + (r.referrerRewardAmount || 0), 0);

    res.json({
      referralCode: user.referralCode,
      coins: user.coins || 0,
      successfulReferrals,
      totalEarned,
      invited,
      // What a referral is worth, so the UI never hardcodes (or omits) amounts.
      rewards: { referrerCoins: REWARDS.REFERRER_COINS, referredCoins: REWARDS.REFERRED_COINS },
      unlockedItems: user.unlockedItems || [],
      eliteClub: buildEliteClub(tierBasis(user)),
      // Themes this user can use / unlock, with today's price for them.
      store: buildThemeStore(user),
    });
  } catch (err) {
    console.error("getMyReferralData error:", err.message);
    res.status(500).json({ message: "Failed to load referral data", expose: true });
  }
};

// POST /api/referrals/purchase  { itemId }
// Buys a store item with coins. The balance decreases; ownership is forever.
export const purchaseStoreItem = async (req, res) => {
  try {
    const itemId = String(req.body?.itemId || "");
    const item = STORE_ITEMS[itemId];
    if (!item) return res.status(400).json({ message: "Unknown item" });

    const userId = req.user.id;

    const existing = await User.findById(userId).select("coins unlockedItems lifetimeCoinsEarned").lean();
    if (!existing) return res.status(404).json({ message: "User not found" });

    if ((existing.unlockedItems || []).includes(itemId)) {
      return res.json({
        coins: existing.coins || 0,
        unlockedItems: existing.unlockedItems,
        alreadyOwned: true,
        store: buildThemeStore(existing),
      });
    }

    // What it costs THIS user: a tier can make a theme free (see storeAccess).
    const access = item.type === "theme" ? themeAccess(existing, itemId) : null;
    const price = access ? access.price : item.cost;
    // Bronze's free theme is one pick only - the filter below makes a second
    // concurrent free pick fail instead of handing out two.
    const freePickGuard =
      access?.access === "free-pick"
        ? { unlockedItems: { $not: { $elemMatch: { $regex: /^theme:/ } } } }
        : { unlockedItems: { $ne: itemId } };

    // Atomic: only succeeds if the balance still covers the price and the item
    // isn't already owned - safe under double-clicks / concurrent requests.
    const user = await User.findOneAndUpdate(
      { _id: userId, coins: { $gte: price }, ...freePickGuard },
      { $inc: { coins: -price }, $addToSet: { unlockedItems: itemId } },
      { new: true }
    );

    if (!user && access?.access === "free-pick") {
      return res.status(400).json({ message: "Your free Bronze theme has already been used." });
    }

    if (!user) {
      const shortBy = price - (existing.coins || 0);
      return res.status(400).json({
        message: `Not enough coins - you need ${Math.max(shortBy, 0)} more to unlock ${item.name}.`,
      });
    }

    if (price > 0) {
      await CoinTransaction.create({
        userId: user._id,
        amount: -price,
        balanceAfter: user.coins,
        reason: "store_purchase",
      });
    }

    res.json({
      coins: user.coins,
      unlockedItems: user.unlockedItems,
      item: { id: itemId, name: item.name, cost: price },
      eliteClub: buildEliteClub(tierBasis(user)),
      store: buildThemeStore(user),
    });
  } catch (err) {
    console.error("purchaseStoreItem error:", err.message);
    res.status(500).json({ message: "Purchase failed", expose: true });
  }
};
