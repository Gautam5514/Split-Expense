"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  Loader2, Plus, ArrowRight, Users, Calendar,
  CheckCircle, Trash2, ShieldCheck, PieChart as PieIcon, Coins, Landmark,
  ArrowUpRight
} from "lucide-react";
import { motion } from "framer-motion";
import Loader3D from "@/components/Loader3D";

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

export default function UserDashboardPage() {
  const router = useRouter();

  const [analytics, setAnalytics]           = useState(null);
  const [groups, setGroups]                 = useState([]);
  const [profile, setProfile]               = useState(null);
  const [meId, setMeId]                     = useState(null);
  const [oweSummary, setOweSummary]         = useState({ totalOwed: 0, totalOwe: 0 });
  const [loading, setLoading]               = useState(true);
  const [groupName, setGroupName]           = useState("");
  const [creating, setCreating]             = useState(false);
  const [activePieIndex, setActivePieIndex] = useState(-1);
  const [mounted, setMounted]               = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, groupsRes, profileRes, meRes] = await Promise.all([
        api.get("/users/analytics").catch(() => ({ data: null })),
        api.get("/groups").catch(() => ({ data: [] })),
        api.get("/profile").catch(() => ({ data: null })),
        api.get("/users/me").catch(() => ({ data: null })),   // real MongoDB _id
      ]);
      setAnalytics(analyticsRes.data);
      setProfile(profileRes.data || null);

      const allGroups = groupsRes.data || [];
      setGroups(allGroups);

      // Use the MongoDB _id returned by /users/me - token decoding cannot give this
      const uid = meRes.data?._id || meRes.data?.id || null;
      setMeId(uid);

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

    } catch {
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
      const res = await api.post("/groups", { name: groupName.trim() });
      toast.success("Group created! 🗺️");
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
      await api.put(`/groups/${groupId}/complete`, {});
      toast.success("Trip marked as completed! 🎉");
      fetchData();
    } catch {
      toast.error("Failed to mark as completed");
    }
  };

  const deleteTrip = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this trip? All expenses, notes, and messages will be permanently lost.")) return;
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success("Trip deleted");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete trip");
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

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-12 pt-4 sm:pt-6 px-3 sm:px-4 lg:px-8">
      {/* Decorative blur orbs */}
      <div className="fixed top-16 -left-16 w-72 h-72 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none -z-0" />
      <div className="fixed top-40 -right-16 w-80 h-80 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">

        {/* ── HEADER: greeting + create form ── */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
              Hi,{" "}
              <span className="brand-text font-extrabold">
                {profile?.name || "there"}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your shared expenses and active trip insights.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateGroup}
            className="w-full sm:w-auto relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
            <div className="relative flex items-center bg-card border border-border rounded-xl p-1.5 shadow-md gap-1">
              <input
                type="text"
                placeholder="New group / trip name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-transparent outline-none px-3 py-2 text-foreground placeholder:text-muted-foreground w-full text-sm"
              />
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-white font-semibold text-sm shadow disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
                style={{ background: "linear-gradient(135deg, #0891B2, #0E7490)" }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                 Add Group
              </button>
            </div>
          </motion.form>
        </div>

        {/* ── 4 STAT CARDS ── */}
        <motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05 }}
  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3"
>
  <StatCard
    label="Total Groups"
    value={groups.length}
    subtext="Active split groups"
    icon={<Users className="w-4 h-4" />}
    iconBg="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
  />

  <StatCard
    label="This Month"
    value={analytics ? `₹${analytics.monthlySummary?.totalSpent?.toLocaleString("en-IN") || 0}` : "₹0"}
    subtext={
      analytics?.monthlySummary?.topCategory
        ? `Top: ${getCategoryLabel(analytics.monthlySummary.topCategory)}`
        : "No spending this month"
    }
    icon={<Calendar className="w-4 h-4" />}
    iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
  />

  <StatCard
    label="You Have to Pay"
    value={totalOwe > 0 ? `₹${Number(totalOwe).toLocaleString("en-IN")}` : "₹0"}
    subtext={totalOwe > 0 ? "Pending across groups" : "Nothing to pay"}
    icon={<ArrowUpRight className="w-4 h-4" />}
    iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-300"
    valueColor={totalOwe > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}
  />

  <StatCard
    label="You're Owed"
    value={totalOwed > 0 ? `₹${Number(totalOwed).toLocaleString("en-IN")}` : "₹0"}
    subtext={totalOwed > 0 ? "Pending from others" : "Nothing owed to you"}
    icon={<Landmark className="w-4 h-4" />}
    iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    valueColor={totalOwed > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}
  />
</motion.div>


        {/* ── CHARTS ── */}
        {mounted && analytics && (analytics.trends?.some((t) => t.amount > 0) || totalCategorySpend > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
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
                  <AreaChart data={analytics.trends} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0891B2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0E7490" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="month" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
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

        {/* ── ACTIVE TRIPS & GROUPS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground text-base sm:text-lg flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Active Trips &amp; Groups
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeGroups.length > 0
                  ? `${activeGroups.length} active room${activeGroups.length !== 1 ? "s" : ""},  tap any to manage expenses`
                  : "Create a group to start splitting expenses"}
              </p>
            </div>
            {activeGroups.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard"
                  className="text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {activeGroups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGroups.slice(0, 6).map((group, index) => {
                const isCreator = meId && (String(group.createdBy) === String(meId) || String(group.createdBy?._id) === String(meId));
                const memberNames = group.members?.map((m) => m.name || m.email) || [];

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

                return (
                  <motion.div
                    key={group._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className="relative group/card"
                  >
                    <div className="relative bg-card border border-border hover:border-primary/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">

                      <Link href={`/groups/${group._id}`} className="block p-5 pr-12 space-y-4">

                        {/* Group avatar + name + role badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">

                            {/* Animated gradient letter avatar */}
                            <motion.div
                              animate={{
                                background: [
                                  `linear-gradient(135deg, ${g1}, ${g2})`,
                                  `linear-gradient(225deg, ${g2}, ${g1})`,
                                  `linear-gradient(135deg, ${g1}, ${g2})`,
                                ],
                              }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                              whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
                              className="w-11 h-11 rounded flex items-center justify-center shrink-0 shadow-sm"
                            >
                              <span className="text-white font-black text-lg tracking-tight select-none">
                                {group.name.charAt(0).toUpperCase()}
                              </span>
                            </motion.div>

                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground text-sm sm:text-base line-clamp-1 group-hover/card:text-primary transition-colors">
                                {group.name}
                              </h3>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {group.members?.length || 0} member{group.members?.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          {isCreator ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40">
                              <ShieldCheck size={9} /> Admin
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-full shrink-0 border border-primary/15">
                              Member
                            </span>
                          )}
                        </div>

                        {/* Stacked member avatars - photo if available, letter fallback */}
                        {group.members?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {group.members.slice(0, 4).map((m, i) => {
                                const photo = m.photoURL || m.profileImage?.url;
                                return photo ? (
                                  <Image
                                    key={m._id || i}
                                    src={photo}
                                    alt={m.name || m.email}
                                    title={m.name || m.email}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-full ring-2 ring-card object-cover"
                                  />
                                ) : (
                                  <div
                                    key={m._id || i}
                                    className={`w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center text-[9px] font-bold ${memberAvatarColors[i % memberAvatarColors.length]}`}
                                    title={m.name || m.email}
                                  >
                                    {(m.name || m.email || "?").charAt(0).toUpperCase()}
                                  </div>
                                );
                              })}
                              {group.members.length > 4 && (
                                <div className="w-6 h-6 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                  +{group.members.length - 4}
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 flex-1">
                              {memberNames.slice(0, 2).join(", ")}
                              {memberNames.length > 2 && ` +${memberNames.length - 2} more`}
                            </p>
                          </div>
                        )}

                      </Link>

                      {/* Absolutely centered right arrow - takes zero extra height */}
                      <Link
                        href={`/groups/${group._id}`}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <motion.div
                          whileHover={{ x: 3, scale: 1.3 }}
                          whileTap={{ scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 420, damping: 16 }}
                          className="w-8 h-8 mt-10 hover:bg-primary/1 rounded-full flex items-center justify-center text-primary/50 group-hover/card:text-primary transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.div>
                      </Link>

                      {/* Admin actions */}
                      {isCreator && (
                        <div className="px-5 pb-4 flex items-center gap-2 border-t border-border pt-3">
                          <button
                            type="button"
                            onClick={(e) => markCompleted(e, group._id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border text-foreground text-[11px] font-semibold rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-600 transition-all cursor-pointer"
                          >
                            <CheckCircle size={12} className="text-emerald-500" />
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={(e) => deleteTrip(e, group._id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-destructive/15 text-destructive text-[11px] font-semibold rounded-xl hover:bg-destructive/5 transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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
                Use the &quot;Add Trip&quot; button above to create a group and start splitting expenses.
              </p>
            </div>
          )}
        </motion.div>

      </div>
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
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="
        relative overflow-hidden rounded-xl border
        border-border/60 bg-card/80
        backdrop-blur-xl p-4 sm:p-5
         hover:shadow
        transition-all 
      "
    >
      {/* Soft Glow */}
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">
            {label}
          </p>

          <h3 className={`mt-1 text-lg sm:text-2xl font-bold tracking-tight ${valueColor}`}>
            {value}
          </h3>
        </div>

        <div
          className={`
            h-9 w-9 shrink-0 rounded-xl flex items-center justify-center
            ${iconBg}
          `}
        >
          {icon}
        </div>
      </div>

      {subtext && (
        <p className="relative mt-3 line-clamp-1 text-[11px] sm:text-xs text-muted-foreground">
          {subtext}
        </p>
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
    </motion.div>
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
