"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import MemberPicker from "@/components/MemberPicker";
import AddExpenseModal from "@/components/AddExpenseModal";
import InviteModal from "@/components/InviteModal";
import {
  ArrowLeftCircle,
  Loader2,
  Wallet2,
  PlusCircle,
  Users2,
  StarIcon,
  X,
  Receipt,
  CreditCard,
  Utensils,
  Bus,
  ShoppingBag,
  Gift,
  FileText,
  Home,
  Coffee,
  MessageCircleMore,
  Eye,
  Trash2,
  ChevronDown,
  CalendarDays,
  UserPlus,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  BookOpen,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";

const categoryIcons = {
  food: Utensils,
  travel: Bus,
  shopping: ShoppingBag,
  gift: Gift,
  bills: CreditCard,
  rent: Home,
  stay: Home,
  coffee: Coffee,
  misc: FileText,
  general: FileText,
};

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const groupId = useMemo(() => params?.id, [params]);

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedOcr, setSelectedOcr] = useState(null);
  const [expandedPayerId, setExpandedPayerId] = useState(null);
  const [activeTab, setActiveTab] = useState("feed"); // "feed" | "breakdown" | "notes"
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // Fetch Group Details
  const fetchGroup = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/groups/${groupId}`);
      setGroup(res.data);
    } catch {
      toast.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await api.get(`/expenses/${groupId}`);
      setExpenses(res.data);
    } catch {
      toast.error("Failed to fetch expenses");
    }
  };

  const fetchBalances = async () => {
    try {
      const res = await api.get(`/balances/${groupId}`);
      setBalances(res.data);
    } catch {
      toast.error("Failed to fetch balances");
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchExpenses();
      fetchBalances();
    }
  }, [groupId]);

  const handleAddMembers = async (emails) => {
    if (!emails?.length) return;
    try {
      setAdding(true);
      const res = await api.post(`/groups/${groupId}/members`, { emails });
      setGroup(res.data);
      toast.success(
        `Added ${emails.length} member${emails.length > 1 ? "s" : ""}`
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to add members");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      const res = await api.delete(`/groups/${groupId}/members/${userId}`);
      setGroup(res.data);
      toast.success("Member removed");
      fetchBalances(); // Refresh balances in case someone was removed
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to remove member");
    }
  };

  const handleExpenseAdded = () => {
    toast.success("Expense added successfully!");
    setShowExpenseModal(false);
    fetchExpenses();
    fetchBalances();
  };

  const handleRecordSettlement = async (fromUser, toUser, amount) => {
    try {
      setLoading(true);
      await api.post("/expenses", {
        groupId,
        description: `Settlement: ${fromUser.name} paid ${toUser.name}`,
        amount: Number(amount),
        splitType: "exact",
        category: "bills",
        participants: [toUser.userId],
        exactSplits: [{ userId: toUser.userId, share: Number(amount) }],
        paidBy: fromUser.userId,
      });
      toast.success("Settlement payment recorded!");
      fetchExpenses();
      fetchBalances();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to record settlement");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = () => {
    try {
      return token ? JSON.parse(atob(token.split(".")[1]))?.id : null;
    } catch {
      return null;
    }
  };

  const isCreator =
    group &&
    String(group.createdBy?._id || group.createdBy) === String(getCurrentUserId());

  const expenseSummary = useMemo(() => {
    const currency = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });

    const date = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const byPayer = expenses.reduce((acc, expense) => {
      const payerId = String(expense.paidBy?._id || "unknown");
      if (!acc[payerId]) {
        acc[payerId] = {
          id: payerId,
          name: expense.paidBy?.name || "Unknown spender",
          email: expense.paidBy?.email || "",
          total: 0,
          items: [],
        };
      }

      acc[payerId].total += Number(expense.amount) || 0;
      acc[payerId].items.push(expense);
      return acc;
    }, {});

    return {
      currency,
      date,
      payers: Object.values(byPayer).sort((a, b) => b.total - a.total),
      total: expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    };
  }, [expenses]);

  const currentUserBalance = useMemo(() => {
    if (!balances?.balances) return 0;
    const currentUid = getCurrentUserId();
    const userBal = balances.balances.find((b) => String(b.userId) === String(currentUid));
    return userBal ? Number(userBal.balance) : 0;
  }, [balances, token]);

  const handleDeleteTrip = async () => {
    const confirmed = window.confirm(
      "Delete this trip and all of its expenses, notes, and group messages?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Trip deleted");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete trip");
    }
  };

  const goBack = () => router.push("/dashboard");
  const goToChat = () => router.push(`/groupchat?groupId=${groupId}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-background text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading group details…
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-foreground bg-card">
        <p className="mb-3">Group not found.</p>
        <button
          className="text-primary underline flex items-center gap-1"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeftCircle size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 md:px-8 space-y-8">
      
      {/* 🚀 PREMIUM GLASSMORPHIC HEADER */}
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {group.isCompleted ? "Completed" : "Active Group"}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-300 bg-clip-text text-transparent mt-2">
                {group.name}
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                <StarIcon size={14} className="text-amber-500 fill-amber-500" />
                Created by <span className="font-semibold text-foreground">{group.createdBy?.name || "You"}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Group Chat */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goToChat}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <MessageCircleMore size={16} />
                Group Chat
              </motion.button>

              {isCreator && (
                <button
                  type="button"
                  onClick={handleDeleteTrip}
                  className="flex items-center gap-2 text-sm font-semibold text-destructive hover:text-destructive/80 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                  Delete Group
                </button>
              )}

              {/* Back */}
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl border border-border bg-card transition-all cursor-pointer"
              >
                <ArrowLeftCircle size={16} /> Back
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 💳 QUICK FINTECH INFO CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Spent */}
        <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Group Spend</p>
          <p className="text-2xl font-black text-foreground mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            {expenseSummary.currency.format(expenseSummary.total)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>Across {expenses.length} logged expense items</span>
          </div>
        </div>

        {/* Card 2: Personal Balance Position */}
        <div className={`bg-card border p-5 rounded-2xl shadow-sm relative overflow-hidden group transition-all duration-300 ${
          currentUserBalance > 0.01 
            ? "border-emerald-500/20 hover:border-emerald-500/40" 
            : currentUserBalance < -0.01 
            ? "border-rose-500/20 hover:border-rose-500/40" 
            : "border-border/80 hover:border-primary/30"
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none transition-colors ${
            currentUserBalance > 0.01 
              ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" 
              : currentUserBalance < -0.01 
              ? "bg-rose-500/5 group-hover:bg-rose-500/10" 
              : "bg-primary/5 group-hover:bg-primary/10"
          }`} />
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your Balance Position</p>
          
          {currentUserBalance > 0.01 ? (
            <>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                +{expenseSummary.currency.format(Math.abs(currentUserBalance))}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={12} />
                <span>You are owed overall by this group</span>
              </div>
            </>
          ) : currentUserBalance < -0.01 ? (
            <>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                -{expenseSummary.currency.format(Math.abs(currentUserBalance))}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-rose-600 dark:text-rose-400">
                <ArrowDownLeft size={12} />
                <span>You owe money to others in this group</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-muted-foreground mt-2">
                Settled Up
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                <CheckCircle size={12} className="text-primary" />
                <span>All balances are settled or zero</span>
              </div>
            </>
          )}
        </div>

        {/* Card 3: Active Members */}
        <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Group Size</p>
          <p className="text-2xl font-black text-foreground mt-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {group.members?.length || 0} Members
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {group.members?.slice(0, 4).map((m, i) => (
                m.photoURL ? (
                  <img key={m._id || i} className="inline-block h-5 w-5 rounded-full ring-2 ring-card object-cover" src={m.photoURL} alt="" />
                ) : (
                  <div key={m._id || i} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-card bg-neutral-700 text-[8px] font-bold text-white uppercase">
                    {m.name?.charAt(0) || "U"}
                  </div>
                )
              ))}
              {group.members?.length > 4 && (
                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-card bg-muted text-[8px] font-bold text-muted-foreground border border-border">
                  +{group.members.length - 4}
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowInviteModal(true)} 
              className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
            >
              + Invite Friends
            </button>
          </div>
        </div>
      </div>

      {/* 🟦 DUAL PANEL LAYOUT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-8">
        
        {/* ===================== LEFT COLUMN: EXPENSES & NOTES ===================== */}
        <div className="space-y-6">
          
          {/* Tab Switcher Card */}
          <div className="bg-card border border-border rounded-2xl p-2 shadow-sm flex gap-1">
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "feed"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Receipt size={15} />
              <span className="sm:hidden">Log</span>
              <span className="hidden sm:inline">Expenses Log</span>
            </button>
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "breakdown"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <TrendingUp size={15} />
              <span className="sm:hidden">Spend</span>
              <span className="hidden sm:inline">Spend Owners</span>
            </button>
            {/* Balances Tab only on Mobile/Tablet */}
            <button
              onClick={() => setActiveTab("balances")}
              className={`lg:hidden flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "balances"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Wallet2 size={15} />
              Balances
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "notes"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <BookOpen size={15} />
              <span className="sm:hidden">Notes</span>
              <span className="hidden sm:inline">Shared Notes</span>
            </button>
          </div>

          {/* Dynamic Tab Body */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {/* Tab 1: Chronological Expenses Feed */}
              {activeTab === "feed" && (
                <motion.div
                  key="feed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-border pb-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-foreground">Chronological Log</h3>
                      <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Every expense recorded in this group in order of time.</p>
                    </div>
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-3 sm:px-4 py-2 rounded-xl shadow-sm text-xs sm:text-sm hover:opacity-95 transition cursor-pointer shrink-0"
                    >
                      <PlusCircle size={14} />
                      <span className="sm:hidden">Add</span>
                      <span className="hidden sm:inline">Add Expense</span>
                    </button>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/40">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center text-primary">
                        <Receipt size={22} />
                      </div>
                      <p className="font-semibold text-foreground">No expenses recorded</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        Add an expense to start tracking and splitting costs among group members.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3.5">
                        {((expenses.length > 10 && !showAllExpenses) ? expenses.slice(0, 9) : expenses).map((exp) => {
                          const catKey = exp.category?.toLowerCase() || "misc";
                          const Icon = categoryIcons[catKey] || FileText;

                          return (
                            <div
                              key={exp._id}
                              className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:border-primary/40 shadow-sm transition-all duration-200"
                            >
                              {/* Category Icon */}
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/10 text-primary">
                                <Icon size={16} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Title + Amount row */}
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-semibold text-foreground truncate text-sm">
                                    {exp.description}
                                  </h4>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="font-bold text-sm text-foreground">
                                      {expenseSummary.currency.format(exp.amount)}
                                    </span>
                                    {exp.ocrText && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedOcr(exp);
                                          setShowOcrModal(true);
                                        }}
                                        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer"
                                        title="View Scanned Bill"
                                      >
                                        <Eye size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Single metadata line */}
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                  <span className="font-medium text-foreground/70 truncate max-w-[90px]">{exp.paidBy?.name || "Someone"}</span>
                                  <span className="text-muted-foreground/30 shrink-0">·</span>
                                  <CalendarDays size={10} className="shrink-0" />
                                  <span className="shrink-0">{expenseSummary.date.format(new Date(exp.date))}</span>
                                  <span className="text-muted-foreground/30 shrink-0">·</span>
                                  <span className="shrink-0 capitalize">{exp.splitType} split</span>
                                  {exp.category && exp.category !== "general" && (
                                    <>
                                      <span className="text-muted-foreground/30 shrink-0">·</span>
                                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 capitalize shrink-0">
                                        {exp.category}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {expenses.length > 10 && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={() => setShowAllExpenses(!showAllExpenses)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary border border-primary/20 bg-primary/5 hover:border-primary px-4.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                          >
                            {showAllExpenses ? "✕ Show Less Logs" : `➕ View All Logs (${expenses.length})`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 2: Spend Owners accordion */}
              {activeTab === "breakdown" && (
                <motion.div
                  key="breakdown"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Spend Owners</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Spend breakdown grouped by payer. Click a card to see individual items.</p>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">No records to break down.</div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden shadow-sm">
                      {expenseSummary.payers.map((payer) => {
                        const isOpen = expandedPayerId === payer.id;
                        const firstLetter = payer.name.charAt(0).toUpperCase();

                        return (
                          <div key={payer.id} className="bg-card">
                            <button
                              type="button"
                              onClick={() => setExpandedPayerId(isOpen ? null : payer.id)}
                              className="w-full grid grid-cols-[1.4fr_0.8fr_0.8fr_40px] items-center px-5 py-4 text-left transition hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                                  {firstLetter || "U"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate text-sm">{payer.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{payer.email}</p>
                                </div>
                              </div>

                              <div>
                                <p className="font-bold text-foreground">
                                  {expenseSummary.currency.format(payer.total)}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {payer.items.length} {payer.items.length === 1 ? "expense" : "expenses"}
                                </p>
                              </div>

                              <ChevronDown
                                size={18}
                                className={`justify-self-end text-muted-foreground transition-transform ${
                                  isOpen ? "rotate-180 text-primary" : ""
                                }`}
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-border bg-muted/10"
                                >
                                  <div className="px-5 py-4 space-y-2">
                                    {payer.items.map((exp) => {
                                      const catKey = exp.category?.toLowerCase() || "misc";
                                      const Icon = categoryIcons[catKey] || FileText;

                                      return (
                                        <div
                                          key={exp._id}
                                          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-primary">
                                              <Icon size={14} />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="truncate text-xs font-semibold text-foreground">{exp.description}</p>
                                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                <CalendarDays size={11} />
                                                {expenseSummary.date.format(new Date(exp.date))}
                                              </p>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-foreground">
                                              {expenseSummary.currency.format(exp.amount)}
                                            </span>
                                            {exp.ocrText && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedOcr(exp);
                                                  setShowOcrModal(true);
                                                }}
                                                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted"
                                              >
                                                <Eye size={14} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 3: Notepad Section */}
              {activeTab === "notes" && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <NotepadSection groupId={groupId} />
                </motion.div>
              )}

              {/* Tab 4: Balances & Members (Mobile/Tablet Only) */}
              {activeTab === "balances" && (
                <motion.div
                  key="balances"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 lg:hidden"
                >
                  {/* Group Balances Widget */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Wallet2 className="text-primary" size={18} />
                        Group Balances
                      </h3>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        Real-Time
                      </span>
                    </div>

                    {!balances?.balances?.length ? (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        No active balances. Add expenses to calculate.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {balances.balances.map((b, i) => {
                          const balNum = Number(b.balance);
                          const isCreditor = balNum > 0.01;
                          const isDebtor = balNum < -0.01;

                          return (
                            <div
                              key={b.userId || i}
                              className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/60 text-xs hover:border-primary/30 transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isCreditor ? (
                                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <ArrowUpRight size={13} />
                                  </div>
                                ) : isDebtor ? (
                                  <div className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                    <ArrowDownLeft size={13} />
                                  </div>
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                                    <CheckCircle size={13} />
                                  </div>
                                )}
                                <span className="text-foreground font-semibold truncate">{b.name}</span>
                              </div>

                              <span
                                className={`font-bold ${
                                  isCreditor
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isDebtor
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isCreditor
                                  ? `+₹${Math.abs(balNum).toFixed(0)}`
                                  : isDebtor
                                  ? `-₹${Math.abs(balNum).toFixed(0)}`
                                  : "Settled"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {balances?.suggestions?.length > 0 && (
                      <div className="pt-4 border-t border-border space-y-3">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          💡 Smart Settlements
                        </h4>
                        <div className="space-y-2.5">
                          {balances.suggestions.map((s, i) => (
                            <div
                              key={i}
                              className="bg-muted/40 border border-border p-3.5 rounded-xl text-xs flex flex-col gap-2.5 hover:border-primary/30 transition shadow-sm"
                            >
                              <div className="leading-relaxed">
                                <span className="font-bold text-rose-600 dark:text-rose-400">{s.from.name}</span>
                                <span className="text-muted-foreground"> owes </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{s.amount.toFixed(0)}</span>
                                <span className="text-muted-foreground"> to </span>
                                <span className="font-semibold text-primary">{s.to.name}</span>
                              </div>
                              
                              <button
                                onClick={() => handleRecordSettlement(s.from, s.to, s.amount)}
                                className="w-full flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/10 hover:border-primary/20 font-bold py-2 rounded-lg transition-all cursor-pointer"
                              >
                                <CheckCircle size={13} />
                                Record Settlement
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group Members Widget */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Users2 className="text-primary" size={18} />
                        Group Members
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {group.members?.length || 0} total
                      </span>
                    </div>

                    {group.members?.length ? (
                      <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                        {group.members.map((m) => {
                          const isCreatorUser = String(group.createdBy?._id || group.createdBy) === String(m._id);
                          
                          return (
                            <div
                              key={m._id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition group relative"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {m.photoURL ? (
                                  <img
                                    src={m.photoURL}
                                    alt={m.name}
                                    className="w-7 h-7 rounded-full object-cover border border-border"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                    {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                                  </div>
                                )}
                                <div className="min-w-0 text-xs">
                                  <p className="font-semibold text-foreground truncate">{m.name || "Unnamed User"}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center">
                                {isCreatorUser ? (
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    Owner
                                  </span>
                                ) : (
                                  isCreator && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemove(m._id)}
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded-md transition cursor-pointer"
                                      title={`Remove ${m.name}`}
                                    >
                                      <X size={13} />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-xs">No members.</div>
                    )}

                    <div className="pt-3 border-t border-border flex flex-col gap-2.5">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold py-2.5 rounded-xl shadow hover:opacity-95 transition-all cursor-pointer"
                      >
                        <QrCode size={14} />
                        Invite Friends (Link / QR)
                      </button>

                      <button
                        onClick={() => setShowAddMember(true)}
                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold border border-border hover:bg-muted text-foreground py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        ➕ Add Group Member
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN: SIDEBAR (BALANCES & MEMBERS) ===================== */}
        <div className="hidden lg:block space-y-6">
          
          {/* 1. Group Balances & Settlement Suggestions Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Wallet2 className="text-primary" size={18} />
                Group Balances
              </h3>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                Real-Time
              </span>
            </div>

            {/* Balances List */}
            {!balances?.balances?.length ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No active balances. Add expenses to calculate.
              </div>
            ) : (
              <div className="space-y-2.5">
                {balances.balances.map((b, i) => {
                  const balNum = Number(b.balance);
                  const isCreditor = balNum > 0.01;
                  const isDebtor = balNum < -0.01;

                  return (
                    <div
                      key={b.userId || i}
                      className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/60 text-xs hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCreditor ? (
                          <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ArrowUpRight size={13} />
                          </div>
                        ) : isDebtor ? (
                          <div className="h-6 w-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <ArrowDownLeft size={13} />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <CheckCircle size={13} />
                          </div>
                        )}
                        <span className="text-foreground font-semibold truncate">{b.name}</span>
                      </div>

                      <span
                        className={`font-bold ${
                          isCreditor
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isDebtor
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isCreditor
                          ? `+₹${Math.abs(balNum).toFixed(0)}`
                          : isDebtor
                          ? `-₹${Math.abs(balNum).toFixed(0)}`
                          : "Settled"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart Settlement Suggestions */}
            {balances?.suggestions?.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  💡 Smart Settlements
                </h4>
                <div className="space-y-2.5">
                  {balances.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="bg-muted/40 border border-border p-3.5 rounded-xl text-xs flex flex-col gap-2.5 hover:border-primary/30 transition shadow-sm"
                    >
                      <div className="leading-relaxed">
                        <span className="font-bold text-rose-600 dark:text-rose-400">{s.from.name}</span>
                        <span className="text-muted-foreground"> owes </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{s.amount.toFixed(0)}</span>
                        <span className="text-muted-foreground"> to </span>
                        <span className="font-semibold text-primary">{s.to.name}</span>
                      </div>
                      
                      <button
                        onClick={() => handleRecordSettlement(s.from, s.to, s.amount)}
                        className="w-full flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/10 hover:border-primary/20 font-bold py-2 rounded-lg transition-all cursor-pointer"
                      >
                        <CheckCircle size={13} />
                        Record Settlement
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Group Members & Invites Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Users2 className="text-primary" size={18} />
                Group Members
              </h3>
              <span className="text-xs text-muted-foreground">
                {group.members?.length || 0} total
              </span>
            </div>

            {/* Dynamic Members List */}
            {group.members?.length ? (
              <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                {group.members.map((m) => {
                  const isCreatorUser = String(group.createdBy?._id || group.createdBy) === String(m._id);
                  
                  return (
                    <div
                      key={m._id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition group relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.photoURL ? (
                          <img
                            src={m.photoURL}
                            alt={m.name}
                            className="w-7 h-7 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                          </div>
                        )}
                        <div className="min-w-0 text-xs">
                          <p className="font-semibold text-foreground truncate">{m.name || "Unnamed User"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isCreatorUser ? (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Owner
                          </span>
                        ) : (
                          isCreator && (
                            <button
                              type="button"
                              onClick={() => handleRemove(m._id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded-md transition cursor-pointer"
                              title={`Remove ${m.name}`}
                            >
                              <X size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">No members.</div>
            )}

            {/* Quick Actions Panel */}
            <div className="pt-3 border-t border-border flex flex-col gap-2.5">
              
              {/* QR Invite popup trigger */}
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold py-2.5 rounded-xl shadow hover:opacity-95 transition-all cursor-pointer"
              >
                <QrCode size={14} />
                Invite Friends (Link / QR)
              </button>

              {/* Add member search widget toggle */}
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold border border-border hover:bg-muted text-foreground py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                ➕ Add Group Member
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ➕ ADD EXPENSE MODAL */}
      <AnimatePresence>
        {showExpenseModal && (
          <AddExpenseModal
            group={group}
            onClose={() => setShowExpenseModal(false)}
            onSuccess={handleExpenseAdded}
          />
        )}
      </AnimatePresence>

      {/* 📱 QR / LINK INVITE MODAL */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            groupId={groupId}
            token={token}
            onClose={() => setShowInviteModal(false)}
          />
        )}
      </AnimatePresence>

      {/* 📂 OCR MODAL */}
      <AnimatePresence>
        {showOcrModal && selectedOcr && (
          <OcrViewModal
            ocrText={selectedOcr.ocrText}
            imageUrl={selectedOcr.imageUrl}
            onClose={() => setShowOcrModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ➕ ADD MEMBER MODAL */}
      <AnimatePresence>
        {showAddMember && (
          <MemberPicker
            groupId={groupId}
            exclude={group.members.map((m) => m.email)}
            onClose={() => setShowAddMember(false)}
            onSubmit={(selectedEmails) => {
              handleAddMembers(selectedEmails);
              setShowAddMember(false);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
