import mongoose from "mongoose";
import { PRIVATE_USER_FIELDS, stripPrivateUserFields } from "../utils/userPrivacy.js";

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, sparse: true, index: true }, // sparse: null values excluded from index
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // optional for Firebase users
  // Intended for explicitly provisioned service/test accounts only. Normal
  // users still complete the email OTP challenge before Firebase sign-in.
  skipLoginOtp: { type: Boolean, default: false },
  loginOtpBypassExpires: { type: Date, default: null },
  photoURL: { type: String, default: "" },
  expoPushTokens: [
    {
      token: { type: String, required: true },
      platform: { type: String, enum: ["ios", "android"], required: true },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  webPushTokens: [{ type: String }],
  hiddenDirectChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  hiddenGroupChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  loginOtp: { type: String, default: null },
  loginOtpExpires: { type: Date, default: null },
  loginOtpAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },

  // -------------------- Referral & coin reward system --------------------
  // Unique, human-shareable code generated once at account creation.
  referralCode: { type: String, unique: true, sparse: true, index: true },
  // Inviter's user id. Write-once: enforced in attributeReferral() via an
  // atomic `referredBy: null` filter on the update, not via schema immutability
  // (immutable interacts unpredictably with updateOne's $set stripping).
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Coin balance. Only ever mutated server-side via transactional payouts.
  coins: { type: Number, default: 0, min: 0 },
  // Running total of all coins ever credited. Never decreases (purchases only
  // touch `coins`), so Elite tier badges computed from this are permanent.
  lifetimeCoinsEarned: { type: Number, default: 0 },
  // Store items (premium themes, fonts) bought with coins. Owned forever.
  unlockedItems: [{ type: String }],
  // Milestone-tracking counters used to qualify referrals.
  activeDaysCount: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null }, // "YYYY-MM-DD" (UTC)
  expenseCount: { type: Number, default: 0 },

  // -------------------- Privacy --------------------
  privacy: {
    // "contacts": people I already share a group/chat with can add me
    // directly, everyone else sends an invite I accept. "invite": every
    // group add is an invite.
    addPolicy: { type: String, enum: ["contacts", "invite"], default: "contacts" },
    // Off = nobody can find me by typing my email; only invite links work.
    discoverableByEmail: { type: Boolean, default: true },
  },
  // People who can't add/invite me or find me by email.
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

// Credential material and device/internal state must never be serialized into
// an API response. Controllers call res.json(user) on full documents (e.g. the
// auth endpoints), so strip these at the schema level: this applies to every
// toJSON()/toObject() of a User document, and code that needs the raw values
// (bcrypt.compare, OTP checks) reads them straight off the document instead.
const stripPrivate = (_doc, ret) => stripPrivateUserFields(ret);
userSchema.set("toJSON", { transform: stripPrivate });
userSchema.set("toObject", { transform: stripPrivate });

export { PRIVATE_USER_FIELDS };
export default mongoose.model("User", userSchema);
