import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, sparse: true, index: true }, // sparse: null values excluded from index
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // optional for Firebase users
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
  // Milestone-tracking counters used to qualify referrals.
  activeDaysCount: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null }, // "YYYY-MM-DD" (UTC)
  expenseCount: { type: Number, default: 0 },
});

export default mongoose.model("User", userSchema);
