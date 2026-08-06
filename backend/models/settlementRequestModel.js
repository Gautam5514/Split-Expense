import mongoose from "mongoose";

// A settlement is a two-party claim: one side says "money moved", the other
// side has to confirm it before it's allowed to touch the group's balances.
// Nothing here ever writes to Expense on its own - only confirmSettlementRequest
// (expenseController.js) does that, and only after re-validating against the
// live balance at confirm time.
const settlementRequestSchema = new mongoose.Schema(
  {
    groupId:    { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // the payer (debtor)
    toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // the payee (creditor)
    amount:     { type: Number, required: true, min: 0.01 },
    method:     { type: String, enum: ["cash", "online"], default: "cash" },
    note:       { type: String, trim: true, maxlength: 200, default: "" },

    // Whoever clicked the button first; the OTHER party is the only one
    // allowed to confirm/reject - closes the "settle it myself" loophole.
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    // Set once confirmed - links to the actual balance-affecting Expense row.
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", default: null },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One in-flight request per (group, direction) at a time - prevents a
// double-submit race from creating duplicate pending claims for the same debt.
settlementRequestSchema.index(
  { groupId: 1, fromUserId: 1, toUserId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("SettlementRequest", settlementRequestSchema);
