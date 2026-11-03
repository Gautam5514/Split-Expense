import mongoose from "mongoose";
const { Schema } = mongoose;
const oid = Schema.Types.ObjectId;
const runSchema = new Schema({
  actorId: { type: oid, ref: "User", required: true },
  groupId: { type: oid, ref: "Group", default: null },
  requestKey: { type: String, required: true },
  message: { type: String, required: true, maxlength: 4000 },
  status: { type: String, enum: ["planning", "clarification_required", "waiting_approval", "running", "completed", "partial_success", "failed", "cancelled", "rejected"], default: "planning" },
  planVersion: { type: Number, default: 1 }, plan: Schema.Types.Mixed, payloadHash: String,
  snapshotHash: String,
  parentRunId: { type: oid, default: null },
  intent: Schema.Types.Mixed, // parsed request, reused when the user answers a question
  bindings: { type: Schema.Types.Mixed, default: {} }, // person reference -> chosen contact / email
  ai: Schema.Types.Mixed, // { provider, label, model, ms } - metadata only, never prompts or replies
  results: { type: [Schema.Types.Mixed], default: [] },
  approvals: { type: [Schema.Types.Mixed], default: [] },
  events: { type: [Schema.Types.Mixed], default: [] },
  error: String,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
}, { timestamps: true, optimisticConcurrency: true });
runSchema.index({ actorId: 1, requestKey: 1 }, { unique: true });
runSchema.index({ actorId: 1, createdAt: -1 });
runSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AgentRun = mongoose.model("AgentRun", runSchema);
const monitorSchema = new Schema({
  ownerId: { type: oid, ref: "User", required: true }, groupId: { type: oid, ref: "Group", required: true },
  thresholds: [Number], enabled: { type: Boolean, default: true },
  consentRunId: { type: oid, required: true }, timezone: { type: String, default: "Asia/Kolkata" },
  lastCheckedAt: Date, lastError: String,
}, { timestamps: true });
monitorSchema.index({ ownerId: 1, groupId: 1 }, { unique: true });
export const BudgetMonitor = mongoose.model("AgentBudgetMonitor", monitorSchema);
const noticeSchema = new Schema({
  ownerId: { type: oid, required: true }, groupId: { type: oid, required: true },
  eventKey: { type: String, required: true, unique: true }, message: String,
}, { timestamps: true });
export const BudgetNotice = mongoose.model("AgentBudgetNotice", noticeSchema);
