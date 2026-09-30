// Turns due RecurringExpense rules (rent, WiFi...) into real expenses.
// Runs in-process on an interval; each rule is claimed with a conditional
// update first, so two server instances can never add the same month twice.
import mongoose from "mongoose";
import RecurringExpense from "../models/recurringExpenseModel.js";
import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import { buildSplits } from "../controllers/expenseController.js";
import { defaultSplitFor } from "./defaultSplit.js";
import { invalidateBalanceCache } from "../controllers/balanceController.js";
import { createNotification } from "../controllers/notificationController.js";

const RUN_HOUR = 6; // bills land at 06:00 server time on their day

// Next occurrence of `dayOfMonth` strictly after `from`.
export const nextRunDate = (dayOfMonth, from = new Date()) => {
  const candidate = new Date(from.getFullYear(), from.getMonth(), dayOfMonth, RUN_HOUR, 0, 0, 0);
  if (candidate > from) return candidate;
  return new Date(from.getFullYear(), from.getMonth() + 1, dayOfMonth, RUN_HOUR, 0, 0, 0);
};

// Bills covering everyone follow the group's own split; a bill for only some
// members is shared equally among them.
const splitFor = (group, participantIds, amount, payerId) => {
  if (participantIds.length === new Set(group.members.map(String)).size)
    return defaultSplitFor(group, participantIds, amount, payerId);
  return {
    splitType: "equal",
    splits: buildSplits({
      splitType: "equal",
      amount,
      participants: participantIds.map((id) => new mongoose.Types.ObjectId(id)),
      payerId,
    }),
  };
};

export const runDueRecurringExpenses = async (now = new Date()) => {
  const due = await RecurringExpense.find({ active: true, nextRunAt: { $lte: now } }).limit(200).lean();
  let created = 0;

  for (const rule of due) {
    // Claim: only the instance that moves nextRunAt forward generates the bill.
    const claimed = await RecurringExpense.findOneAndUpdate(
      { _id: rule._id, active: true, nextRunAt: rule.nextRunAt },
      { $set: { nextRunAt: nextRunDate(rule.dayOfMonth, now), lastRunAt: now } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      const group = await Group.findById(rule.groupId);
      if (!group) {
        await RecurringExpense.updateOne({ _id: rule._id }, { $set: { active: false } });
        continue;
      }
      const memberIds = [...new Set(group.members.map(String))];
      const payerId = String(rule.paidBy);
      if (!memberIds.includes(payerId)) {
        // Payer left the group - pause instead of guessing who pays now.
        await RecurringExpense.updateOne({ _id: rule._id }, { $set: { active: false } });
        continue;
      }
      let participantIds = (rule.participants || []).map(String).filter((id) => memberIds.includes(id));
      if (!participantIds.length) participantIds = memberIds;

      const { splitType, splits } = splitFor(group, participantIds, rule.amount, payerId);
      await Expense.create({
        groupId: group._id,
        description: rule.description,
        amount: rule.amount,
        paidBy: new mongoose.Types.ObjectId(payerId),
        splitType,
        category: rule.category || "bills",
        participants: participantIds.map((id) => new mongoose.Types.ObjectId(id)),
        splits,
        recurringId: rule._id,
        date: now,
      });
      invalidateBalanceCache(group._id);
      created++;

      await createNotification(
        memberIds,
        `Monthly bill "${rule.description}" (₹${rule.amount}) was added to "${group.name}"`,
        `/groups/${group._id}`,
        "expense",
        { groupName: group.name, groupId: group._id, amount: rule.amount, category: rule.category }
      ).catch(() => {});
    } catch (err) {
      console.error("recurring bill failed:", String(rule._id), err.message);
    }
  }
  return created;
};

let timer = null;
export const startRecurringRunner = (intervalMs = 15 * 60 * 1000) => {
  if (timer) return;
  const tick = () =>
    runDueRecurringExpenses().catch((err) => console.error("recurring runner:", err.message));
  setTimeout(tick, 30 * 1000); // shortly after boot, once the DB is connected
  timer = setInterval(tick, intervalMs);
  timer.unref?.();
};
