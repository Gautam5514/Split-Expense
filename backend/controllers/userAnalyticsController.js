import mongoose from "mongoose";
import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";
import dayjs from "dayjs";

/**
 * GET /api/users/analytics
 * Returns spending summaries, trends, insights, and recent groups for the logged-in user.
 */
export const getUserAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 1️⃣ Find all expenses where user either paid or participated
    const expenses = await Expense.find({
      $or: [{ paidBy: userId }, { participants: userId }],
    }).lean();

    // 🧩 If no expenses, still send empty summary + groups
    const baseResponse = {
      monthlySummary: { month: dayjs().format("MMMM YYYY"), totalSpent: 0 },
      yearlySummary: { year: dayjs().year(), totalSpent: 0 },
      categoryBreakdown: [],
      trends: [],
      insight: {
        type: "neutral",
        message: "No expenses recorded yet. Add one to start tracking!",
      },
      recentGroups: [],
    };

    // 🟢 Fetch latest 5 active groups for dashboard shortcut
    const groups = await Group.find({ members: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("createdBy", "name email")
      .select("name createdAt updatedAt createdBy isCompleted")
      .lean();

    const recentGroups = groups.map((g) => ({
      id: g._id,
      name: g.name,
      createdBy: g.createdBy?.name || "Unknown",
      isCompleted: !!g.isCompleted,
      updatedAt: g.updatedAt,
    }));

    // If no expenses → return only groups
    if (!expenses.length) {
      return res.json({ ...baseResponse, recentGroups });
    }

    // 2️⃣ Category Breakdown (Pie Chart)
    const categoryTotals = {};
    for (const exp of expenses) {
      const cat = exp.category?.toLowerCase() || "misc";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
    }

    const categoryBreakdown = Object.entries(categoryTotals).map(
      ([category, amount]) => ({ category, amount })
    );

    // 3️⃣ Monthly Summary
    const thisMonth = dayjs().month();
    const monthlyExpenses = expenses.filter(
      (e) => dayjs(e.date).month() === thisMonth
    );
    const totalMonthSpend = monthlyExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const topCategory =
      Object.keys(categoryTotals).sort(
        (a, b) => categoryTotals[b] - categoryTotals[a]
      )[0] || "N/A";

    // 4️⃣ Yearly Summary
    const thisYear = dayjs().year();
    const yearlyExpenses = expenses.filter(
      (e) => dayjs(e.date).year() === thisYear
    );
    const totalYearSpend = yearlyExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    // 5️⃣ Trends (Bar chart)
    const monthlyTotals = {};
    for (const exp of yearlyExpenses) {
      const key = dayjs(exp.date).format("MMM");
      monthlyTotals[key] = (monthlyTotals[key] || 0) + exp.amount;
    }

    const orderedMonths = Array.from({ length: 12 }, (_, i) =>
      dayjs().month(i).format("MMM")
    );

    const trends = orderedMonths.map((m) => ({
      month: m,
      amount: monthlyTotals[m] || 0,
    }));

    // 6️⃣ Insights
    const lastMonth = (thisMonth - 1 + 12) % 12;
    const lastMonthExpenses = expenses.filter(
      (e) => dayjs(e.date).month() === lastMonth
    );
    const lastMonthSpend = lastMonthExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    let insight = {
      type: "neutral",
      message: "You're spending steadily.",
    };

    if (lastMonthSpend > 0 && totalMonthSpend > lastMonthSpend * 1.25) {
      const percent = Math.round(
        ((totalMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
      );
      insight = {
        type: "tight_month",
        message: `⚠️ You spent ${percent}% more this month compared to last month.`,
      };
    } else if (
      lastMonthSpend > 0 &&
      totalMonthSpend < lastMonthSpend * 0.75
    ) {
      insight = {
        type: "saving_month",
        message: "🎉 Nice work! You’ve reduced your spending this month.",
      };
    }

    // 7️⃣ Final Response
    res.json({
      monthlySummary: {
        month: dayjs().format("MMMM YYYY"),
        totalSpent: totalMonthSpend,
        topCategory,
        topCategorySpend: categoryTotals[topCategory] || 0,
      },
      yearlySummary: {
        year: thisYear,
        totalSpent: totalYearSpend,
      },
      categoryBreakdown,
      trends,
      insight,
      recentGroups,
    });
  } catch (err) {
    console.error("getUserAnalytics error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
