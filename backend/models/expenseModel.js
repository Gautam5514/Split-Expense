import mongoose from "mongoose";
import { SPLIT_TYPES } from "../utils/groupPresets.js";

const splitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    share: { type: Number, required: true, min: 0 }, // the amount this user owes for this expense
  },
  { _id: false }
);

const payerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0 },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    // Primary payer. With multiple payers this is the one who paid the most;
    // balances read `payers` whenever it is non-empty.
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payers: { type: [payerSchema], default: [] },
    // How the expense was split
    splitType: { type: String, enum: SPLIT_TYPES, default: "equal" },
    // Itemized bills: each item is shared equally by its userIds.
    items: { type: [itemSchema], default: [] },
    // Foreign-currency expenses: `amount` is always in the group currency,
    // the original is kept for display.
    currency: { type: String, default: null },
    originalAmount: { type: Number, default: null },
    fxRate: { type: Number, default: null },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringExpense", default: null },
    // Optional category/type (e.g., food, travel, stay…)
    category: { type: String, default: "general", trim: true },
    // Optional subset of participants (if not all members)
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    splits: { type: [splitSchema], default: [] }, // computed or provided
    date: { type: Date, default: Date.now },

    imageUrl: { type: String, default: null },
    ocrText: { type: String, default: null },
    isSettlement: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Group expense list (newest first) and per-user analytics lookups. Without
// these, "my expenses" scanned the whole collection on every home page load.
expenseSchema.index({ groupId: 1, date: -1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ participants: 1 });

export default mongoose.model("Expense", expenseSchema);
