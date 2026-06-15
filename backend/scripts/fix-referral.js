// One-off repair: attribute an already-signed-up friend to their referrer and
// pay out the coins, for signups where the attribution call was lost.
//
// Usage (from the backend/ folder):
//   node scripts/fix-referral.js <referrerEmailOrCode> <friendEmail>
// Example:
//   node scripts/fix-referral.js you@example.com friend@gmail.com

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import { attributeReferral, ensureReferralCode, checkAndQualifyMilestones } from "../utils/referralService.js";

const [, , referrerArg, friendEmail] = process.argv;

if (!referrerArg || !friendEmail) {
  console.error("Usage: node scripts/fix-referral.js <referrerEmailOrCode> <friendEmail>");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const referrer = referrerArg.includes("@")
    ? await User.findOne({ email: referrerArg.toLowerCase().trim() })
    : await User.findOne({ referralCode: referrerArg.toUpperCase().trim() });
  if (!referrer) throw new Error(`Referrer not found: ${referrerArg}`);

  const friend = await User.findOne({ email: friendEmail.toLowerCase().trim() });
  if (!friend) throw new Error(`Friend not found: ${friendEmail}`);
  if (friend.referredBy) throw new Error(`${friendEmail} is already attributed to a referrer - nothing to do.`);

  const code = referrer.referralCode || (await ensureReferralCode(referrer._id));
  console.log(`Attributing ${friend.email} -> referrer ${referrer.email} (code ${code})`);

  await attributeReferral(friend, code);
  // attributeReferral already triggers instant payout; this is a safety sweep.
  await checkAndQualifyMilestones(friend._id);

  const [refAfter, friendAfter] = await Promise.all([
    User.findById(referrer._id).select("email coins").lean(),
    User.findById(friend._id).select("email coins referredBy").lean(),
  ]);
  console.log(`✅ Done. ${refAfter.email}: ${refAfter.coins} coins | ${friendAfter.email}: ${friendAfter.coins} coins (referredBy set: ${!!friendAfter.referredBy})`);
} catch (err) {
  console.error("❌", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
