"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Coins,
  BarChart3,
  PartyPopper,
} from "lucide-react";
import { motion } from "framer-motion";

export default function UserDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/users/analytics");
      setAnalytics(res.data);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-gray-400">
        <Loader2 className="animate-spin mr-2" /> Loading insights…
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-gray-400 py-12">
        No analytics data available.
      </div>
    );
  }

  const COLORS = [
    "#10B981",
    "#F59E0B",
    "#3B82F6",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
  ];

  // Dynamic styling for insight
  const insightType = analytics.insight?.type || "neutral";
  const insightIcon =
    insightType === "tight_month" ? (
      <AlertTriangle className="text-rose-400" size={22} />
    ) : insightType === "saving_month" ? (
      <PartyPopper className="text-emerald-400" size={22} />
    ) : (
      <Coins className="text-indigo-400" size={22} />
    );

  const insightGradient =
    insightType === "tight_month"
      ? "from-rose-600/20 via-rose-600/10 border-rose-500/30"
      : insightType === "saving_month"
      ? "from-emerald-600/20 via-emerald-600/10 border-emerald-500/30"
      : "from-indigo-600/20 via-indigo-600/10 border-indigo-500/30";

  const insightTitle =
    insightType === "tight_month"
      ? "Tight Month Alert ⚠️"
      : insightType === "saving_month"
      ? "Smart Saver 💰"
      : "Insight 💡";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white py-12 px-6 md:px-10 space-y-10"
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* 💬 Insight Banner */}
        {analytics.insight && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl bg-gradient-to-r ${insightGradient} border shadow-md flex items-start gap-3`}
          >
            {insightIcon}
            <div>
              <h3 className="font-semibold text-gray-100">{insightTitle}</h3>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                {analytics.insight.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* 💰 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SummaryCard
            title="Monthly Summary"
            subtitle={`Spent in ${analytics.monthlySummary.month}`}
            value={`₹${analytics.monthlySummary.totalSpent.toLocaleString()}`}
            highlight={`Top: ${analytics.monthlySummary.topCategory}`}
            icon={<Calendar size={18} className="text-emerald-400" />}
            color="emerald"
          />
          <SummaryCard
            title="Yearly Summary"
            subtitle={`Total spent in ${analytics.yearlySummary.year}`}
            value={`₹${analytics.yearlySummary.totalSpent.toLocaleString()}`}
            icon={<TrendingUp size={18} className="text-indigo-400" />}
            color="indigo"
          />
          <SummaryCard
            title="Smart Insight"
            subtitle={analytics.insight?.message || "You're spending steadily."}
            value="💡"
            icon={<Coins size={18} className="text-pink-400" />}
            color="pink"
          />
        </div>

        {/* 🥧 Category Breakdown */}
        <section className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4">
            Who Spends the Most (By Category)
          </h2>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.categoryBreakdown}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analytics.categoryBreakdown.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    color: "#f9fafb",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 📈 Spending Trends (Bar Chart) */}
        <section className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center gap-2">
            <BarChart3 size={18} /> Spending Trends
          </h2>

          {analytics.trends?.some((t) => t.amount > 0) ? (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.trends}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      color: "#f9fafb",
                    }}
                  />
                  <Bar dataKey="amount" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10 text-sm">
              Not enough data to visualize spending patterns yet.
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

/* ✅ Reusable Card Component */
function SummaryCard({ title, subtitle, value, highlight, icon, color }) {
  const colorMap = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    pink: "text-pink-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 180 }}
      className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
    >
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        {icon} <span>{title}</span>
      </div>
      <h2 className={`text-2xl font-bold ${colorMap[color]} truncate`}>
        {value}
      </h2>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      {highlight && (
        <p className="mt-1 text-xs text-gray-500 italic">{highlight}</p>
      )}
    </motion.div>
  );
}
