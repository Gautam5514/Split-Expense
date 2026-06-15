import mongoose from "mongoose";

const coinTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true }, // positive = credit, negative = debit
  balanceAfter: { type: Number, required: true },
  reason: {
    type: String,
    enum: ["referral_referrer_reward", "referral_referred_reward", "store_purchase"],
    required: true,
  },
  // Referral document this transaction originated from.
  refId: { type: mongoose.Schema.Types.ObjectId, ref: "Referral", default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("CoinTransaction", coinTransactionSchema);
