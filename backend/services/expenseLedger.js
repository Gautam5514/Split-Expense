import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";

// Canonical persistence boundary shared by the manual controller and Autopilot.
// Callers own validation/preview and side effects; this boundary rechecks identity,
// current membership, payer and receipt policy before persisting ledger data.
export async function createExpenseRecord(data, { actorId, session = null, group: validatedGroup = null }) {
  const group = validatedGroup || await Group.findOne({ _id: data.groupId, members: actorId }).session(session).lean();
  if (!group || !(group.members || []).some(m => String(m) === String(actorId))) throw new Error("You are not a member of this group.");
  if (String(data.paidBy) !== String(actorId)) throw new Error("You can only add expenses you paid yourself.");
  const members = new Set(group.members.map(String));
  if ((data.splits || []).some(s => !members.has(String(s.userId)))) throw new Error("Expense splits contain a non-member.");
  if (group.settings?.receiptRequired && !data.imageUrl) throw new Error("This group requires a receipt photo for every expense.");
  if (!session) return Expense.create(data);
  // Array form is necessary for Mongoose to propagate a transaction session.
  const [record] = await Expense.create([data], { session });
  return record;
}
