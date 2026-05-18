// services/contextBuilder.js

import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import Notepad from "../models/notepadModel.js";
import User from "../models/userModel.js";

// Helper function to format numbers to 2 decimal places
const to2 = (n) => Number(Number(n).toFixed(2));

/**
 * Creates a settlement plan from a balances object.
 * This logic is crucial for answering "who owes whom".
 * @param {object} balancesObj - { userId: balance }
 * @returns {Array} - [{ from, to, amount }]
 */
const buildSettlement = (balancesObj) => {
  const entries = Object.entries(balancesObj).map(([userId, bal]) => ({ userId, bal: to2(bal) }));
  const creditors = entries.filter((e) => e.bal > 0).sort((a, b) => b.bal - a.bal);
  const debtors = entries.filter((e) => e.bal < 0).sort((a, b) => a.bal - b.bal);
  const txns = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = to2(Math.min(creditor.bal, -debtor.bal));
    if (pay > 0.01) {
      txns.push({ from: debtor.userId, to: creditor.userId, amount: pay });
      debtor.bal = to2(debtor.bal + pay);
      creditor.bal = to2(creditor.bal - pay);
    }
    if (Math.abs(debtor.bal) < 0.01) i++;
    if (Math.abs(creditor.bal) < 0.01) j++;
  }
  return txns;
};


/**
 * Fetches and compiles a deeply detailed context string about a user's data.
 * This is the core engine that powers the AI's financial intelligence.
 * @param {string} userId - The ID of the user asking the question.
 * @returns {Promise<string>} A formatted string containing the user's detailed data context.
 */
export const buildUserContext = async (userId) => {
  const user = await User.findById(userId).select("name email").lean();
  
  // Fetch all groups the user is in, and populate the member details.
  const groups = await Group.find({ members: userId })
    .populate("members", "name email")
    .lean();

  const userGroupIds = groups.map(g => g._id);
  
  // ✅ FIX: Corrected the variable name from 'userGroupids' to 'userGroupIds'
  const notes = await Notepad.find({ groupId: { $in: userGroupIds } }).lean();

  let context = `
--- CONTEXT START ---

This is the data context for the user:
- Your Name: ${user.name}
- Your ID / Email: ${user.email}

Here is a detailed breakdown of each group you are a part of:
`;

  // Process each group individually to create a detailed financial report.
  for (const group of groups) {
    const expenses = await Expense.find({ groupId: group._id }).lean();
    
    // Calculate balances for this group
    const balances = {};
    group.members.forEach(m => {
      balances[m._id.toString()] = 0;
    });

    for (const exp of expenses) {
      const payerId = exp.paidBy.toString();
      if (balances[payerId] !== undefined) {
        balances[payerId] += exp.amount;
      }
      for (const split of exp.splits) {
        const participantId = split.userId.toString();
        if (balances[participantId] !== undefined) {
          balances[participantId] -= split.share;
        }
      }
    }

    // Calculate settlement plan for this group
    const settlementTxns = buildSettlement(balances);
    const settlementPlan = settlementTxns.map(t => {
      const fromUser = group.members.find(m => m._id.toString() === t.from);
      const toUser = group.members.find(m => m._id.toString() === t.to);
      return `${fromUser.name} pays ${toUser.name} ₹${t.amount}`;
    });

    // Calculate the current user's personal spend in this group
    const myPersonalSpend = expenses
      .filter(e => e.paidBy.toString() === userId)
      .reduce((sum, e) => sum + e.amount, 0);

    // Append the detailed report for this group to the context
    context += `
---
[GROUP REPORT: "${group.name}"]
- Status: ${group.isCompleted ? "Completed" : "Active"}
- Members: ${group.members.map(m => `${m.name} (${m.email})`).join(", ")}
- Total Group Spend: ₹${to2(expenses.reduce((sum, e) => sum + e.amount, 0))}
- Your Personal Contribution (what you have paid): ₹${to2(myPersonalSpend)}
- Final Balances:
${group.members.map(m => `  - ${m.name}: ${to2(balances[m._id.toString()]) >= 0 ? 'is owed' : 'owes'} ₹${Math.abs(to2(balances[m._id.toString()]))}`).join("\n")}
- Settlement Plan (how to clear debts):
${settlementPlan.length > 0 ? settlementPlan.map(s => `  - ${s}`).join("\n") : "  - All debts are settled."}
---
`;
  }
  
  // Add notepad details
  if (notes.length > 0) {
    context += `\n[NOTEPAD DETAILS]\n` + notes.map(n =>
      `• Notepad Title: "${n.title}" for group "${groups.find(g => g._id.equals(n.groupId))?.name || 'Unknown'}"\n`
    ).join('');
  }


  context += "\n--- CONTEXT END ---";
  return context;
};