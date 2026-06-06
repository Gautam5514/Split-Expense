// services/smartQueryHandler.js
// Handles common data queries directly from DB — no AI call needed.
// Responses are written in natural, conversational language so they feel AI-generated.

import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import User from "../models/userModel.js";

const to2 = (n) => Number(Number(n).toFixed(2));

// ─── Intent Patterns ──────────────────────────────────────────────────────────

const PATTERNS = {
  SPEND_THIS_MONTH:    /\b(spend|spent|expense|paid)\b.*(this month|current month)/i,
  SPEND_LAST_MONTH:    /\b(spend|spent|expense|paid)\b.*(last month|previous month)/i,
  SPEND_TOTAL:         /\b(total|overall|all time|lifetime)\b.*(spend|spent|expense|paid)/i,
  SPEND_BY_CATEGORY:   /\b(category|categories|breakdown|food|travel|stay|transport)\b/i,
  BALANCE_ALL:         /\b(balance|balances|owe|owed|settlement|settle up|net)\b/i,
  WHO_OWES_ME:         /\bwho\b.*(owe|owes)\b.*\bme\b/i,
  I_OWE_WHO:           /\b(i|i'm)\b.*(owe|owes)\b|\bwhat do i owe\b/i,
  RECENT_EXPENSES:     /\b(recent|latest|last \d+|last few)\b.*(expense|transaction|payment)/i,
  GROUP_SUMMARY:       /\b(group|trip)\b.*(summary|detail|total|breakdown|status)/i,
  MY_GROUPS:           /\b(my groups?|list group|show group|which group|all group)\b/i,
};

/**
 * Returns a matched intent key or null.
 */
export const detectIntent = (prompt) => {
  for (const [intent, regex] of Object.entries(PATTERNS)) {
    if (regex.test(prompt)) return intent;
  }
  return null;
};

// ─── DB Helpers ───────────────────────────────────────────────────────────────

const getUserGroups = (userId) =>
  Group.find({ members: userId }).populate("members", "name email").lean();

const getExpensesForGroups = (groupIds) =>
  Expense.find({ groupId: { $in: groupIds }, isSettlement: false })
    .populate("paidBy", "name")
    .lean();

const getDateRange = (type) => {
  const now = new Date();
  if (type === "this_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  if (type === "last_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    };
  }
  return null;
};

// Compute net balance of userId across all given expenses + groups
const computeBalances = (groups, expenses, userId) => {
  const groupMap = {};
  groups.forEach((g) => {
    groupMap[g._id.toString()] = g;
  });

  // per-group balance for this user
  const perGroup = {};
  groups.forEach((g) => {
    perGroup[g._id.toString()] = { name: g.name, balance: 0, members: g.members };
  });

  // global user name map
  const nameMap = {};
  groups.forEach((g) =>
    g.members.forEach((m) => {
      nameMap[m._id.toString()] = m.name;
    })
  );

  // per-person net (cross-group)
  const personNet = {};

  for (const exp of expenses) {
    const payerId = exp.paidBy?._id?.toString();
    const gId = exp.groupId.toString();

    for (const split of exp.splits) {
      const splitUserId = split.userId.toString();

      if (payerId === userId && splitUserId !== userId) {
        // others owe me
        personNet[splitUserId] = to2((personNet[splitUserId] || 0) + split.share);
        if (perGroup[gId]) perGroup[gId].balance = to2(perGroup[gId].balance + split.share);
      }
      if (splitUserId === userId && payerId !== userId) {
        // I owe payer
        personNet[payerId] = to2((personNet[payerId] || 0) - split.share);
        if (perGroup[gId]) perGroup[gId].balance = to2(perGroup[gId].balance - split.share);
      }
    }
  }

  return { personNet, perGroup, nameMap };
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

const handleSpendThisMonth = async (userId) => {
  const { start, end } = getDateRange("this_month");
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);

  const expenses = await Expense.find({
    groupId: { $in: groupIds },
    isSettlement: false,
    date: { $gte: start, $lte: end },
  })
    .populate("paidBy", "name")
    .lean();

  const totalGroupSpend = to2(expenses.reduce((s, e) => s + e.amount, 0));
  const myPaid = to2(
    expenses
      .filter((e) => e.paidBy?._id?.toString() === userId)
      .reduce((s, e) => s + e.amount, 0)
  );
  const myShare = to2(
    expenses
      .flatMap((e) => e.splits)
      .filter((s) => s.userId.toString() === userId)
      .reduce((s, sp) => s + sp.share, 0)
  );

  const monthName = start.toLocaleString("default", { month: "long", year: "numeric" });

  if (expenses.length === 0) {
    return `No expenses have been recorded for **${monthName}** yet across any of your groups. It looks like a quiet month so far! 😄`;
  }

  return `Here's your spending summary for **${monthName}**:

- **Total group spend** (all members): ₹${totalGroupSpend}
- **You paid** (on behalf of group): ₹${myPaid}
- **Your personal share** (what you actually owe): ₹${myShare}
- **Total transactions**: ${expenses.length}

${myPaid > myShare ? `You're currently **ahead by ₹${to2(myPaid - myShare)}** — others owe you money from this month's expenses.` : myShare > myPaid ? `You still need to settle **₹${to2(myShare - myPaid)}** for this month.` : `You're perfectly balanced for ${monthName}! ✅`}`;
};

const handleSpendLastMonth = async (userId) => {
  const { start, end } = getDateRange("last_month");
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);

  const expenses = await Expense.find({
    groupId: { $in: groupIds },
    isSettlement: false,
    date: { $gte: start, $lte: end },
  })
    .populate("paidBy", "name")
    .lean();

  const totalGroupSpend = to2(expenses.reduce((s, e) => s + e.amount, 0));
  const myPaid = to2(
    expenses
      .filter((e) => e.paidBy?._id?.toString() === userId)
      .reduce((s, e) => s + e.amount, 0)
  );
  const myShare = to2(
    expenses
      .flatMap((e) => e.splits)
      .filter((s) => s.userId.toString() === userId)
      .reduce((s, sp) => s + sp.share, 0)
  );

  const monthName = start.toLocaleString("default", { month: "long", year: "numeric" });

  if (expenses.length === 0) {
    return `It looks like there were **no recorded expenses** in **${monthName}**. Either everything was settled up, or it was a free month! 🎉`;
  }

  return `Here's a recap of your spending for **${monthName}**:

- **Total group spend**: ₹${totalGroupSpend}
- **You paid**: ₹${myPaid}
- **Your personal share**: ₹${myShare}
- **Total transactions**: ${expenses.length}

${myPaid > myShare ? `You overpaid by **₹${to2(myPaid - myShare)}** last month — that's money owed back to you.` : myShare > myPaid ? `You owed **₹${to2(myShare - myPaid)}** for last month's expenses.` : `Last month was perfectly balanced! ✅`}`;
};

const handleSpendTotal = async (userId) => {
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);
  const expenses = await getExpensesForGroups(groupIds);

  const totalGroupSpend = to2(expenses.reduce((s, e) => s + e.amount, 0));
  const myPaid = to2(
    expenses
      .filter((e) => e.paidBy?._id?.toString() === userId)
      .reduce((s, e) => s + e.amount, 0)
  );
  const myShare = to2(
    expenses
      .flatMap((e) => e.splits)
      .filter((s) => s.userId.toString() === userId)
      .reduce((s, sp) => s + sp.share, 0)
  );

  return `Here's your **all-time spending overview** across all ${groups.length} group(s):

- **Total group spend** (everyone combined): ₹${totalGroupSpend}
- **You paid** (total advances): ₹${myPaid}
- **Your personal share** (your actual cost): ₹${myShare}
- **Net position**: ${myPaid >= myShare ? `You're owed **₹${to2(myPaid - myShare)}** overall` : `You owe **₹${to2(myShare - myPaid)}** overall`}
- **Total transactions**: ${expenses.length} across ${groups.length} group(s)`;
};

const handleSpendByCategory = async (userId) => {
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);
  const expenses = await getExpensesForGroups(groupIds);

  // Only count expenses where user is a participant
  const myExpenses = expenses.filter(
    (e) =>
      e.paidBy?._id?.toString() === userId ||
      e.splits.some((s) => s.userId.toString() === userId)
  );

  const categoryTotals = {};
  for (const exp of myExpenses) {
    const cat = (exp.category || "general").toLowerCase();
    const myShareForThis =
      exp.splits.find((s) => s.userId.toString() === userId)?.share || 0;
    categoryTotals[cat] = to2((categoryTotals[cat] || 0) + myShareForThis);
  }

  const grandTotal = to2(Object.values(categoryTotals).reduce((s, v) => s + v, 0));

  if (grandTotal === 0) {
    return `I couldn't find any categorized expenses linked to you yet. Start adding expenses to see your category breakdown!`;
  }

  const lines = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : "0.0";
      return `- **${cat.charAt(0).toUpperCase() + cat.slice(1)}**: ₹${amt} (${pct}%)`;
    })
    .join("\n");

  return `Here's your **spending breakdown by category** (your personal share only):

${lines}

**Total personal spend**: ₹${grandTotal}

${Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    ? `Your biggest spend is on **${Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0]}** — consider tracking it more closely if you're budgeting!`
    : ""}`;
};

const handleBalanceAll = async (userId) => {
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);
  const expenses = await getExpensesForGroups(groupIds);

  const { personNet, perGroup, nameMap } = computeBalances(groups, expenses, userId);
  const user = await User.findById(userId).select("name").lean();

  const oweLines = Object.entries(personNet)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([uid, v]) => `- You owe **${nameMap[uid] || "someone"}** ₹${Math.abs(v)}`);

  const owedLines = Object.entries(personNet)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([uid, v]) => `- **${nameMap[uid] || "someone"}** owes you ₹${v}`);

  const totalOwed = to2(Object.values(personNet).filter((v) => v > 0).reduce((s, v) => s + v, 0));
  const totalOwe = to2(Math.abs(Object.values(personNet).filter((v) => v < 0).reduce((s, v) => s + v, 0)));
  const net = to2(totalOwed - totalOwe);

  if (owedLines.length === 0 && oweLines.length === 0) {
    return `Great news, **${user.name}**! 🎉 You're completely settled up across all your groups. No one owes you anything and you don't owe anyone either.`;
  }

  return `Here's your **complete balance summary**, ${user.name}:

${owedLines.length > 0 ? `### 💰 People who owe you\n${owedLines.join("\n")}\n` : ""}
${oweLines.length > 0 ? `### 🔴 You owe\n${oweLines.join("\n")}\n` : ""}
**Net position**: ${net >= 0 ? `You're up by **₹${net}** overall ✅` : `You're down by **₹${Math.abs(net)}** overall`}`;
};

const handleWhoOwesMe = async (userId) => {
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);
  const expenses = await getExpensesForGroups(groupIds);
  const { personNet, nameMap } = computeBalances(groups, expenses, userId);

  const owedLines = Object.entries(personNet)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (owedLines.length === 0) {
    return `Nobody owes you money right now across your groups. You're all settled up! ✅`;
  }

  const totalOwed = to2(owedLines.reduce((s, [, v]) => s + v, 0));
  const lines = owedLines
    .map(([uid, v]) => `- **${nameMap[uid] || "Unknown"}** owes you ₹${v}`)
    .join("\n");

  return `Here's who currently owes **you** money:

${lines}

**Total owed to you**: ₹${totalOwed}

You can remind them to settle up directly through the app!`;
};

const handleIOweWho = async (userId) => {
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);
  const expenses = await getExpensesForGroups(groupIds);
  const { personNet, nameMap } = computeBalances(groups, expenses, userId);

  const oweLines = Object.entries(personNet)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1]);

  if (oweLines.length === 0) {
    return `You don't owe anyone anything right now! You're fully settled across all your groups. 🎉`;
  }

  const totalOwe = to2(Math.abs(oweLines.reduce((s, [, v]) => s + v, 0)));
  const lines = oweLines
    .map(([uid, v]) => `- You owe **${nameMap[uid] || "Unknown"}** ₹${Math.abs(v)}`)
    .join("\n");

  return `Here's what you currently owe:

${lines}

**Total you owe**: ₹${totalOwe}

Consider settling these up soon to keep your group accounts clean!`;
};

const handleRecentExpenses = async (userId, prompt) => {
  const groups = await getUserGroups(userId);
  const groupIds = groups.map((g) => g._id);
  const groupNameMap = {};
  groups.forEach((g) => (groupNameMap[g._id.toString()] = g.name));

  // extract number from prompt, default 5
  const numMatch = prompt.match(/last (\d+)/i);
  const limit = numMatch ? Math.min(parseInt(numMatch[1]), 20) : 5;

  const expenses = await Expense.find({
    groupId: { $in: groupIds },
    isSettlement: false,
    $or: [
      { paidBy: userId },
      { "splits.userId": userId },
    ],
  })
    .populate("paidBy", "name")
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  if (expenses.length === 0) {
    return `No recent expenses found linked to you. Time to start adding some!`;
  }

  const lines = expenses
    .map((e, i) => {
      const myShare = e.splits.find((s) => s.userId.toString() === userId)?.share || 0;
      const iPaid = e.paidBy?._id?.toString() === userId;
      return `${i + 1}. **${e.description}** — ₹${e.amount} (${groupNameMap[e.groupId.toString()] || "Unknown group"})
   - Date: ${new Date(e.date).toLocaleDateString("en-IN")} | Category: ${e.category}
   - ${iPaid ? `You paid this` : `Paid by ${e.paidBy?.name}`} | Your share: ₹${to2(myShare)}`;
    })
    .join("\n\n");

  return `Here are your **${expenses.length} most recent expense(s)**:

${lines}`;
};

const handleMyGroups = async (userId) => {
  const groups = await getUserGroups(userId);

  if (groups.length === 0) {
    return `You're not part of any groups yet. Create or join a group to start splitting expenses!`;
  }

  const groupIds = groups.map((g) => g._id);
  const expenses = await getExpensesForGroups(groupIds);

  const lines = groups.map((g) => {
    const gExpenses = expenses.filter((e) => e.groupId.toString() === g._id.toString());
    const total = to2(gExpenses.reduce((s, e) => s + e.amount, 0));
    return `- **${g.name}** (${g.groupType}) — ${g.members.length} members, ₹${total} total spend${g.isCompleted ? " ✅ Settled" : " 🟢 Active"}`;
  });

  return `You're part of **${groups.length} group(s)**:

${lines.join("\n")}`;
};

const handleGroupSummary = async (userId, prompt) => {
  const groups = await getUserGroups(userId);

  // Try to match group name from the prompt
  const matchedGroup = groups.find((g) =>
    prompt.toLowerCase().includes(g.name.toLowerCase())
  ) || groups[groups.length - 1]; // fallback to latest group

  if (!matchedGroup) {
    return `I couldn't find a matching group. Here are your groups: ${groups.map((g) => g.name).join(", ")}. Try asking about one specifically!`;
  }

  const expenses = await Expense.find({ groupId: matchedGroup._id, isSettlement: false })
    .populate("paidBy", "name")
    .lean();

  const total = to2(expenses.reduce((s, e) => s + e.amount, 0));
  const myPaid = to2(expenses.filter((e) => e.paidBy?._id?.toString() === userId).reduce((s, e) => s + e.amount, 0));
  const myShare = to2(expenses.flatMap((e) => e.splits).filter((s) => s.userId.toString() === userId).reduce((s, sp) => s + sp.share, 0));

  // Category breakdown
  const catMap = {};
  expenses.forEach((e) => {
    const c = e.category || "general";
    catMap[c] = to2((catMap[c] || 0) + e.amount);
  });
  const catLines = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `  - ${c}: ₹${v}`)
    .join("\n");

  return `Here's the full summary for **${matchedGroup.name}**:

- **Status**: ${matchedGroup.isCompleted ? "Settled/Completed ✅" : "Active 🟢"}
- **Members**: ${matchedGroup.members.map((m) => m.name).join(", ")}
- **Total group spend**: ₹${total}
- **You paid**: ₹${myPaid}
- **Your personal share**: ₹${myShare}
- **Net**: ${myPaid >= myShare ? `You're owed ₹${to2(myPaid - myShare)} in this group` : `You owe ₹${to2(myShare - myPaid)} in this group`}
- **Transactions**: ${expenses.length}

**Spend by category:**
${catLines || "  - No categorized expenses yet"}`;
};

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export const handleSmartQuery = async (intent, userId, prompt) => {
  switch (intent) {
    case "SPEND_THIS_MONTH":   return handleSpendThisMonth(userId);
    case "SPEND_LAST_MONTH":   return handleSpendLastMonth(userId);
    case "SPEND_TOTAL":        return handleSpendTotal(userId);
    case "SPEND_BY_CATEGORY":  return handleSpendByCategory(userId);
    case "BALANCE_ALL":        return handleBalanceAll(userId);
    case "WHO_OWES_ME":        return handleWhoOwesMe(userId);
    case "I_OWE_WHO":          return handleIOweWho(userId);
    case "RECENT_EXPENSES":    return handleRecentExpenses(userId, prompt);
    case "MY_GROUPS":          return handleMyGroups(userId);
    case "GROUP_SUMMARY":      return handleGroupSummary(userId, prompt);
    default:                   return null;
  }
};
