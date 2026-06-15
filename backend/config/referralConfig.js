// Centralized configuration for the referral & coin reward system.
// Tweak amounts/thresholds here - nothing referral-related should be hardcoded elsewhere.

export const REFERRAL_CODE = {
  LENGTH: 7,
  // No 0/O/1/I/L - avoids ambiguous characters when read aloud or typed.
  CHARSET: "ABCDEFGHJKMNPQRSTUVWXYZ23456789",
  MAX_GENERATION_ATTEMPTS: 10,
};

// A code pasted from a URL must pass this before any DB lookup happens.
export const REFERRAL_CODE_INPUT_REGEX = /^[A-Z0-9]{4,12}$/;

export const REWARDS = {
  REFERRER_COINS: 50,
  REFERRED_COINS: 25,
  // When true, both sides are paid the moment the referred friend signs up -
  // the MILESTONES gates below are skipped entirely. Set to false to go back
  // to milestone-gated payouts.
  INSTANT: true,
};

export const MILESTONES = {
  MIN_ACTIVE_DAYS: 3,
  MIN_EXPENSES: 3,
  REQUIRE_PROFILE_COMPLETE: true,
  // UserProfile fields that must all be non-empty for "profile completed".
  PROFILE_COMPLETE_FIELDS: ["mobile", "city", "bio"],
};

// How long after account creation a referral code can still be attributed.
// Covers signups where the attribution call was lost (backend down, race with
// authMiddleware creating the user first, network blip) - the friend just has
// to sign in through the invite link again within this window.
export const ATTRIBUTION_WINDOW_HOURS = 48;

export const ANTI_FRAUD = {
  // Max referrals a single referrer can be paid out for per rolling 24h window.
  MAX_REWARDED_REFERRALS_PER_DAY: 5,
  // Max referrals a single referrer can ever be paid out for.
  MAX_TOTAL_REWARDED_REFERRALS: 100,
};

// Display-only tiers shown on the profile page based on coin balance.
export const ELITE_TIERS = [
  {
    key: "starter",
    name: "Starter",
    minCoins: 0,
    perks: ["Default app theme", "Standard support"],
  },
  {
    key: "bronze",
    name: "Bronze",
    minCoins: 100,
    perks: ["Bronze profile badge", "1 custom theme unlock"],
  },
  {
    key: "silver",
    name: "Silver",
    minCoins: 300,
    perks: ["Silver profile badge", "All custom themes"],
  },
  {
    key: "gold",
    name: "Gold",
    minCoins: 750,
    perks: ["Gold profile badge", "Priority support", "Early access features"],
  },
  {
    key: "elite",
    name: "Elite Club",
    minCoins: 1500,
    perks: ["Elite profile badge", "Exclusive Elite Club perks", "All future rewards"],
  },
];
