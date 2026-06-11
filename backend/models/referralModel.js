import mongoose from "mongoose";

const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // One row per referred user - enforces a referred user can only ever be attributed once.
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

  status: {
    type: String,
    enum: ["pending", "qualified", "rewarded", "cancelled"],
    default: "pending",
    index: true,
  },

  rewardGiven: { type: Boolean, default: false },
  referrerRewardAmount: { type: Number, required: true },
  referredRewardAmount: { type: Number, required: true },

  // Set when anti-fraud caps block an otherwise-qualified payout, for manual review.
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  qualifiedAt: { type: Date, default: null },
  rewardedAt: { type: Date, default: null },
});

export default mongoose.model("Referral", referralSchema);
