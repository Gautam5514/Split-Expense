import mongoose from "mongoose";
import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";

const to2 = (n) => Number(Number(n).toFixed(2));

const buildSettlement = (balancesObj) => {
  const entries = Object.entries(balancesObj).map(([userId, bal]) => ({ userId, bal: to2(bal) }));
  const creditors = entries.filter((e) => e.bal > 0).sort((a, b) => b.bal - a.bal);
  const debtors   = entries.filter((e) => e.bal < 0).sort((a, b) => a.bal - b.bal);

  const txns = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = to2(Math.min(creditor.bal, -debtor.bal));
    if (pay > 0.009) {
      txns.push({ from: debtor.userId, to: creditor.userId, amount: pay });
      debtor.bal  = to2(debtor.bal  + pay);
      creditor.bal = to2(creditor.bal - pay);
    }
    if (Math.abs(debtor.bal)  < 0.01) i++;
    if (Math.abs(creditor.bal) < 0.01) j++;
  }
  return txns;
};

export const getBalances = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get the CURRENT active members
    const group = await Group.findById(groupId).populate("members", "name email");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const activeMembers = group.members.map((m) => m._id.toString());
    const activeSet = new Set(activeMembers);

    // Init balances ONLY for active members
    const balances = {};
    for (const id of activeMembers) balances[id] = 0;

    const expenses = await Expense.find({ groupId }).lean();

    for (const exp of expenses) {
      const payerId = exp.paidBy?.toString?.();
      if (payerId && activeSet.has(payerId)) {
        balances[payerId] = (balances[payerId] || 0) + Number(exp.amount || 0);
      }

      // ✅ Safely iterate splits
      if (!Array.isArray(exp.splits)) continue;

      for (const s of exp.splits) {
        if (!s?.userId) continue;
        const uid = s.userId.toString();
        if (activeSet.has(uid)) {
          balances[uid] = (balances[uid] || 0) - Number(s.share || 0);
        }
      }
    }

    // readable
    const readable = group.members.map((m) => ({
      userId: m._id.toString(),
      name: m.name,
      email: m.email,
      balance: (balances[m._id.toString()] || 0).toFixed(2),
    }));

    const suggestions = buildSettlement(balances).map((t) => {
      const from = group.members.find((m) => m._id.toString() === t.from);
      const to = group.members.find((m) => m._id.toString() === t.to);
      return {
        from: { userId: t.from, name: from?.name, email: from?.email },
        to: { userId: t.to, name: to?.name, email: to?.email },
        amount: t.amount,
      };
    });

    res.json({ balances: readable, suggestions });
  } catch (err) {
    console.error("❌ getBalances:", err.message);
    res.status(500).json({ message: err.message });
  }
};
