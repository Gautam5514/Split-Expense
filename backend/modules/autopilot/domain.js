// Server-only domain boundary. No model output can select collections or actors.
import Group from "../../models/groupModel.js";
import Expense from "../../models/expenseModel.js";
import { BudgetMonitor } from "./models.js";
import { memberGroup, fail } from "./context.js";
import { buildGroupSettingsUpdate, applyExpenseLock } from "../../utils/groupSettings.js";
import { buildSplits } from "../../utils/expenseSplits.js";
import { presetFor } from "../../utils/groupPresets.js";
import { hash } from "./contracts.js";
import { createExpenseRecord } from "../../services/expenseLedger.js";
import User from "../../models/userModel.js";
import GroupInvite from "../../models/groupInviteModel.js";
import { addMembersCore, deleteGroupCore } from "../../controllers/groupController.js";
import { createNotification } from "../../controllers/notificationController.js";
import { notifyGroupChange } from "../../utils/realtime.js";
import { incrementExpenseCount } from "../../utils/referralService.js";

// Socket.io server, set by the routes from the Express app (null in tests).
export const realtime = { io: null };

// `after` collects notifications/emails to send once the surrounding transaction commits.
export async function applyStep(step, run, session, after = []) {
  const p = step.payload;
  const actorId = String(run.actorId);
  let groupId = p.groupId || run.groupId;
  if (step.type === "create_group") {
    // Plans made before group types were chosen default to trip, as they always did.
    const type = p.groupType || "trip";
    const preset = presetFor(type);
    const [group] = await Group.create([{ name: p.name, createdBy: actorId, members: [actorId], groupType: type, icon: preset.icon, settings: { currency: p.currency, categories: preset.categories } }], { session });
    const actual = await Group.findById(group._id).session(session).lean();
    if (!actual || actual.name !== p.name || String(actual.createdBy) !== actorId || actual.members.length !== 1 || String(actual.members[0]) !== actorId) throw fail(409, "VERIFICATION_FAILED", "Group verification failed.");
    return { groupId: String(group._id), recordId: String(group._id), href: `/groups/${group._id}`, verified: true };
  }
  const group = await memberGroup(actorId, groupId, session);
  if (group.isCompleted && step.type !== "delete_group") throw fail(409, "GROUP_COMPLETED", "This group is marked as completed. Reopen it before making changes.");
  if ((group.settings?.currency || "INR") !== p.currency) throw fail(409, "STALE_PLAN", "The group currency changed; prepare a new plan.");
  // Lock the group during this transaction, serializing Autopilot changes and
  // conflicting membership/settings edits. Snapshot checks also cover expenses.
  await Group.updateOne({ _id: groupId, members: actorId }, { $inc: { __v: 1 } }, { session });
  if (step.type === "set_group_budget") {
    if (String(group.createdBy) !== actorId) throw fail(403, "FORBIDDEN", "Only the creator may set the budget.");
    const built = buildGroupSettingsUpdate({ trip: { budget: p.amountMinor / 100 } });
    if (built.error) throw fail(400, "INVALID_BUDGET", built.error);
    if (await Expense.exists({ groupId }).session(session)) {
      if (applyExpenseLock(built.update, group).locked.length) throw fail(409, "SETTINGS_LOCKED", "The budget is locked after the first expense.");
    }
    await Group.updateOne({ _id: groupId }, { $set: built.update }, { session });
    const actual = await Group.findById(groupId).session(session).lean();
    if (Math.round(actual.trip.budget * 100) !== p.amountMinor) throw fail(409, "VERIFICATION_FAILED", "Budget verification failed.");
    return { groupId: String(groupId), recordId: String(groupId), href: `/groups/${groupId}`, verified: true };
  }
  if (step.type === "create_expense") {
    if (p.payerId !== actorId || group.settings?.receiptRequired) throw fail(403, "EXPENSE_POLICY", "Payer or receipt requirements changed; use the manual expense screen.");
    const members = new Set(group.members.map(String));
    if (!p.splits?.length || p.splits.some(s => !members.has(s.memberId))) throw fail(409, "STALE_MEMBERS", "Expense participants have changed.");
    if (p.splits.reduce((n,s) => n+s.shareMinor, 0) !== p.amountMinor) throw fail(400, "INVALID_SPLITS", "Shares must exactly sum to the total.");
    const splits = buildSplits({ splitType: "exact", amount: p.amountMinor / 100, participants: p.splits.map(s => s.memberId), exactSplits: p.splits.map(s => ({ userId: s.memberId, share: s.shareMinor / 100 })) });
    // Shares are always stored exactly as previewed; the label records how they were chosen.
    const expense = await createExpenseRecord({ groupId, description: p.name, amount: p.amountMinor / 100, paidBy: actorId, splitType: p.splitType || "exact", category: p.category || "general", participants: p.splits.map(s => s.memberId), splits, date: new Date() }, { actorId, session, group });
    const actual = await Expense.findById(expense._id).session(session).lean();
    const rows = actual?.splits.map(s => ({ memberId: String(s.userId), shareMinor: Math.round(s.share * 100) }));
    const expected = p.splits.map(({ memberId, shareMinor }) => ({ memberId, shareMinor }));
    if (!actual || String(actual.groupId) !== String(groupId) || String(actual.paidBy) !== actorId || actual.description !== p.name || Math.round(actual.amount * 100) !== p.amountMinor || hash(rows) !== hash(expected)) throw fail(409, "VERIFICATION_FAILED", "Expense verification failed; the transaction was rolled back.");
    // Same side effects as the manual screen, sent only after the commit.
    const memberIds = group.members.map(String);
    const recipients = memberIds.filter(id => id !== actorId);
    after.push(async () => {
      const actor = await User.findById(actorId).select("name").lean();
      if (recipients.length) await createNotification(recipients, `${actor?.name || "A member"} added an expense "${p.name}" of ₹${p.amountMinor / 100} in "${group.name}"`, `/groups/${groupId}`, "expense", { groupName: group.name, groupId: String(groupId), amount: p.amountMinor / 100, category: p.category || "general" });
    });
    after.push(() => incrementExpenseCount(actorId));
    after.push(async () => {
      realtime.io?.to(`group:${groupId}`).emit("settlementUpdate", { groupId: String(groupId), kind: "expense" });
      await notifyGroupChange(realtime.io, groupId, "expense", memberIds);
    });
    return { groupId: String(groupId), recordId: String(expense._id), amountMinor: p.amountMinor, href: `/groups/${groupId}`, verified: true };
  }
  if (step.type === "add_members") {
    if (String(group.createdBy) !== actorId) throw fail(403, "FORBIDDEN", "Only the group creator can add members.");
    if (!p.people?.length) throw fail(400, "INVALID_PLAN", "No people to add.");
    const [actor, doc] = await Promise.all([User.findById(actorId).select("name").session(session).lean(), Group.findById(groupId).session(session)]);
    const out = await addMembersCore({
      group: doc, actor: { id: actorId, name: actor?.name || "A friend" },
      emails: p.people.filter(x => x.email).map(x => x.email), userIds: p.people.filter(x => x.userId).map(x => x.userId),
      session, after, io: realtime.io,
    });
    // Read back: everyone added directly is now a member, everyone invited has a pending invite.
    const actual = await Group.findById(groupId).select("members").session(session).lean();
    const members = new Set(actual.members.map(String));
    if (out.direct.some(u => !members.has(String(u._id)))) throw fail(409, "VERIFICATION_FAILED", "Member verification failed; the transaction was rolled back.");
    const pending = await GroupInvite.countDocuments({ groupId, userId: { $in: out.toInvite.map(u => u._id) }, status: "pending" }).session(session);
    if (pending !== out.toInvite.length) throw fail(409, "VERIFICATION_FAILED", "Invite verification failed; the transaction was rolled back.");
    // Blocked pairs are reported as invites so a block can't be detected.
    return { groupId: String(groupId), recordId: String(groupId), href: `/groups/${groupId}`, verified: true, added: out.direct.map(u => u.name), invited: out.toInvite.length + out.skipped, emailed: out.unregisteredEmails.length };
  }
  if (step.type === "delete_expense") {
    // Same rule as adding: only an expense you paid, never a settlement record.
    const doc = await Expense.findOne({ _id: p.expenseId, groupId, paidBy: actorId, isSettlement: { $ne: true } }).session(session).lean();
    if (!doc) throw fail(409, "EXPENSE_UNAVAILABLE", "That expense was already removed, or isn't one you added.");
    if (Math.round(doc.amount * 100) !== p.amountMinor || doc.description !== p.name) throw fail(409, "STALE_PLAN", "That expense changed after the preview. Ask again to see it as it is now.");
    await Expense.deleteOne({ _id: doc._id }, { session });
    if (await Expense.exists({ _id: doc._id }).session(session)) throw fail(409, "VERIFICATION_FAILED", "The expense could not be removed; nothing changed.");
    const memberIds = group.members.map(String);
    const recipients = memberIds.filter(id => id !== actorId);
    after.push(async () => {
      const actor = await User.findById(actorId).select("name").lean();
      if (recipients.length) await createNotification(recipients, `${actor?.name || "A member"} deleted the expense "${doc.description}" of ₹${doc.amount} in "${group.name}"`, `/groups/${groupId}`, "expense", { groupName: group.name, groupId: String(groupId), amount: doc.amount, category: doc.category || "general" });
    });
    after.push(async () => {
      realtime.io?.to(`group:${groupId}`).emit("settlementUpdate", { groupId: String(groupId), kind: "expense" });
      await notifyGroupChange(realtime.io, groupId, "expense", memberIds);
    });
    return { groupId: String(groupId), recordId: String(doc._id), href: `/groups/${groupId}`, verified: true, deleted: { title: doc.description, amountMinor: Math.round(doc.amount * 100) } };
  }
  if (step.type === "delete_group") {
    if (String(group.createdBy) !== actorId) throw fail(403, "FORBIDDEN", "Only the group creator can delete it.");
    const memberIds = group.members.map(String);
    await deleteGroupCore(groupId, { session });
    if (await Group.exists({ _id: groupId }).session(session)) throw fail(409, "VERIFICATION_FAILED", "The group could not be deleted; nothing changed.");
    after.push(() => notifyGroupChange(realtime.io, groupId, "deleted", memberIds));
    return { deletedGroup: true, recordId: String(groupId), href: "/dashboard", verified: true, deleted: { title: group.name } };
  }
  if (step.type === "monitor_budget") {
    if (!group.trip?.budget) throw fail(409, "NO_BUDGET", "Set a budget before monitoring.");
    const rule = await BudgetMonitor.findOneAndUpdate({ ownerId: actorId, groupId }, { $set: { thresholds: p.thresholds, enabled: true, consentRunId: run._id } }, { upsert: true, new: true, session });
    const actual = await BudgetMonitor.findById(rule._id).session(session).lean();
    if (!actual?.enabled || hash(actual.thresholds) !== hash(p.thresholds)) throw fail(409, "VERIFICATION_FAILED", "Monitoring consent could not be verified.");
    return { groupId: String(groupId), recordId: String(rule._id), verified: true };
  }
  throw fail(400, "UNKNOWN_TOOL", "This action is not supported.");
}
