import Group from "../../models/groupModel.js";
import Expense from "../../models/expenseModel.js";
import { hash } from "./contracts.js";
export const sameContext = (current, saved) => !saved || current.fingerprint === saved || current.legacy === saved;
export const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
export async function memberGroup(actorId, groupId, session = null) {
  const group = await Group.findOne({ _id: groupId, members: actorId }).session(session).lean();
  if (!group) throw fail(404, "GROUP_UNAVAILABLE", "Group unavailable or access has changed.");
  return group;
}
export async function snapshot(actorId, groupId, session = null) {
  const group = await memberGroup(actorId, groupId, session);
  const expenses = await Expense.find({ groupId }).select("_id updatedAt amount isSettlement description").sort({ _id: 1 }).session(session).lean();
  // Only what a plan depends on: who is in the group, its money rules and its ledger.
  // A photo change, invite-link reset or rename no longer invalidates a reviewed plan.
  const relevant = { members: (group.members || []).map(String).sort(), createdBy: String(group.createdBy), groupType: group.groupType || null, isCompleted: Boolean(group.isCompleted), currency: group.settings?.currency || "INR", receiptRequired: Boolean(group.settings?.receiptRequired), defaultSplit: group.settings?.defaultSplit || null, budget: group.trip?.budget ?? null };
  // `legacy` matches plans previewed before this change, so they stay approvable.
  return { group, expenses, fingerprint: hash({ v: 2, ...relevant, expenses }), legacy: hash({ group, expenses }) };
}
export async function authorizedRun(Run, actorId, runId) {
  const run = await Run.findOne({ _id: runId, actorId, expiresAt: { $gt: new Date() } });
  if (!run) throw fail(404, "RUN_UNAVAILABLE", "Run unavailable.");
  if (run.groupId) await memberGroup(actorId, run.groupId);
  return run;
}
