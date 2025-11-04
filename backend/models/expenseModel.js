import mongoose from "mongoose";

const splitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    share: { type: Number, required: true, min: 0 }, // the amount this user owes for this expense
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // How the expense was split
    splitType: { type: String, enum: ["equal", "exact", "percent"], default: "equal" },
    // Optional category/type (e.g., food, travel, stay…)
    category: { type: String, default: "general", trim: true },
    // Optional subset of participants (if not all members)
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    splits: { type: [splitSchema], default: [] }, // computed or provided
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
