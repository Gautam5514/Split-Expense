import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import UserProfile from "../models/userProfileModel.js";
import Referral from "../models/referralModel.js";
import CoinTransaction from "../models/coinTransactionModel.js";
import {
  REFERRAL_CODE,
  REFERRAL_CODE_INPUT_REGEX,
  REWARDS,
  MILESTONES,
  ANTI_FRAUD,
} from "../config/referralConfig.js";

// -------------------- Code generation --------------------

const generateRandomCode = () => {
  let code = "";
  const bytes = crypto.randomBytes(REFERRAL_CODE.LENGTH);
  for (let i = 0; i < REFERRAL_CODE.LENGTH; i++) {
    code += REFERRAL_CODE.CHARSET[bytes[i] % REFERRAL_CODE.CHARSET.length];
  }
  return code;
};

export const generateUniqueReferralCode = async () => {
  for (let attempt = 0; attempt < REFERRAL_CODE.MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateRandomCode();
    const existing = await User.exists({ referralCode: code });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique referral code");
};

/**
 * Lazily backfills `referralCode` for any user that doesn't have one yet -
 * covers both brand-new signups and pre-existing accounts created before the
 * referral system shipped. Idempotent and race-safe:
 *  - the `referralCode: null/missing` filter means only one of two concurrent
 *    callers can win the write;
 *  - the loser re-reads the code the winner just set;
 *  - a (vanishingly unlikely) unique-index collision on write is retried.
 * Returns the user's referral code.
 */
export const ensureReferralCode = async (userId) => {
  for (let attempt = 0; attempt < REFERRAL_CODE.MAX_GENERATION_ATTEMPTS; attempt++) {
    const current = await User.findById(userId).select("referralCode").lean();
    if (!current) return null; // account deleted concurrently
    if (current.referralCode) return current.referralCode;

    const code = await generateUniqueReferralCode();
    try {
      const updated = await User.findOneAndUpdate(
        { _id: userId, referralCode: { $in: [null, undefined] } },
        { $set: { referralCode: code } },
        { new: true }
      );
      if (updated) return updated.referralCode;
      // Lost the race - another request already set a code; loop will read it back.
    } catch (err) {
      if (err?.code !== 11000) throw err; // unrelated error - don't swallow
      // Duplicate code collision (extremely rare) - loop and try a fresh code.
    }
  }
  throw new Error("Could not assign a unique referral code");
};

// -------------------- User provisioning (atomic upsert + own code) --------------------

/**
 * Atomically finds-or-creates a user by email. Mirrors the upsert previously
 * duplicated in authMiddleware/googleLogin, plus referral-code generation on
 * first creation. Returns { user, isNew }.
 */
export const findOrCreateUser = async ({ uid, email, name, picture }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const result = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $setOnInsert: {
        firebaseUid: uid,
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        photoURL: picture || "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, includeResultMetadata: true }
  );

  let user = result.value;
  const isNew = !!result.lastErrorObject?.upserted;

  // Backfill a referral code for brand-new signups AND pre-existing accounts
  // that were created before the referral system shipped.
  if (!user.referralCode) {
    user.referralCode = await ensureReferralCode(user._id);
  }

  // Sync mutable fields that can change after account creation.
  //
  // NOTE: `name` is deliberately NOT synced here. This function runs on every
  // authenticated request, and the incoming `name` is the Firebase token's
  // displayName. Re-syncing it would overwrite a name the user edited in their
  // profile on the very next request. The user's in-app name is authoritative;
  // profile edits also push the new name back to Firebase to keep them aligned.
  const updates = {};
  if (!user.firebaseUid && uid) updates.firebaseUid = uid;
  if (picture && user.photoURL !== picture) updates.photoURL = picture;

  if (Object.keys(updates).length) {
    await User.updateOne({ _id: user._id }, { $set: updates });
    Object.assign(user, updates);
  }

  return { user, isNew };
};

// -------------------- Attribution (Flow D) --------------------

export const sanitizeReferralCode = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!REFERRAL_CODE_INPUT_REGEX.test(code)) return null;
  return code;
};

/**
 * Attributes a brand-new user to the referrer behind `rawCode`, if valid.
 * Silently no-ops on any invalid/fraudulent/missing case (per spec - never
 * surface referral errors to the signup flow). Write-once: only ever called
 * for users whose referredBy is still null.
 */
export const attributeReferral = async (newUser, rawCode) => {
  try {
    if (newUser.referredBy) return; // write-once guard

    const code = sanitizeReferralCode(rawCode);
    if (!code) return;

    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) return; // unknown code -> ignore silently

    // Self-referral guards.
    if (referrer._id.equals(newUser._id)) return;
    if (referrer.email && newUser.email && referrer.email === newUser.email) return;

    // updateOne (not save) - avoids optimistic-concurrency VersionError, and
    // the referredBy:null filter is an extra write-once guard against races.
    const updateResult = await User.updateOne(
      { _id: newUser._id, referredBy: null },
      { $set: { referredBy: referrer._id } }
    );
    if (updateResult.modifiedCount === 0) return; // already attributed by a concurrent request
    newUser.referredBy = referrer._id;

    await Referral.create({
      referrerId: referrer._id,
      referredUserId: newUser._id,
      status: "pending",
      referrerRewardAmount: REWARDS.REFERRER_COINS,
      referredRewardAmount: REWARDS.REFERRED_COINS,
    });

    // Instant mode: qualify & pay both sides right now, so the coins are
    // already on the account by the time the signup response returns.
    if (REWARDS.INSTANT) {
      await checkAndQualifyMilestones(newUser._id);
    }
  } catch (err) {
    // Duplicate key (referredUserId unique) or any other issue -> never break signup.
    console.error("attributeReferral error:", err.message);
  }
};

// -------------------- Active-day & action tracking (Flow E) --------------------

const todayUTC = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

/**
 * Bumps the user's active-day counter at most once per UTC day.
 * Cheap on the hot path: only writes when the date actually changed.
 */
export const recordActiveDay = async (user) => {
  const today = todayUTC();
  if (user.lastActiveDate === today) {
    // Instant mode: keep sweeping so referrals created while milestone-gating
    // was on (still sitting in "pending") pay out on the user's next request.
    if (REWARDS.INSTANT) {
      await checkAndQualifyMilestones(user._id);
    }
    return;
  }

  await User.updateOne({ _id: user._id }, { $set: { lastActiveDate: today }, $inc: { activeDaysCount: 1 } });
  user.lastActiveDate = today;
  user.activeDaysCount = (user.activeDaysCount || 0) + 1;

  await checkAndQualifyMilestones(user._id);
};

export const incrementExpenseCount = async (userId) => {
  await User.updateOne({ _id: userId }, { $inc: { expenseCount: 1 } });
  await checkAndQualifyMilestones(userId);
};

const isProfileComplete = async (userId) => {
  if (!MILESTONES.REQUIRE_PROFILE_COMPLETE) return true;
  const profile = await UserProfile.findOne({ userId }).lean();
  if (!profile) return false;
  return MILESTONES.PROFILE_COMPLETE_FIELDS.every((field) => !!String(profile[field] || "").trim());
};

/**
 * Re-evaluates whether the referral for `referredUserId` (as the referred
 * side) has met all milestones. If so, flips it to "qualified" and triggers
 * the payout. Safe to call repeatedly - no-ops once the referral has left
 * "pending".
 */
export const checkAndQualifyMilestones = async (referredUserId) => {
  const referral = await Referral.findOne({ referredUserId, status: "pending" });
  if (!referral) return;

  const user = await User.findById(referredUserId).lean();
  if (!user) return;

  // Instant mode skips every milestone gate - signup alone qualifies.
  if (!REWARDS.INSTANT) {
    if (user.activeDaysCount < MILESTONES.MIN_ACTIVE_DAYS) return;
    if (user.expenseCount < MILESTONES.MIN_EXPENSES) return;
    if (!(await isProfileComplete(referredUserId))) return;
  }

  referral.status = "qualified";
  referral.qualifiedAt = new Date();
  await referral.save();

  await payoutReferral(referral._id);
};

/**
 * Cancels a referral for a `referredUserId` that has not yet qualified, e.g.
 * because that user deleted their account before completing the milestones.
 */
export const cancelPendingReferralFor = async (referredUserId) => {
  await Referral.updateOne(
    { referredUserId, status: "pending" },
    { $set: { status: "cancelled" } }
  );
};

// -------------------- Payout (idempotent, transactional) --------------------

const creditCoins = async (session, userId, amount, reason, refId) => {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    // lifetimeCoinsEarned only ever goes up - it backs the permanent tier
    // badges, while `coins` is the spendable balance.
    { $inc: { coins: amount, lifetimeCoinsEarned: amount } },
    { new: true, session }
  );
  if (!user) return null; // account deleted - skip this side of the payout

  await CoinTransaction.create(
    [{ userId, amount, balanceAfter: user.coins, reason, refId }],
    { session }
  );
  return user;
};

/**
 * Pays out a "qualified" referral exactly once. Wrapped in a DB transaction
 * so a partial failure never leaves one side credited and the other not.
 * Re-running this for an already-rewarded/cancelled referral is a no-op.
 */
export const payoutReferral = async (referralId) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const referral = await Referral.findById(referralId).session(session);
      if (!referral || referral.status !== "qualified" || referral.rewardGiven) return;

      // Anti-fraud caps on the referrer side.
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [last24h, totalRewarded] = await Promise.all([
        Referral.countDocuments({
          referrerId: referral.referrerId,
          status: "rewarded",
          rewardedAt: { $gte: oneDayAgo },
        }).session(session),
        Referral.countDocuments({
          referrerId: referral.referrerId,
          status: "rewarded",
        }).session(session),
      ]);

      if (
        last24h >= ANTI_FRAUD.MAX_REWARDED_REFERRALS_PER_DAY ||
        totalRewarded >= ANTI_FRAUD.MAX_TOTAL_REWARDED_REFERRALS
      ) {
        referral.flagged = true;
        referral.flagReason = "Anti-fraud reward cap reached - held for review";
        await referral.save({ session });
        return;
      }

      // Referrer may have deleted their account - skip their reward gracefully.
      await creditCoins(
        session,
        referral.referrerId,
        referral.referrerRewardAmount,
        "referral_referrer_reward",
        referral._id
      );

      await creditCoins(
        session,
        referral.referredUserId,
        referral.referredRewardAmount,
        "referral_referred_reward",
        referral._id
      );

      referral.status = "rewarded";
      referral.rewardGiven = true;
      referral.rewardedAt = new Date();
      await referral.save({ session });
    });
  } finally {
    await session.endSession();
  }
};
