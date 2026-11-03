import Expense from "../../models/expenseModel.js";

const cents = (n) => Math.round(Number(n || 0) * 100);

// Read-only, deterministic spend analytics. No model involved: every number
// comes from the ledger, in integer minor units.
export async function computeInsights(groupId, group, memberNames = {}) {
  const rows = await Expense.find({ groupId, isSettlement: { $ne: true } })
    .select("description amount paidBy category date createdAt").lean();
  const spendRows = rows.filter(r => !/^settlement/i.test(r.description || ""));
  const totalMinor = spendRows.reduce((n, r) => n + cents(r.amount), 0);
  const byCategory = new Map();
  const paidBy = new Map();
  for (const r of spendRows) {
    const c = (r.category || "general").toLowerCase();
    byCategory.set(c, (byCategory.get(c) || 0) + cents(r.amount));
    const who = String(r.paidBy);
    paidBy.set(who, (paidBy.get(who) || 0) + cents(r.amount));
  }
  const biggest = spendRows.reduce((best, r) => (!best || cents(r.amount) > cents(best.amount) ? r : best), null);
  const budgetMinor = cents(group?.trip?.budget);
  return {
    expenseCount: spendRows.length,
    totalMinor,
    averageMinor: spendRows.length ? Math.round(totalMinor / spendRows.length) : 0,
    categories: [...byCategory].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, amountMinor]) => ({ name, amountMinor })),
    paidBy: [...paidBy].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, amountMinor]) => ({ id, name: memberNames[id] || "Member", amountMinor })),
    biggest: biggest ? { title: biggest.description, amountMinor: cents(biggest.amount) } : null,
    budget: budgetMinor > 0 ? { budgetMinor, usedPct: Math.round((totalMinor / budgetMinor) * 1000) / 10 } : null,
  };
}
