import mongoose from "mongoose";
import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";
import { isValidObjectId } from "../middleware/validate.js";

export const to2 = (n) => Number(Number(n).toFixed(2));

// Map<groupId, { data, expiresAt }> - invalidated on any expense write
const balanceCache = new Map();
const CACHE_TTL_MS = 30_000;

export const invalidateBalanceCache = (groupId) => balanceCache.delete(String(groupId));

export const buildSettlement = (balancesObj) => {
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

// Single source of truth for "how much does each member currently owe/get
// owed" - shared by the HTTP endpoint below AND settlement-request
// validation, so the two can never drift apart on rounding/logic.
export const computeGroupBalances = async (groupId) => {
  const group = await Group.findById(groupId).populate("members", "name email");
  if (!group) return null;

  // Deduplicate members (guards against corrupt DB state)
  const seenIds = new Set();
  const uniqueMembers = group.members.filter((m) => {
    const id = m._id.toString();
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  const activeMembers = uniqueMembers.map((m) => m._id.toString());
  const activeSet = new Set(activeMembers);

  // Init balances ONLY for active members
  const balances = {};
  for (const id of activeMembers) balances[id] = 0;

  const expenses = await Expense.find({ groupId }).lean();

  for (const exp of expenses) {
    const payerId = exp.paidBy?.toString?.();
    if (payerId && activeSet.has(payerId)) {
      balances[payerId] = to2((balances[payerId] || 0) + Number(exp.amount || 0));
    }

    if (!Array.isArray(exp.splits)) continue;

    for (const s of exp.splits) {
      if (!s?.userId) continue;
      const uid = s.userId.toString();
      if (activeSet.has(uid)) {
        balances[uid] = to2((balances[uid] || 0) - Number(s.share || 0));
      }
    }
  }

  return { group, uniqueMembers, activeSet, balances };
};

export const getBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = req.user?.id || req.user?._id?.toString();
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId).select("members").lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isMember = (group.members || []).some((m) => String(m) === String(uid));
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const cached = balanceCache.get(groupId);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    const computed = await computeGroupBalances(groupId);
    if (!computed) return res.status(404).json({ message: "Group not found" });
    const { uniqueMembers, balances } = computed;

    // readable - use uniqueMembers so no user appears twice
    const readable = uniqueMembers.map((m) => ({
      userId: m._id.toString(),
      name: m.name,
      email: m.email,
      balance: (balances[m._id.toString()] || 0).toFixed(2),
    }));

    const suggestions = buildSettlement(balances).map((t) => {
      const from = uniqueMembers.find((m) => m._id.toString() === t.from);
      const to = uniqueMembers.find((m) => m._id.toString() === t.to);
      return {
        from: { userId: t.from, name: from?.name, email: from?.email },
        to: { userId: t.to, name: to?.name, email: to?.email },
        amount: t.amount,
      };
    });

    const result = { balances: readable, suggestions };
    balanceCache.set(groupId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json(result);
  } catch (err) {
    console.error("❌ getBalances:", err.message);
    res.status(500).json({ message: err.message });
  }
};
