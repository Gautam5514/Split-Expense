// services/contextBuilder.js

import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import Notepad from "../models/notepadModel.js";
import User from "../models/userModel.js";

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
 * Now compiles individual itemized transactions, categories, notepad guidelines,
 * and cross-group configurations for maximum reasoning capability.
 *
 * @param {string} userId - The ID of the user asking the question.
 * @returns {Promise<string>} A structured markdown string of the user's detailed data context.
 */
export const buildUserContext = async (userId) => {
  const user = await User.findById(userId).select("name email").lean();
  
  // Fetch all groups the user is in, and populate the member details.
  const groups = await Group.find({ members: userId })
    .populate("members", "name email")
    .lean();

  const userGroupIds = groups.map(g => g._id);
  const notes = await Notepad.find({ groupId: { $in: userGroupIds } }).lean();

  // Create a fast lookup for user names
  const allUsersMap = {};
  groups.forEach(g => {
    g.members.forEach(m => {
      allUsersMap[m._id.toString()] = m.name;
    });
  });
  allUsersMap[userId] = user.name;

  let context = `# SplitEase Complete Financial Database Context

## User Profile
- Name: ${user.name}
- Email: ${user.email}
- User ID: ${userId}

## Active Groups & Members
${groups.map(g => `- **Group Name**: "${g.name}" (ID: ${g._id}, Type: ${g.groupType || "trip"})
  - Status: ${g.isCompleted ? "Completed/Settled" : "Active"}
  - Members: ${g.members.map(m => `${m.name} (${m.email})`).join(", ")}`).join("\n\n")}

## Itemized Expense Ledger
Here is the complete chronological log of all individual expenses registered in all your groups:
`;

  const allExpenses = [];

  for (const group of groups) {
    const expenses = await Expense.find({ groupId: group._id }).populate("paidBy", "name email").lean();
    
    // Calculate balances for this group
    const balances = {};
    group.members.forEach(m => {
      balances[m._id.toString()] = 0;
    });

    for (const exp of expenses) {
      // Map splits to user names for rich context
      const populatedSplits = exp.splits.map(s => ({
        name: allUsersMap[s.userId.toString()] || "Unknown User",
        share: to2(s.share)
      }));

      allExpenses.push({
        groupName: group.name,
        description: exp.description,
        amount: to2(exp.amount),
        paidByName: exp.paidBy?.name || "Unknown",
        paidByEmail: exp.paidBy?.email || "",
        category: exp.category || "general",
        date: exp.date,
        splits: populatedSplits,
        hasImage: !!exp.imageUrl,
        hasOcr: !!exp.ocrText
      });

      const payerId = exp.paidBy?._id?.toString();
      if (payerId && balances[payerId] !== undefined) {
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

    const groupTotalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const myPersonalPaid = expenses
      .filter(e => e.paidBy?._id?.toString() === userId)
      .reduce((sum, e) => sum + e.amount, 0);

    context += `
### Group Report: "${group.name}"
- **Total Group Spend**: ₹${to2(groupTotalSpend)}
- **Your Personal Paid Amount**: ₹${to2(myPersonalPaid)}
- **Final Net Balances**:
${group.members.map(m => {
  const bal = to2(balances[m._id.toString()]);
  return `  - ${m.name}: ${bal >= 0 ? 'is OWED' : 'OWES'} ₹${Math.abs(bal)}`;
}).join("\n")}
- **Smart Group Settlement Suggestions**:
${settlementPlan.length > 0 ? settlementPlan.map(s => `  - ${s}`).join("\n") : "  - Group is fully settled. No transactions needed!"}
`;
  }

  // Chronological sorting of all itemized expenses
  allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allExpenses.length > 0) {
    context += `\n### Detailed Transactions (Chronological Ledger)\n`;
    allExpenses.forEach((exp, idx) => {
      context += `${idx + 1}. **[${exp.groupName}]** "${exp.description}"
   - **Amount**: ₹${exp.amount}
   - **Category**: ${exp.category}
   - **Paid By**: ${exp.paidByName}
   - **Date**: ${new Date(exp.date).toLocaleDateString()}
   - **Splits Share**: ${exp.splits.map(s => `${s.name}: ₹${s.share}`).join(", ")}
   - **Receipt**: ${exp.hasImage ? "Receipt image attached" : "No image attached"}\n`;
    });
  } else {
    context += `\n*No individual expenses have been recorded yet in any group.*\n`;
  }

  // Add notepad details
  if (notes.length > 0) {
    context += `\n## Group Planning & Notes\n`;
    notes.forEach(n => {
      const gName = groups.find(g => g._id.equals(n.groupId))?.name || 'Unknown';
      context += `- **Note**: "${n.title}" (Group: "${gName}")\n  - Content: ${n.content || "Empty content"}\n`;
    });
  }

  context += "\n--- CONTEXT END ---";
  return context;
};