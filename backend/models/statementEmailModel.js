import mongoose from "mongoose";

// Durable outbox for group settlement statements.
//
// A StatementBatch is "send this statement to this group" (one per trigger).
// It freezes the report data it describes (`snapshot`) so a retry hours later
// still sends exactly what was true when it was queued.
// A StatementDelivery is one email to one member, retried on its own: one bad
// address or a Brevo hiccup never blocks or re-sends the rest of the group.
//
// Every state change is a conditional update ("claim"), so any number of
// server instances can run the worker without double-sending.

const batchSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    reason: { type: String, enum: ["completed", "settled", "manual"], required: true },
    // Ledger state this statement describes (see reportSignature()).
    signature: { type: String, required: true },
    // `${groupId}:${signature}` for automatic sends; unique, so the same
    // statement is never queued twice. Unset when a batch is superseded or
    // fails outright, so that state can be sent again later.
    dedupeKey: { type: String, default: undefined },
    triggeredBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
    },
    // scheduled -> sending -> done | partial | failed
    // scheduled -> superseded (ledger changed during the wait) | cancelled (group deleted)
    status: {
      type: String,
      enum: ["scheduled", "sending", "done", "partial", "failed", "superseded", "cancelled"],
      default: "scheduled",
    },
    // Quiet window before sending, so a correction made right after the last
    // settlement replaces this statement instead of following it.
    sendAfter: { type: Date, required: true },
    lockedUntil: { type: Date, default: null },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
    },
    note: { type: String, default: "" },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

batchSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });
batchSchema.index({ status: 1, sendAfter: 1 });
batchSchema.index({ groupId: 1, createdAt: -1 });

const deliverySchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "StatementBatch", required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: String, required: true },
    name: { type: String, default: "" },
    // waiting (batch still in its quiet window) -> queued -> sending -> sent | failed
    // waiting/queued -> cancelled
    status: {
      type: String,
      enum: ["waiting", "queued", "sending", "sent", "failed", "cancelled"],
      default: "waiting",
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: "" },
    messageId: { type: String, default: "" },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

deliverySchema.index({ status: 1, nextAttemptAt: 1 });
deliverySchema.index({ status: 1, lockedUntil: 1 });
deliverySchema.index({ batchId: 1 });

export const StatementBatch = mongoose.model("StatementBatch", batchSchema);
export const StatementDelivery = mongoose.model("StatementDelivery", deliverySchema);
