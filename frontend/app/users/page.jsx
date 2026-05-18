"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Loader2, Plus, ArrowRight, Wallet, Users, Sparkles, TrendingUp, Calendar, PieChart as PieIcon, CheckCircle, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const COLORS = ["#8b5cf6", "#6366f1", "#a855f7", "#ec4899", "#3b82f6", "#14b8a6"];

export default function UserDashboardPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [analytics, setAnalytics] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, groupsRes] = await Promise.all([
        api.get("/users/analytics").catch(() => ({ data: null })),
        api.get("/groups").catch(() => ({ data: [] }))
      ]);
      setAnalytics(analyticsRes.data);
      setGroups(groupsRes.data || []);
    } catch (err) {
      toast.error("Failed to load data");
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
      toast.success("Group created!");
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
      toast.success("Trip marked as completed!");
      fetchData();
    } catch (err) {
      toast.error("Failed to mark as completed");
    }
  };

  const deleteTrip = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      "Delete this trip and all of its expenses, notes, and group messages?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Trip deleted");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete trip");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const activeGroups = groups.filter((g) => !g.isCompleted);

  return (
    <div className="min-h-screen bg-background pt-28 pb-12 px-5 md:px-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header & Quick Create */}
        <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
              Welcome to <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">Overview</span>
            </h1>
            <p className="text-foreground/60 text-lg">Manage your spending and active groups in one place.</p>
          </motion.div>

          <motion.form 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateGroup} 
            className="w-full lg:w-auto relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative flex items-center bg-card/60 backdrop-blur-xl border border-border rounded-lg p-1.5 shadow-xl">
              <input
                type="text"
                placeholder="New group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-transparent border-none outline-none px-4 py-2 text-foreground placeholder:text-foreground/40 w-full sm:w-64 font-medium"
              />
              <button
                type="submit"
                disabled={creating}
                className="ml-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-md disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </motion.form>
        </div>

        {/* Analytics Summaries */}
        {analytics && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <SummaryCard 
              title="This Month" 
              value={`₹${analytics.monthlySummary?.totalSpent?.toLocaleString() || 0}`}
              subtitle={analytics.monthlySummary?.topCategory ? `Top: ${analytics.monthlySummary.topCategory}` : "No spending yet"}
              icon={<Calendar className="w-5 h-5 text-violet-500" />}
            />
            <SummaryCard 
              title="This Year" 
              value={`₹${analytics.yearlySummary?.totalSpent?.toLocaleString() || 0}`}
              subtitle={`${analytics.yearlySummary?.year || new Date().getFullYear()} Total`}
              icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
            />
            <SummaryCard 
              title="Insight" 
              value={analytics.insight?.type === 'tight_month' ? 'Warning' : analytics.insight?.type === 'saving_month' ? 'Saving' : 'Steady'}
              subtitle={analytics.insight?.message || "Your expenses look good."}
              icon={<Sparkles className="w-5 h-5 text-fuchsia-500" />}
              isInsight
            />
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="w-full">
          
          {/* Active Groups Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="w-full space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Active Groups</h2>
              <Link href="/dashboard" className="text-sm font-semibold text-violet-500 hover:text-violet-400 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {activeGroups.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeGroups.slice(0, 6).map((group) => {
                  const userId = token ? JSON.parse(atob(token.split(".")[1]))?.id : null;
                  const isCreator = group.createdBy === userId || group.createdBy?._id === userId;

                  return (
                  <Link href={`/groups/${group._id}`} key={group._id} className="block relative group/card">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-2xl blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                    <div className="relative p-6 rounded-xl bg-card border border-border hover:border-violet-500/30 transition-all shadow-sm group-hover/card:shadow-md flex flex-col justify-between gap-4 h-full">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover/card:text-violet-500 transition-colors">{group.name}</h3>
                          <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shrink-0">
                            <Users className="w-4 h-4 text-violet-500" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground/50 mt-1">
                          <Wallet className="w-4 h-4" />
                          <span>{group.members?.length || 0} members</span>
                        </div>
                        
                        {group.members?.length > 0 && (
                          <div className="mt-3 text-xs text-foreground/50 line-clamp-1">
                            {group.members.slice(0, 3).map((m) => m.name || m.email).join(", ")}
                            {group.members.length > 3 ? "…" : ""}
                          </div>
                        )}
                      </div>

                      {isCreator && (
                        <div className="mt-2 pt-4 border-t border-border">
                          <div
                            onClick={(e) => markCompleted(e, group._id)}
                            className="flex items-center gap-2 cursor-pointer p-2 -m-2 rounded-lg hover:bg-violet-500/10 transition-colors w-full"
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              readOnly
                              className="w-4 h-4 accent-violet-500 cursor-pointer pointer-events-none"
                            />
                            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              <CheckCircle size={14} className="text-violet-500" />
                              Mark as Completed
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => deleteTrip(e, group._id)}
                            className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete Trip
                          </button>
                        </div>
                      )}
                    </div>
                  </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 rounded-3xl bg-card border border-border text-center flex flex-col items-center gap-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Users className="w-8 h-8 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">No active groups</h3>
                  <p className="text-foreground/60 mt-1">Create a group above to start splitting expenses.</p>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, isInsight }) {
  return (
    <div
      className={`relative p-6 rounded-xl border  ${
        isInsight 
          ? "bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-fuchsia-500/20" 
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2.5 rounded-full border ${isInsight ? "bg-fuchsia-500/10 border-fuchsia-500/20" : "bg-violet-500/10 border-violet-500/20"}`}>
          {icon}
        </div>
        <span className="text-sm font-bold text-foreground/60 uppercase tracking-wider">{title}</span>
      </div>
      <h3 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">{value}</h3>
      <p className="text-sm font-medium text-foreground/50 line-clamp-2">{subtitle}</p>
    </div>
  );
}
