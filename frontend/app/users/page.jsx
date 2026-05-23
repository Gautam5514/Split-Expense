"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  Loader2, Plus, ArrowRight, Wallet, Users, Sparkles, TrendingUp, Calendar, 
  CheckCircle, Trash2, ShieldCheck, Flame, PieChart as PieIcon, Coins, Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const COLORS = ["#8b5cf6", "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444"];

const CATEGORY_META = {
  food: { color: "#ec4899", label: "Food & Dining" },
  travel: { color: "#8b5cf6", label: "Travel & Trips" },
  housing: { color: "#6366f1", label: "Rent & Bills" },
  shopping: { color: "#14b8a6", label: "Shopping" },
  entertainment: { color: "#f59e0b", label: "Leisure" },
  misc: { color: "#ef4444", label: "Other" },
};

const getCategoryLabel = (cat) => {
  const norm = cat?.toLowerCase() || "misc";
  return CATEGORY_META[norm]?.label || cat.charAt(0).toUpperCase() + cat.slice(1);
};

const getCategoryColor = (cat, index) => {
  const norm = cat?.toLowerCase() || "misc";
  return CATEGORY_META[norm]?.color || COLORS[index % COLORS.length];
};

export default function UserDashboardPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [analytics, setAnalytics] = useState(null);
  const [groups, setGroups] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activePieIndex, setActivePieIndex] = useState(-1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, groupsRes, profileRes] = await Promise.all([
        api.get("/users/analytics").catch(() => ({ data: null })),
        api.get("/groups").catch(() => ({ data: [] })),
        api.get("/profile").catch(() => ({ data: null }))
      ]);
      setAnalytics(analyticsRes.data);
      setGroups(groupsRes.data || []);
      setProfile(profileRes.data || null);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return toast.error("Enter a group name");
    try {
      setCreating(true);
      const res = await api.post("/groups", { name: groupName.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Group created successfully! 🗺️");
      setGroupName("");
      fetchData();
      router.push(`/groups/${res.data._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error creating group");
    } finally {
      setCreating(false);
    }
  };

  const markCompleted = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.put(`/groups/${groupId}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Trip marked as completed! 🎉");
      fetchData();
    } catch (err) {
      toast.error("Failed to mark trip as completed");
    }
  };

  const deleteTrip = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      "Are you absolutely sure you want to delete this trip? All expenses, notes, and chat messages will be permanently lost."
    );
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Trip deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete trip");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-background">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground animate-pulse font-medium text-sm">Building your overview...</p>
      </div>
    );
  }

  const activeGroups = groups.filter((g) => !g.isCompleted);
  const totalSubscribersCount = groups.reduce((acc, g) => acc + (g.members?.length || 0), 0);

  // Prepare Pie Chart Data
  const pieData = analytics?.categoryBreakdown?.map((item, idx) => ({
    name: getCategoryLabel(item.category),
    value: item.amount,
    color: getCategoryColor(item.category, idx)
  })) || [];

  const totalCategorySpend = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* ── HEADER & QUICK CREATE ── */}
        <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-semibold ring-1 ring-violet-500/15 mb-3">
              <Sparkles size={12} className="animate-spin-slow" />
              Smart Finance Dashboard
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white leading-tight">
              Welcome back, <span className="bg-gradient-to-r from-violet-500 via-indigo-400 to-fuchsia-500 bg-clip-text text-transparent">{profile?.name || "User"}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl">
              Track your shared spending, active travels, and visual insights in one premium space.
            </p>
          </motion.div>

          <motion.form 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateGroup} 
            className="w-full lg:w-auto relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
            <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl backdrop-blur-2xl">
              <input
                type="text"
                placeholder="New group / trip name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-transparent border-none outline-none px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400/80 w-full sm:w-64 font-semibold text-sm"
              />
              <button
                type="submit"
                disabled={creating}
                className="ml-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Trip
              </button>
            </div>
          </motion.form>
        </div>

        {/* ── KEY METRIC SUMMARIES ── */}
        {analytics && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <SummaryCard 
              title="This Month" 
              value={`₹${analytics.monthlySummary?.totalSpent?.toLocaleString() || 0}`}
              subtitle={analytics.monthlySummary?.topCategory ? `Top Category: ${getCategoryLabel(analytics.monthlySummary.topCategory)}` : "No spending recorded this month."}
              icon={<Calendar className="w-5 h-5 text-violet-500" />}
              gradient="from-violet-500/10 via-transparent to-indigo-500/5"
            />
            <SummaryCard 
              title="This Year" 
              value={`₹${analytics.yearlySummary?.totalSpent?.toLocaleString() || 0}`}
              subtitle={`${analytics.yearlySummary?.year || new Date().getFullYear()} Total Travel Spend`}
              icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
              gradient="from-indigo-500/10 via-transparent to-pink-500/5"
            />
            <SummaryCard 
              title="Smart Insight" 
              value={analytics.insight?.type === 'tight_month' ? 'Tight Budget' : analytics.insight?.type === 'saving_month' ? 'Smart Saving' : 'Steady Spend'}
              subtitle={analytics.insight?.message || "All systems look robust. Your expense curve looks healthy."}
              icon={<Sparkles className="w-5 h-5 text-fuchsia-500" />}
              isInsight
              insightType={analytics.insight?.type}
              gradient="from-fuchsia-500/10 via-transparent to-violet-500/5"
            />
          </motion.div>
        )}

        {/* ── INTERACTIVE ANALYTICS VISUALS ── */}
        {analytics && (analytics.trends?.some(t => t.amount > 0) || totalCategorySpend > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Chart 1: Monthly Trends (Area Chart) */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Landmark size={18} className="text-violet-500" />
                    Spending Trajectory
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monthly breakdown of travel settlements this year</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Coins size={12} className="text-indigo-500" />
                  Trend Curve
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trends} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="month" stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Category Breakdown (Donut Chart) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieIcon size={18} className="text-indigo-500" />
                    Expense Allocations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Distribution of shares by top categories</p>
                </div>
              </div>

              {pieData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-48 sm:h-52 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={65}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          onMouseEnter={(_, index) => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(-1)}
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              stroke={activePieIndex === index ? entry.color : "transparent"}
                              strokeWidth={activePieIndex === index ? 6 : 0}
                              style={{ outline: "none", cursor: "pointer", filter: activePieIndex === index ? "drop-shadow(0 0 8px rgba(139,92,246,0.3))" : "none" }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spent</span>
                      <span className="text-xl font-extrabold text-slate-800 dark:text-white">
                        ₹{totalCategorySpend.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Sidebar Legend */}
                  <div className="space-y-2.5">
                    {pieData.map((item, idx) => {
                      const pct = ((item.value / totalCategorySpend) * 100).toFixed(0);
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-300 line-clamp-1">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-slate-800 dark:text-white font-bold">₹{item.value.toLocaleString()}</span>
                            <span className="text-slate-400 ml-1 font-medium">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400 font-medium">
                  No shares cataloged yet.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── ACTIVE GROUPS / ACTIVE TRAVELS ── */}
        <div className="w-full">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="w-full space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={22} className="text-violet-500" />
                  Active Trips & Groups
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Settle balances and split bills instantly inside these rooms</p>
              </div>
              
              <Link href="/dashboard" className="text-sm font-bold text-violet-500 hover:text-violet-400 flex items-center gap-1 transition-colors group/link cursor-pointer">
                View all rooms
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {activeGroups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeGroups.slice(0, 6).map((group, index) => {
                  const userId = token ? JSON.parse(atob(token.split(".")[1]))?.id : null;
                  const isCreator = group.createdBy === userId || group.createdBy?._id === userId;

                  return (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="block relative group/card h-full"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-3xl blur opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500/30 transition-all shadow-sm hover:shadow-xl flex flex-col justify-between gap-5 h-full">
                        
                        <Link href={`/groups/${group._id}`} className="block space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-1 group-hover/card:text-violet-500 transition-colors">
                              {group.name}
                            </h3>
                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shrink-0">
                              <Users className="w-4.5 h-4.5 text-violet-500" />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700/80">
                              {group.members?.length || 0} members
                            </span>
                            {isCreator ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/15 flex items-center gap-1">
                                <ShieldCheck size={11} /> Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/15">
                                Member
                              </span>
                            )}
                          </div>
                          
                          {group.members?.length > 0 && (
                            <div className="text-xs text-slate-400 font-medium line-clamp-1">
                              {group.members.map((m) => m.name || m.email).join(", ")}
                            </div>
                          )}
                        </Link>

                        {isCreator && (
                          <div className="pt-4 border-t border-slate-150 dark:border-slate-800/80 flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={(e) => markCompleted(e, group._id)}
                              className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-violet-500/10 hover:border-violet-500/20 transition-all cursor-pointer w-full hover:text-violet-500"
                            >
                              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              onClick={(e) => deleteTrip(e, group._id)}
                              className="flex items-center justify-center gap-2 px-4 py-2 border border-rose-500/10 text-rose-500 text-xs font-semibold rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer w-full"
                            >
                              <Trash2 size={14} className="shrink-0" />
                              Delete Room
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-4 shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Users className="w-7 h-7 text-violet-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">No active trip rooms yet</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Use the "Add Trip" button at the top to create a shared space for settlements!
                  </p>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}

/* ── PREMIUM WIDGET HELPER COMPONENTS ── */

function SummaryCard({ title, value, subtitle, icon, isInsight, insightType, gradient }) {
  let indicatorColor = "bg-violet-500";
  if (isInsight) {
    indicatorColor = 
      insightType === "tight_month" ? "bg-rose-500" :
      insightType === "saving_month" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" :
      "bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]";
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500/20 shadow-lg hover:shadow-xl transition-all duration-300 group/sum h-full">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 group-hover/sum:opacity-70 transition-opacity duration-300`} />
      
      <div className="relative p-6 sm:p-7 flex flex-col h-full gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isInsight ? "bg-fuchsia-500/10 border-fuchsia-500/15" : "bg-violet-500/10 border-violet-500/15"}`}>
              {icon}
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</span>
          </div>
          {/* Status Indicator */}
          <span className={`w-2 h-2 rounded-full ${indicatorColor}`} />
        </div>

        <div className="space-y-1">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none group-hover/sum:scale-[1.02] origin-left transition-transform duration-200">
            {value}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-400/90 leading-relaxed mt-1">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{payload[0].payload.month}</p>
        <p className="text-sm font-black text-slate-800 dark:text-white mt-1">
          ₹{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
}
