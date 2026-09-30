import mongoose from "mongoose";

// A monthly bill (rent, WiFi, maid...) that the runner in
// utils/recurringRunner.js turns into a normal Expense on `dayOfMonth`.
const recurringExpenseSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, default: "bills", trim: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Empty = every member at the time the bill is generated.
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dayOfMonth: { type: Number, required: true, min: 1, max: 28 },
    nextRunAt: { type: Date, required: true, index: true },
    lastRunAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("RecurringExpense", recurringExpenseSchema);
