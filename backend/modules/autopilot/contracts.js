import { z } from "zod";
import { createHash } from "node:crypto";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const minor = z.number().int().positive().max(999999900);
// A reply to a question Autopilot asked: either a chosen contact or a typed email.
const answer = z.object({
  ref: z.string().trim().min(1).max(100),
  userId: objectId.optional(),
  email: z.string().trim().email().max(200).optional(),
}).strict().refine(a => Boolean(a.userId) !== Boolean(a.email), "Give either a contact or an email.");
export const runInput = z.object({
  message: z.string().trim().min(3).max(4000),
  groupId: objectId.nullable().optional(),
  requestKey: z.string().uuid(),
  // Conversation: continue an earlier run that was waiting for details or approval.
  parentRunId: objectId.nullable().optional(),
  answers: z.array(answer).max(10).optional(),
  // Chip answers keep the parent's parsed request instead of re-asking the model.
  reuse: z.boolean().optional(),
}).strict();

// Entity references are names/IDs, never authority. All are resolved server-side.
const expense = z.object({
  type: z.literal("create_expense"), title: z.string().trim().min(1).max(200),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  payer: z.string().min(1).max(100),
  participants: z.array(z.string().max(100)).max(100),
  excluded: z.array(z.string().max(100)).max(100),
  splitType: z.enum(["equal", "exact"]),
  shares: z.array(z.object({ member: z.string().max(100), amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/) }).strict()).max(100),
}).strict();
export const intentSchema = z.object({
  groupName: z.string().max(100).nullable(),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "AUD", "CAD", "NPR", "LKR", "MYR"]).nullable(),
  actions: z.array(z.discriminatedUnion("type", [expense,
    z.object({ type: z.literal("create_group"), name: z.string().min(2).max(100), members: z.array(z.string().max(100)).max(100) }).strict(),
    z.object({ type: z.literal("set_group_budget"), amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/) }).strict(),
    z.object({ type: z.literal("add_members"), members: z.array(z.string().trim().min(1).max(200)).min(1).max(20) }).strict(),
    z.object({ type: z.literal("read_summary") }).strict(),
    z.object({ type: z.literal("monitor_budget"), thresholds: z.array(z.number().int().min(1).max(100)).min(1).max(5) }).strict(),
  ])).max(12),
  clarification: z.string().max(500).nullable(),
}).strict();
const split = z.object({ memberId: objectId, name: z.string(), shareMinor: z.number().int().nonnegative() }).strict();
export const stepSchema = z.object({
  id: z.string(), type: z.enum(["create_group", "add_members", "set_group_budget", "create_expense", "read_summary", "monitor_budget"]),
  title: z.string(), dependsOn: z.array(z.string()), requiresApproval: z.boolean(),
  payload: z.object({
    groupId: objectId.nullable(), name: z.string().optional(), currency: z.string(),
    amountMinor: minor.optional(), payerId: objectId.optional(),
    splits: z.array(split).optional(), thresholds: z.array(z.number().int()).optional(),
    // add: joins immediately (known contact) · invite: they accept first · email: join link by email
    people: z.array(z.object({ status: z.enum(["add", "invite", "email"]), userId: objectId.optional(), name: z.string().max(120).optional(), email: z.string().max(200).optional() }).strict()).max(20).optional(),
  }).strict(),
}).strict();
// Structured questions the chat UI renders as buttons / an email box.
export const questionSchema = z.object({
  id: z.string().max(120), kind: z.enum(["person", "email", "group"]), ref: z.string().max(100), text: z.string().max(300),
  options: z.array(z.object({ value: z.string().max(100), label: z.string().max(120), hint: z.string().max(200).optional() }).strict()).max(8),
}).strict();
export const planSchema = z.object({ version: z.literal(1), steps: z.array(stepSchema).max(12), clarifications: z.array(z.string()).max(20), questions: z.array(questionSchema).max(10).default([]), notes: z.array(z.string().max(400)).max(10).default([]) }).strict();
export const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]), planVersion: z.number().int().positive(),
  payloadHash: z.string().regex(/^[a-f\d]{64}$/), approvedStepIds: z.array(z.string()).max(12),
}).strict();
// A planning problem whose message is safe and useful to show the user.
export class PlanError extends Error { constructor(message) { super(message); this.status = 400; this.code = "PLAN_REJECTED"; } }
export function toMinor(value, { allowZero = false } = {}) {
  const s = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) throw new PlanError("Use a positive amount with at most two decimal places.");
  const [whole, fraction = ""] = s.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (allowZero && result === 0) return 0;
  return minor.parse(result);
}
export const keyOf = (ref) => String(ref).trim().toLowerCase();
export const hash = (data) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
export function checkDecision(run, decision) {
  if (run.status !== "waiting_approval" || run.planVersion !== decision.planVersion || run.payloadHash !== decision.payloadHash || hash(run.plan) !== run.payloadHash) {
    throw Object.assign(new Error("This plan is no longer awaiting approval. Refresh and review it again."), { status: 409, code: "STALE_PLAN" });
  }
  const required = run.plan.steps.filter(s => s.requiresApproval).map(s => s.id).sort();
  const selected = [...new Set(decision.approvedStepIds)].sort();
  if (decision.decision === "approve" && JSON.stringify(required) !== JSON.stringify(selected)) {
    throw Object.assign(new Error("Approve the complete displayed plan, or edit it to create a new plan."), { status: 400, code: "INCOMPLETE_APPROVAL" });
  }
}
