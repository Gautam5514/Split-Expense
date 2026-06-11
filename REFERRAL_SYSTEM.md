# Referral & Coin Reward System

A single-level referral program built on top of the existing Firebase Google
Login + MongoDB/Mongoose stack. Inviters and invitees both earn coins once the
invitee hits usage milestones - never instantly on signup.

## Data model

### `User` (extended - `backend/models/userModel.js`)
| Field | Type | Notes |
|---|---|---|
| `referralCode` | String, unique, sparse | Generated on first account creation, or lazily backfilled on next login for accounts that pre-date this feature (see [Existing users](#existing-users--lazy-referral-code-backfill)). 7 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`). |
| `referredBy` | ObjectId ref `User`, default `null` | Set at most once, at first-ever account creation. Write-once is enforced at the application layer (see below), not via Mongoose `immutable`. |
| `coins` | Number, default 0, `min: 0` | Only ever mutated server-side via `payoutReferral`. |
| `activeDaysCount` | Number | Incremented at most once per UTC day. |
| `lastActiveDate` | String (`YYYY-MM-DD`, UTC) | Used to dedupe the active-day increment. |
| `expenseCount` | Number | Incremented every time the user creates an expense. |

### `Referral` (`backend/models/referralModel.js`)
One row per referred user (`referredUserId` is unique).
`status`: `pending -> qualified -> rewarded`, or `cancelled`.
`flagged`/`flagReason` are set when an anti-fraud cap blocks an otherwise-qualified payout (held for manual review).

### `CoinTransaction` (`backend/models/coinTransactionModel.js`)
Append-only ledger: `userId, amount, balanceAfter, reason, refId (-> Referral), createdAt`.
`reason` is `referral_referrer_reward` or `referral_referred_reward`.

### Config - `backend/config/referralConfig.js`
All reward amounts, milestone thresholds, anti-fraud caps, and Elite Club tiers
live here. Nothing is hardcoded elsewhere.

## Flows

**A - Code generation.** `findOrCreateUser()` in `backend/utils/referralService.js`
runs on every first-time account creation (both `/api/auth/google` and
`authMiddleware`'s upsert) and assigns a unique `referralCode` via
`generateUniqueReferralCode()` (retries on collision). It also calls
`ensureReferralCode()` for *any* user it loads that is still missing a code -
this is what backfills codes for pre-existing accounts (see below).

**B - Sharing.** Profile page shows the code and the link
`https://<frontend>/invite/<CODE>`. Copy buttons for both, Web Share API for
the link (falls back to copy on desktop).

**C - Capture (`frontend/lib/referral.js`).** `/invite/[code]` and the
home/login/register pages call `captureReferralFromLocation()` /
`captureReferralCode()` on mount, which stores the code in `localStorage`
*and* a `se_ref` cookie (30-day max-age) so it survives the OAuth redirect
even if `localStorage` is cleared.

**D - Attribution (`attributeReferral`).** On first-ever account creation via
`POST /api/auth/google`, the frontend sends the stored code as
`referralCode`. The backend validates it, looks up the referrer, and - if all
edge cases pass - sets `referredBy` (write-once) and creates a `Referral` row
with `status: "pending"`. The frontend clears the stored code immediately
after this call regardless of outcome (one-shot; backend silently ignores bad
codes).

**E - Qualification & payout.**
- `recordActiveDay()` runs in `authMiddleware` on every authenticated
  request, incrementing `activeDaysCount` at most once/day.
- `incrementExpenseCount()` runs after `addExpense`.
- `checkAndQualifyMilestones()` runs after each of the above plus after
  `PUT /api/profile`, and flips `pending -> qualified` once
  `activeDaysCount >= 3`, `expenseCount >= 3`, and the profile fields
  `mobile`, `city`, `bio` are all filled in.
- Qualification immediately triggers `payoutReferral()`, which runs inside a
  Mongo transaction (the Atlas cluster is a replica set, so transactions are
  available): re-checks `status === "qualified" && !rewardGiven` (idempotency),
  checks anti-fraud caps, credits both users' `coins`, writes two
  `CoinTransaction` rows, and flips `status -> rewarded`.

## Existing users / lazy referral code backfill

**The problem.** Before this feature shipped, `User` documents had no
`referralCode`. Originally, `findOrCreateUser()` only generated a code at the
moment a new account was *inserted* (`isNew === true`). Accounts created
before the feature shipped never go through that insert path again, so their
`referralCode` stayed `undefined` forever - their profile page showed no code
and they couldn't refer anyone or earn coins.

**The fix - `ensureReferralCode(userId)`** (`backend/utils/referralService.js`).
A small, idempotent, race-safe helper that backfills a code for *any* user
that doesn't have one yet:

1. Re-reads the user; if they already have a `referralCode` (set by a
   concurrent request), returns it immediately - no wasted writes.
2. Generates a candidate unique code via `generateUniqueReferralCode()`.
3. Writes it with `findOneAndUpdate({ _id: userId, referralCode: { $in: [null, undefined] } }, { $set: { referralCode: code } })`.
   The `referralCode: null/undefined` filter means **only one** of several
   concurrent callers can win this write.
4. If another request won the race, the loop re-reads and returns the code
   that request set. If a generated code collides with another user's
   (duplicate-key error, vanishingly rare), it retries with a fresh code.

**Where it's called:**
- `findOrCreateUser()` - runs on *every* authenticated request (via
  `authMiddleware`) and on `POST /api/auth/google`. Whenever it loads a user
  with `!user.referralCode`, it calls `ensureReferralCode()`. This means an
  existing user gets their code backfilled the very next time they open the
  app or hit any API endpoint - no migration script needed.
- `getMyReferralData` (`GET /api/referrals/me`) - a defensive second check, in
  case a user record is ever loaded without going through
  `findOrCreateUser()` (e.g. data seeded by a script).

**End result.** Every user - old or new - has a `referralCode` after their
next interaction with the app, can immediately see it on their profile page,
share their referral link, and start earning coins exactly like a brand-new
user. No backend data migration is required; the backfill happens
transparently and incrementally as users return to the app.

## Edge cases handled

- **Bad/unknown ref code, returning user, no code** -> `attributeReferral`
  no-ops silently; signup proceeds normally.
- **Existing users with no `referralCode`** -> lazily, idempotently, and
  race-safely backfilled by `ensureReferralCode()`. See
  [Existing users](#existing-users--lazy-referral-code-backfill).
- **Write-once `referredBy`** -> enforced via an atomic
  `{ _id, referredBy: null }` filter on the `updateOne` in `attributeReferral`
  (a `modifiedCount === 0` result means another request already won the
  write). Not enforced via Mongoose `immutable`, which can silently strip
  fields from `updateOne($set: ...)` and would make this guard a no-op.
- **Self-referral** (same id or same email) -> rejected before any write.
- **Duplicate referral row** -> `referredUserId` has a unique index; any race
  is caught and logged, never breaks signup.
- **Idempotent payout / race conditions** -> `payoutReferral` re-checks
  `status`/`rewardGiven` *inside* the transaction before crediting anything.
- **Partial failure** -> both coin credits + ledger writes + the status flip
  happen in one `session.withTransaction()`; any error rolls back everything.
- **Coins never negative** -> schema-level `min: 0` plus rewards are always
  positive credits.
- **Referrer deletes account before payout** -> `creditCoins` returns `null`
  if the user doc is gone, so that side is silently skipped while the other
  side is still paid and the referral is marked `rewarded`.
- **Referred user deletes account before qualifying** -> `deleteAccount` calls
  `cancelPendingReferralFor()`, which flips any still-`pending` referral to
  `cancelled`.
- **Mass farming** -> `ANTI_FRAUD.MAX_REWARDED_REFERRALS_PER_DAY` (5) and
  `MAX_TOTAL_REWARDED_REFERRALS` (100) per referrer; once hit, further
  qualified referrals are `flagged` for review instead of paid out.
- **Reciprocal referral rings** -> structurally allowed, but bounded by the
  same milestone gating + caps.
- **`ref` param validation** -> `REFERRAL_CODE_INPUT_REGEX` (`^[A-Z0-9]{4,12}$`)
  is checked before any DB lookup.

## Attribution window / "last click wins"

The referral code is stored client-side (localStorage + cookie, 30-day
`max-age`). If a user clicks multiple referral links before signing up, the
**most recently clicked code overwrites the previously stored one** (last
click wins). If a user signs up more than 30 days after clicking, the cookie
expires and they sign up unattributed - this window is configurable in
`frontend/lib/referral.js` (`COOKIE_MAX_AGE`).

## Endpoints

- `GET /api/referrals/me` (auth required) - returns `referralCode`, `coins`,
  `totalEarned`, `successfulReferrals`, `invited[]` (each with `status` and,
  for `pending` rows, per-milestone progress), and `eliteClub` (current tier,
  next tier, coins-to-next, perks).
- Attribution itself piggybacks on the existing `POST /api/auth/google`
  (already rate-limited by `authLimiter`) via an extra optional
  `referralCode` body field.

## Assumptions / things to revisit

- "Meaningful actions" = expenses created by the referred user (any group).
  Adjust `MILESTONES.MIN_EXPENSES` or wire in additional action types in
  `backend/utils/referralService.js` if you want a different definition.
- "Profile completed" = `mobile`, `city`, and `bio` all non-empty on
  `UserProfile`. Configurable via `MILESTONES.PROFILE_COMPLETE_FIELDS`.
- Elite Club tiers (`ELITE_TIERS` in `referralConfig.js`) are **display-only**
  for now - the perks listed (themes, badges, priority support) are not yet
  enforced anywhere else in the app. The data model (`coins`) is in place so
  this can be wired up later (e.g. gating `/theme`).
- `backend/controllers/authController.js`'s `register`/`login` (email+password,
  no Firebase) endpoints are not called by the current frontend (it always
  goes through `/api/auth/google` after Firebase auth) and were left
  untouched - all referral logic lives in the Google/Firebase path and
  `authMiddleware`.
