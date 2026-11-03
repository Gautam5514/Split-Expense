import Expense from "../../models/expenseModel.js";
import { BudgetMonitor, BudgetNotice } from "./models.js";
import { memberGroup } from "./context.js";

export function crossedThresholds(spentMinor, budgetMinor, thresholds) {
  if (!Number.isSafeInteger(spentMinor) || !Number.isSafeInteger(budgetMinor) || budgetMinor <= 0) return [];
  return thresholds.filter(t => spentMinor * 100 >= budgetMinor * t);
}
// Deliberately on demand. No timer, worker, mail, push or payment side effect.
export async function checkBudgets(actorId) {
  const rules = await BudgetMonitor.find({ ownerId: actorId, enabled: true }).limit(50);
  for (const rule of rules) {
    try {
      const group = await memberGroup(actorId, rule.groupId);
      const rows = await Expense.find({ groupId: rule.groupId, isSettlement: { $ne: true } }).select("amount description").lean();
      const spent = rows.filter(r => !/^settlement/i.test(r.description || "")).reduce((sum,r) => sum + Math.round(r.amount * 100), 0);
      const budget = Math.round((group.trip?.budget || 0) * 100);
      // A second enabled/membership check prevents a disabled rule from being
      // consumed by a later request; notices are always access-filtered on read.
      if (!(await BudgetMonitor.exists({ _id: rule._id, enabled: true }))) continue;
      await memberGroup(actorId, rule.groupId);
      for (const threshold of crossedThresholds(spent, budget, rule.thresholds)) {
        const eventKey = `${rule._id}:${budget}:${threshold}`;
        try {
          await BudgetNotice.updateOne({ eventKey }, { $setOnInsert: { ownerId: actorId, groupId: rule.groupId, eventKey, message: `${group.name} has used at least ${threshold}% of its ${group.settings?.currency || "INR"} ${(budget / 100).toFixed(2)} budget.` } }, { upsert: true });
        } catch (err) { if (err.code !== 11000) throw err; }
      }
      await BudgetMonitor.updateOne({ _id: rule._id }, { $set: { lastCheckedAt: new Date(), lastError: null } });
    } catch (err) {
      await BudgetMonitor.updateOne({ _id: rule._id }, { $set: { lastCheckedAt: new Date(), lastError: err.code === "GROUP_UNAVAILABLE" ? "Access revoked; monitoring disabled." : "Check failed. Try again.", ...(err.code === "GROUP_UNAVAILABLE" ? { enabled: false } : {}) } });
    }
  }
}
