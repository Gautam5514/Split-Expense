"use client";

import { useEffect, useState, createElement, useCallback } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  Plus, ArrowRight, ChevronRight, Users, Calendar,
  PieChart as PieIcon, Coins, Landmark,
  ArrowUpRight, Heart, Receipt, Utensils, Plane, Home as HomeIcon,
  ShoppingBag, Ticket, Wallet, Clock3, Split, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import Loader3D from "@/components/Loader3D";
import CreateGroupModal from "@/components/CreateGroupModal";
import QuickSplitModal from "@/components/QuickSplitModal";
import { getGroupIcon } from "@/lib/groupIcons";

const COLORS = ["#0891B2", "#0E7490", "#22D3EE", "#14b8a6", "#f59e0b", "#0284C7"];

const CATEGORY_META = {
  food:          { color: "#ec4899", label: "Food & Dining" },
  travel:        { color: "#0891B2", label: "Travel & Trips" },
  housing:       { color: "#0E7490", label: "Rent & Bills" },
  shopping:      { color: "#14b8a6", label: "Shopping" },
  entertainment: { color: "#f59e0b", label: "Leisure" },
  misc:          { color: "#ef4444", label: "Other" },
};

const getCategoryLabel = (cat) => {
  const norm = cat?.toLowerCase() || "misc";
  return CATEGORY_META[norm]?.label || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "Other");
};

const getCategoryColor = (cat, index) => {
  const norm = cat?.toLowerCase() || "misc";
  return CATEGORY_META[norm]?.color || COLORS[index % COLORS.length];
};

// Icon per category for the Recent Activity list.
const CATEGORY_ICON = {
  food:          Utensils,
  travel:        Plane,
  housing:       HomeIcon,
  shopping:      ShoppingBag,
  entertainment: Ticket,
  misc:          Wallet,
};
const getCategoryIcon = (cat) => CATEGORY_ICON[cat?.toLowerCase()] || Receipt;

// "2h ago", "Yesterday", "3d ago", then a short date.
const timeAgo = (value) => {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function UserDashboardPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();

  const [analytics, setAnalytics]           = useState(null);
  const [groups, setGroups]                 = useState([]);
  const [profile, setProfile]               = useState(null);
  const [meId, setMeId]                     = useState(null);
  const [oweSummary, setOweSummary]         = useState({ totalOwed: 0, totalOwe: 0 });
  const [loading, setLoading]               = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickSplit, setShowQuickSplit] = useState(false);
  const [quickSplits, setQuickSplits] = useState([]);
  const [openQuickSplitId, setOpenQuickSplitId] = useState(null);
  const [activePieIndex, setActivePieIndex] = useState(-1);
  const [mounted, setMounted]               = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Everything in one parallel round - including the owe/owed totals,
      // which used to need a second wave of one request per group.
      const [analyticsRes, groupsRes, profileRes, meRes, summaryRes] = await Promise.all([
        api.get("/users/analytics").catch(() => ({ data: null })),
        api.get("/groups").catch(() => ({ data: [] })),
        api.get("/profile").catch(() => ({ data: null })),
        api.get("/users/me").catch(() => ({ data: null })),   // real MongoDB _id
        api.get("/balances/summary").catch(() => ({ data: null })),
      ]);
      setAnalytics(analyticsRes.data);
      setProfile(profileRes.data || null);

      // Recent quick splits (non-critical — never blocks the dashboard).
      api.get("/quick-splits", { params: { limit: 5 } })
        .then((r) => setQuickSplits(r.data?.items || []))
        .catch(() => {});

      const allGroups = groupsRes.data || [];
      setGroups(allGroups);

      // Use the MongoDB _id returned by /users/me - token decoding cannot give this
      const uid = meRes.data?._id || meRes.data?.id || null;
      setMeId(uid);

      if (summaryRes.data) {
        setOweSummary({ totalOwed: summaryRes.data.totalOwed || 0, totalOwe: summaryRes.data.totalOwe || 0 });
      } else {
        // Older backend without /balances/summary: add up per-group balances.
        const activeOnes = allGroups.filter((g) => !g.isCompleted);
        const balanceResults = await Promise.all(
          activeOnes.map((g) => api.get(`/balances/${g._id}`).catch(() => ({ data: null })))
        );
        let totalOwed = 0;
        let totalOwe  = 0;
        balanceResults.forEach((res) => {
          const userBal = res.data?.balances?.find((b) => String(b.userId) === String(uid));
          if (!userBal) return;
          const bal = Number(userBal.balance);
          if (bal > 0.01)       totalOwed += bal;
          else if (bal < -0.01) totalOwe  += Math.abs(bal);
        });
        setOweSummary({ totalOwed, totalOwe });
      }

    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for Firebase to finish restoring the session on a hard refresh -
    // fetching before it resolves means every request goes out unauthenticated.
    if (authLoading) return;
    if (!token) { setLoading(false); return; }
    fetchData();
  }, [token, authLoading, fetchData]);

  // The wizard handles type, setup and members; we only land in the group once
  // the user finishes it.
  const handleGroupCreated = (created) => {
    setShowCreateModal(false);
    fetchData();
    router.push(`/groups/${created._id}`);
  };

  const handleDeleteQuickSplit = async (id) => {
    // Optimistic removal — put it back if the request fails.
    const prev = quickSplits;
    setQuickSplits((list) => list.filter((q) => q.id !== id));
    try {
      await api.delete(`/quick-splits/${id}`);
      toast.success("Quick split deleted");
    } catch (e) {
      setQuickSplits(prev);
      toast.error(e?.response?.data?.message || "Couldn't delete");
    }
  };

  if (loading) {
    return <Loader3D message="Analyzing budget trajectory..." />;
  }

  const activeGroups = groups.filter((g) => !g.isCompleted);
  const { totalOwe, totalOwed } = oweSummary;

  const pieData = (analytics?.categoryBreakdown || []).map((item, idx) => ({
    name:  getCategoryLabel(item.category),
    value: item.amount,
    color: getCategoryColor(item.category, idx),
  }));
  const totalCategorySpend = pieData.reduce((s, i) => s + i.value, 0);

  const recentExpenses = analytics?.recentExpenses || [];

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-12">
      {/* Decorative blur orbs */}
      <div className="fixed top-16 -left-16 w-72 h-72 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none -z-0" />
      <div className="fixed top-40 -right-16 w-80 h-80 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-0" />

      {/* ── WELCOME HERO + FINANCIAL SNAPSHOT (full-bleed - flush with navbar + sidebar) ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative isolate overflow-hidden bg-[#f7fbff] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7 lg:px-8 dark:bg-[#081016]"
      >
        <Image
          src="/dashboard-journey-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center opacity-95 dark:opacity-25"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/78 to-white/5 dark:from-[#081016] dark:via-[#081016]/85 dark:to-[#081016]/25" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#f7fbff] via-[#f7fbff]/80 to-transparent dark:from-[#081016] dark:via-[#081016]/80" />

        <div className="relative mx-auto max-w-7xl pt-3 sm:pt-4">
          {/* Handwritten tagline doodle - sits in the open space clear of the flying-paper-plane artwork and the form */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="pointer-events-none absolute left-[66%] top-2 hidden -rotate-6 select-none flex-col leading-[0.85] text-cyan-700/60 2xl:flex dark:text-cyan-300/50"
          >
            <span className="absolute -inset-4 -z-10 rounded-full bg-white/50 blur-xl dark:bg-black/25" />
            <span className="font-handwritten text-2xl">Split bills,</span>
            <span className="font-handwritten flex items-center gap-1.5 text-2xl">
              not friendships <Heart size={15} className="fill-current" />
            </span>
          </motion.div>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <h1 className="flex items-center gap-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl dark:text-white">
                <motion.span
                  role="img"
                  aria-label="Waving hand"
                  animate={{ rotate: [0, 18, -8, 18, -4, 10, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
                  className="inline-block origin-[70%_70%]"
                >
                  👋
                </motion.span>
                <span
                  className="font-normal tracking-normal text-slate-900 dark:text-white text-[2.6rem] leading-none sm:text-5xl"
                  style={{ fontFamily: "var(--font-satisfy), cursive" }}
                >
                  {profile?.name?.split(" ")[0] || "there"}
                </span>
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Every rupee tracked. Every balance settled.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
              className="flex shrink-0 items-center gap-2.5"
            >
              <button
                type="button"
                onClick={() => { setOpenQuickSplitId(null); setShowQuickSplit(true); }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-cyan-600/25 bg-cyan-500/10 px-4 text-sm font-bold text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-500/15 dark:text-cyan-300"
              >
                <Split className="h-4 w-4" />
                Quick Split
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 px-5 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(8,145,178,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-12px_rgba(8,145,178,0.95)] active:translate-y-0"
              >
                <Plus className="h-4 w-4" />
                New group
              </button>
            </motion.div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Groups" value={groups.length} subtext={`${activeGroups.length} currently active`} icon={<Users className="h-5 w-5" />} iconBg="bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300" />
            <StatCard label="Spent This Month" value={analytics ? `₹${analytics.monthlySummary?.totalSpent?.toLocaleString("en-IN") || 0}` : "₹0"} subtext={analytics?.monthlySummary?.topCategory ? `Mostly ${getCategoryLabel(analytics.monthlySummary.topCategory)}` : "No spending this month"} icon={<Calendar className="h-5 w-5" />} iconBg="bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300" />
            <StatCard label="You Have to Pay" value={totalOwe > 0 ? `₹${Number(totalOwe).toLocaleString("en-IN")}` : "₹0"} subtext={totalOwe > 0 ? "Pending across your groups" : "You're fully settled"} icon={<ArrowUpRight className="h-5 w-5" />} iconBg="bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300" valueColor={totalOwe > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"} />
            <StatCard label="You're Owed" value={totalOwed > 0 ? `₹${Number(totalOwed).toLocaleString("en-IN")}` : "₹0"} subtext={totalOwed > 0 ? "Waiting to come back to you" : "No pending receivables"} icon={<Landmark className="h-5 w-5" />} iconBg="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" valueColor={totalOwed > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"} />
          </div>
        </div>
      </motion.section>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10 pt-6 px-3 sm:px-4 lg:px-8">

        {/* ── ACTIVE TRIPS & GROUPS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-teal-500/10 text-primary ring-1 ring-primary/15">
                <Users size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Active Groups
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activeGroups.length > 0
                    ? "Quick access to your recent groups"
                    : "Create a group to start splitting expenses"}
                </p>
              </div>
            </div>
            {activeGroups.length > 0 && (
              <Link
                href="/dashboard"
                className="group/vall flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:text-sm"
              >
                View all groups
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/vall:translate-x-0.5" />
              </Link>
            )}
          </div>

          {activeGroups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
              {activeGroups.slice(0, 8).map((group, index) => {
                const GroupIcon = getGroupIcon(group.icon);

                // Cycle through gradient palettes per card
                const gradients = [
                  ["#0891B2", "#14b8a6"],
                  ["#14b8a6", "#0284C7"],
                  ["#0E7490", "#22D3EE"],
                  ["#0284C7", "#0891B2"],
                  ["#0891B2", "#10b981"],
                  ["#7C3AED", "#0891B2"],
                ];
                const [g1, g2] = gradients[index % gradients.length];

                const memberAvatarColors = [
                  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
                  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
                  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
                ];

                const memberCount = group.members?.length || 0;

                return (
                  <motion.div
                    key={group._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                  >
                    <Link
                      href={`/groups/${group._id}`}
                      className="group/card flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-2.5 transition-colors duration-200 hover:border-primary/40"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                        style={group.photo?.url ? undefined : { background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                      >
                        {group.photo?.url ? (
                          <Image src={group.photo.url} alt="" width={40} height={40} className="h-full w-full rounded-xl object-cover" />
                        ) : GroupIcon ? (
                          createElement(GroupIcon, { className: "h-4.5 w-4.5 text-white", strokeWidth: 2.2 })
                        ) : (
                          <span className="select-none text-sm font-black tracking-tight text-white">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-foreground transition-colors group-hover/card:text-primary">
                          {group.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {memberCount} member{memberCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {memberCount > 0 && (
                        <div className="flex -space-x-1.5 shrink-0">
                          {group.members.slice(0, 2).map((m, i) => {
                            const photo = m.photoURL || m.profileImage?.url;
                            return photo ? (
                              <Image
                                key={m._id || i}
                                src={photo}
                                alt={m.name || m.email}
                                title={m.name || m.email}
                                width={22}
                                height={22}
                                className="h-[22px] w-[22px] rounded-full object-cover ring-2 ring-card"
                              />
                            ) : (
                              <div
                                key={m._id || i}
                                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[8px] font-bold ring-2 ring-card ${memberAvatarColors[i % memberAvatarColors.length]}`}
                                title={m.name || m.email}
                              >
                                {(m.name || m.email || "?").charAt(0).toUpperCase()}
                              </div>
                            );
                          })}
                          {memberCount > 2 && (
                            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ring-2 ring-card">
                              +{memberCount - 2}
                            </div>
                          )}
                        </div>
                      )}

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-[transform,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/card:scale-[1.3] group-hover/card:bg-primary group-hover/card:text-white group-hover/card:shadow-[0_6px_14px_-4px_rgba(8,145,178,0.6)]">
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/card:translate-x-0.5" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 sm:p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15 mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-base">No active trips yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Use the group name box above to create a group and start splitting expenses.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── CHARTS ── */}
        {mounted && analytics && (analytics.trends?.some((t) => t.amount > 0) || totalCategorySpend > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4"
          >
            {/* Spending Trajectory */}
            <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2 text-sm sm:text-base">
                    <Landmark size={16} className="text-cyan-600 dark:text-cyan-400" />
                    Spending Trajectory
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly breakdown of travel settlements this year</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Coins size={11} className="text-cyan-500" />
                  Trend Curve
                </div>
              </div>
              <div className="h-52 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trends} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0891B2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0E7490" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="month" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={40}
                      tickFormatter={(v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#0891B2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Allocations */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="font-bold text-foreground flex items-center gap-2 text-sm sm:text-base">
                  <PieIcon size={16} className="text-teal-600 dark:text-teal-400" />
                  Expense Allocations
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Distribution of shares by top categories</p>
              </div>
              {pieData.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="h-44 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData} innerRadius={52} outerRadius={68}
                          paddingAngle={3} dataKey="value"
                          onMouseEnter={(_, i) => setActivePieIndex(i)}
                          onMouseLeave={() => setActivePieIndex(-1)}
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={index} fill={entry.color}
                              strokeWidth={activePieIndex === index ? 4 : 0}
                              stroke={activePieIndex === index ? entry.color : "transparent"}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Spent</span>
                      <span className="text-sm font-extrabold text-foreground">
                        ₹{totalCategorySpend.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {pieData.map((item, idx) => {
                      const pct = ((item.value / totalCategorySpend) * 100).toFixed(0);
                      return (
                        <div key={idx} className="flex items-center justify-between text-[11px] font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground truncate max-w-[72px]">{item.name}</span>
                          </div>
                          <span className="text-foreground font-bold">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-sm text-muted-foreground font-medium">
                  No category data yet.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── RECENT ACTIVITY ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 ring-1 ring-amber-500/15 dark:text-amber-400">
                <Receipt size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Recent Activity
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {recentExpenses.length > 0
                    ? "Your latest expenses across every group"
                    : "Expenses you add will appear here"}
                </p>
              </div>
            </div>
          </div>

          {recentExpenses.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {recentExpenses.map((exp, index) => {
                const CatIcon = getCategoryIcon(exp.category);
                const accent = getCategoryColor(exp.category, index);
                const amountLabel = `${exp.currency ? exp.currency + " " : "₹"}${Number(exp.amount).toLocaleString("en-IN")}`;
                return (
                  <motion.button
                    key={exp.id}
                    type="button"
                    onClick={() => exp.groupId && router.push(`/groups/${exp.groupId}`)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="group/row flex w-full items-center gap-3 border-b border-border/70 px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 sm:px-4"
                  >
                    {/* Category icon tile with a soft category-colored wash */}
                    <span
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${accent}1a`, color: accent }}
                    >
                      <CatIcon size={19} strokeWidth={2.2} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-foreground">{exp.description}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                          <Users size={10} /> {exp.groupName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={10} /> {timeAgo(exp.date)}
                        </span>
                        <span className="truncate">
                          {exp.paidByMe ? "You paid" : `${exp.paidByName} paid`}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-sm font-extrabold tracking-tight text-foreground">{amountLabel}</span>
                      <span
                        className="mt-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: accent }}
                      >
                        {getCategoryLabel(exp.category)}
                      </span>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary" />
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/15 bg-amber-500/10">
                <Receipt className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-foreground">No expenses yet</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Open a group and add your first expense — it'll show up here instantly.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── RECENT QUICK SPLITS ── */}
        {quickSplits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-teal-500/10 text-cyan-600 ring-1 ring-cyan-500/15 dark:text-cyan-400">
                  <Split size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Quick Splits</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">One-off bills you split with friends</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setOpenQuickSplitId(null); setShowQuickSplit(true); }}
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 sm:text-sm"
              >
                New split
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {quickSplits.map((qs, index) => (
                <motion.div
                  key={qs.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * index }}
                  className="group/row flex w-full items-center gap-3 border-b border-border/70 px-3.5 py-3 transition-colors last:border-b-0 hover:bg-muted/50 sm:px-4"
                >
                  <button
                    type="button"
                    onClick={() => { setOpenQuickSplitId(qs.id); setShowQuickSplit(true); }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${qs.settled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"}`}>
                      <Split size={19} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-bold text-foreground">{qs.title}</span>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                          <Users size={10} /> {qs.participants.length} people
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={10} /> {timeAgo(qs.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold tracking-tight text-foreground">₹{Number(qs.totalAmount).toLocaleString("en-IN")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuickSplit(qs.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition hover:bg-rose-500/10 hover:text-rose-500"
                    aria-label={`Delete ${qs.title}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
      <CreateGroupModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleGroupCreated} />
      <QuickSplitModal
        isOpen={showQuickSplit}
        openId={openQuickSplitId}
        onClose={() => { setShowQuickSplit(false); setOpenQuickSplitId(null); }}
        onChanged={() => {
          api.get("/quick-splits", { params: { limit: 5 } })
            .then((r) => setQuickSplits(r.data?.items || []))
            .catch(() => {});
        }}
      />
    </div>
  );
}

/* ── STAT CARD (top 4 boxes) ── */
const StatCard = ({
  label,
  value,
  subtext,
  icon,
  iconBg,
  valueColor = "text-foreground",
  insightType,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.07] blur-2xl transition group-hover:bg-cyan-400/[0.12]" />
      <div className="relative flex items-center gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
          <h3 className={`mt-0.5 truncate text-xl font-extrabold tracking-[-0.035em] sm:text-2xl ${valueColor}`}>{value}</h3>
        </div>
      </div>
      {subtext && (
        <p className="relative mt-3 truncate border-t border-slate-900/[0.055] pt-2.5 text-[11px] font-medium text-muted-foreground dark:border-white/[0.07]">{subtext}</p>
      )}

      {/* Insight Indicator */}
      {insightType && (
        <div className="relative mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`
              h-full rounded-full
              ${
                insightType === "tight_month"
                  ? "w-3/4 bg-rose-500"
                  : insightType === "saving_month"
                  ? "w-1/3 bg-emerald-500"
                  : "w-1/2 bg-sky-500"
              }
            `}
          />
        </div>
      )}
    </div>
  );
};

/* ── CHART TOOLTIP ── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl bg-card border border-border shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        {payload[0].payload.month}
      </p>
      <p className="text-sm font-bold text-foreground mt-0.5">
        ₹{payload[0].value?.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
