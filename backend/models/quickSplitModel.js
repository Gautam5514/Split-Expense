import mongoose from "mongoose";

// A Quick Split is a lightweight, one-off bill split that does NOT need a
// group. Use case: friends are out, someone pays the whole bill, and everyone
// else pays that one person back. Participants are just names (not app users),
// so it stays frictionless. The creator is the payee — their UPI ID / QR is
// shown so everyone can pay them directly. Each split is saved so the creator
// can look it up later ("who still owes me for that dinner?").

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // The amount this participant owes the creator (in the split's currency).
    share: { type: Number, required: true, min: 0 },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
  },
  { _id: true }
);

const quickSplitSchema = new mongoose.Schema(
  {
    // The payee: whoever created & paid the bill. Their profile UPI is the
    // one everyone pays into.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    totalAmount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: "INR", trim: true, maxlength: 8 },
    // "equal" = total split evenly; "custom" = each ate/owes a different amount.
    splitType: { type: String, enum: ["equal", "custom"], default: "equal" },
    participants: { type: [participantSchema], default: [] },
    note: { type: String, default: "", trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

// "My recent quick splits", newest first.
quickSplitSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model("QuickSplit", quickSplitSchema);
