"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import MemberPicker from "@/components/MemberPicker";
import AddExpenseModal from "@/components/AddExpenseModal";
import InviteModal from "@/components/InviteModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import MembersModal from "@/components/MembersModal";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  PlusCircle,
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
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  BookOpen,
  CheckCircle,
  UserPlus,
  Zap,
  Wallet2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";
import Loader3D from "@/components/Loader3D";
import socket, { connectSocket } from "@/lib/socket";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatCurrency";

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

const fmtDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const groupId = useMemo(() => params?.id, [params]);

  const [group, setGroup] = useState(null);
  const [meId, setMeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null); // { id, name } | null
  const [selectedOcr, setSelectedOcr] = useState(null);
  const [expandedPayerId, setExpandedPayerId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 1024); }, []);
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "balances" : "feed"
  );
  const [showAllExpenses, setShowAllExpenses] = useState(false);

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

  const fetchPendingSettlements = async () => {
    try {
      const res = await api.get(`/expenses/settle/pending/${groupId}`);
      setPendingSettlements(res.data || []);
    } catch {
      // Non-critical - the Smart Settlements list still works without this.
    }
  };

  useEffect(() => {
    // Wait for Firebase to finish restoring the session on a hard refresh -
    // fetching before it resolves means every request goes out unauthenticated.
    if (authLoading) return;
    if (!groupId || !token) return;
    // Fetch current user's MongoDB _id - Firebase token payload doesn't carry it
    api.get("/users/me").then((r) => setMeId(r.data?._id || r.data?.id || null)).catch(() => {});
    fetchGroup();
    fetchExpenses();
    fetchBalances();
    fetchPendingSettlements();
  }, [groupId, token, authLoading]);

  // Live refresh: any confirm/reject/cancel from the other party (or from
  // this user on another tab) pushes a "settlementUpdate" event to everyone
  // viewing this group, so the balances/pending list never go stale.
  useEffect(() => {
    if (!groupId || !token) return;
    connectSocket();
    socket.emit("joinGroup", groupId);
    const onSettlementUpdate = (payload) => {
      if (String(payload?.groupId) !== String(groupId)) return;
      fetchBalances();
      fetchExpenses();
      fetchPendingSettlements();
    };
    socket.on("settlementUpdate", onSettlementUpdate);
    return () => {
      socket.off("settlementUpdate", onSettlementUpdate);
      socket.emit("leaveGroup", groupId);
    };
  }, [groupId, token]);

  const handleAddMembers = async (emails) => {
    if (!emails?.length) return;
    try {
      setAdding(true);
      const res = await api.post(`/groups/${groupId}/members`, { emails });
      const { added = 0, invited = 0, group: updatedGroup } = res.data;

      if (updatedGroup) setGroup(updatedGroup);

      if (added > 0 && invited > 0) {
        toast.success(`${added} member${added !== 1 ? "s" : ""} added, invitation email${invited !== 1 ? "s" : ""} sent to ${invited} unregistered address${invited !== 1 ? "es" : ""}`);
      } else if (added > 0) {
        toast.success(`${added} member${added !== 1 ? "s" : ""} added successfully!`);
      } else if (invited > 0) {
        toast.success(`Invitation email${invited !== 1 ? "s" : ""} sent to ${invited} address${invited !== 1 ? "es" : ""}! They'll join automatically after signing up.`);
      }

      fetchGroup();
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
      fetchBalances();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to remove member");
    }
  };

  const requestRemoveMember = (id, name) => setMemberToRemove({ id, name });
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    await handleRemove(memberToRemove.id);
    setMemberToRemove(null);
  };

  const handleExpenseAdded = () => {
    toast.success("Expense added successfully!");
    setShowExpenseModal(false);
    fetchExpenses();
    fetchBalances();
  };

  // Settlements are two-party: this only files a claim. It never moves a
  // balance by itself - only the counterparty's confirm does (see
  // handleConfirmSettlement below). Prevents either side from unilaterally
  // marking a debt paid.
  const handleRequestSettlement = async (fromUser, toUser, amount, method, note) => {
    try {
      await api.post("/expenses/settle/request", {
        groupId,
        fromUserId: fromUser.userId,
        toUserId: toUser.userId,
        amount: Number(amount),
        method,
        note,
      });
      toast.success("Settlement request sent - waiting for their confirmation.");
      fetchPendingSettlements();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send settlement request");
    }
  };

  const handleConfirmSettlement = async (requestId) => {
    try {
      await api.post(`/expenses/settle/${requestId}/confirm`);
      toast.success("Settlement confirmed. Balances updated.");
      fetchExpenses();
      fetchBalances();
      fetchPendingSettlements();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to confirm settlement");
    }
  };

  const handleRejectSettlement = async (requestId) => {
    try {
      await api.post(`/expenses/settle/${requestId}/reject`);
      toast.success("Settlement request rejected.");
      fetchPendingSettlements();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to reject settlement request");
    }
  };

  const handleCancelSettlement = async (requestId) => {
    try {
      await api.post(`/expenses/settle/${requestId}/cancel`);
      toast.success("Settlement request cancelled.");
      fetchPendingSettlements();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel settlement request");
    }
  };

  const isCreator =
    group && meId && String(group.createdBy?._id || group.createdBy) === String(meId);

  const expenseSummary = useMemo(() => {
    // Settlements affect balances but are NOT real spending - exclude from totals
    // Double-guard: flag OR description prefix (catches any legacy records)
    const realExpenses = expenses.filter(
      (e) => !e.isSettlement && !e.description?.toLowerCase().startsWith("settlement")
    );
    const byPayer = realExpenses.reduce((acc, expense) => {
      const payerId = String(expense.paidBy?._id || "unknown");
      if (!acc[payerId]) {
        acc[payerId] = { id: payerId, name: expense.paidBy?.name || "Unknown", email: expense.paidBy?.email || "", total: 0, items: [] };
      }
      acc[payerId].total += Number(expense.amount) || 0;
      acc[payerId].items.push(expense);
      return acc;
    }, {});
    return {
      payers: Object.values(byPayer).sort((a, b) => b.total - a.total),
      total: realExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      count: realExpenses.length,
    };
  }, [expenses]);

  const currentUserBalance = useMemo(() => {
    if (!balances?.balances || !meId) return 0;
    const b = balances.balances.find((b) => String(b.userId) === String(meId));
    return b ? Number(b.balance) : 0;
  }, [balances, meId]);

  const handleDeleteTrip = async () => {
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success("Trip deleted");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete trip");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return <Loader3D message="Entering trip room..." />;
  }

  if (!group) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="text-muted-foreground mb-4">Group not found.</p>
        <button onClick={() => router.push("/dashboard")} className="text-primary underline text-sm">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { key: "feed", label: "Expenses Log", icon: Receipt },
    { key: "breakdown", label: "Spend Owners", icon: TrendingUp },
    // { key: "notes", label: "Shared Notes", icon: BookOpen },
  ];

  const displayedExpenses = expenses.length > 10 && !showAllExpenses ? expenses.slice(0, 9) : expenses;

  return (
    <div className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-32 sm:pb-12 px-3 sm:px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className={`bg-card border border-border rounded-xl px-4 py-3 sm:px-6 sm:py-4 shadow-sm ${group.isCompleted ? "opacity-80" : ""}`}>
          <div className="flex items-center justify-between gap-4">

            {/* Left: name + meta */}
            <div className="min-w-0 flex items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight truncate">
                    {group.name}
                  </h1>
                  {group.isCompleted && (
                    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  by <span className="font-medium text-foreground/70">{group.createdBy?.name || "You"}</span>
                </p>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push("/dashboard")}
                title="Back to dashboard"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded  border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">Back</span>
              </button>

              {isCreator && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete group"
                  className="flex items-center justify-center w-8 h-8 rounded border border-destructive/20 text-destructive/60 hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              )}

              <button
                onClick={() => router.push(`/groupchat?groupId=${groupId}`)}
                className="flex items-center gap-1.5 text-xs font-bold text-white px-3 h-8 rounded transition cursor-pointer"
                style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 2px 8px rgba(8,145,178,0.25)" }}
              >
                <MessageCircleMore size={13} />
                <span>Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Spend */}
          <div className="col-span-2 sm:col-span-1 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Group Spend</p>
            <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(expenseSummary.total)}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Across {expenseSummary.count} logged expense{expenseSummary.count !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Balance Position */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your Balance Position</p>
            {currentUserBalance > 0.01 ? (
              <>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  +{formatCurrency(Math.abs(currentUserBalance))}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                  <ArrowUpRight size={11} /> You are owed by this group
                </p>
              </>
            ) : currentUserBalance < -0.01 ? (
              <>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  -{formatCurrency(Math.abs(currentUserBalance))}
                </p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                  <ArrowDownLeft size={11} /> You owe others in this group
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-muted-foreground mt-2">Settled Up</p>
                <p className="text-[11px] text-primary mt-1.5 flex items-center gap-1">
                  <CheckCircle size={11} /> All balances are settled
                </p>
              </>
            )}
          </div>

          {/* Members - tap anywhere to open the full searchable roster */}
          <button
            type="button"
            onClick={() => setShowMembersModal(true)}
            className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm text-left hover:border-primary/40 hover:bg-muted/20 transition cursor-pointer"
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Group Size</p>
            <p className="text-2xl font-black text-foreground mt-2">
              {group.members?.length || 0} Members
            </p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex -space-x-2">
                {group.members?.slice(0, 4).map((m, i) =>
                  m.photoURL ? (
                    <Image key={m._id || i} src={m.photoURL} alt={m.name || ""} width={22} height={22}
                      className="w-5.5 h-5.5 rounded-full ring-2 ring-card object-cover" />
                  ) : (
                    <div key={m._id || i} className="w-5.5 h-5.5 rounded-full ring-2 ring-card bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary">
                      {m.name?.charAt(0) || "U"}
                    </div>
                  )
                )}
                {group.members?.length > 4 && (
                  <div className="w-5.5 h-5.5 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                    +{group.members.length - 4}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-semibold text-primary">Manage</span>
            </div>
          </button>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-5">

          {/* LEFT: TABS + CONTENT */}
          <div className="space-y-4">

            {/* Tab bar */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-sm w-max min-w-full sm:w-fit">

                {/* Group Balance - mobile only, FIRST position */}
                <button onClick={() => setActiveTab("balances")}
                  className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "balances"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}>
                  <Wallet2 size={13} />
                  <span>Group Balance</span>
                </button>

                {/* Expenses Log + Spend Owners - always shown */}
                {tabs.filter(t => t.key !== "notes").map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}>
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                ))}

                {/* Shared Notes - desktop only */}
                {/* <button onClick={() => setActiveTab("notes")}
                  className={`hidden lg:flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "notes"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}>
                  <BookOpen size={13} />
                  <span>Shared Notes</span>
                </button> */}

              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">

              {/* Expenses Log */}
              {activeTab === "feed" && (
                <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-base text-foreground">Chronological Log</h3>
                    <button onClick={() => setShowExpenseModal(true)}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition cursor-pointer">
                      <PlusCircle size={14} /> Add Expense
                    </button>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
                        <Receipt className="text-primary/50" size={22} />
                      </div>
                      <p className="font-semibold text-foreground text-sm">No expenses recorded</p>
                      <p className="text-xs text-muted-foreground mt-1">Add an expense to start splitting costs.</p>
                    </div>
                  ) : (
                    <>
                      {displayedExpenses.map((exp, idx) => {
                        const isSettlementRow = exp.isSettlement || exp.description?.toLowerCase().startsWith("settlement");
                        if (isSettlementRow) {
                          return (
                            <div key={exp._id}
                              className={`flex items-center gap-3 px-5 sm:px-6 py-3 transition ${
                                idx < displayedExpenses.length - 1 ? "border-b border-border" : ""
                              }`}
                              style={{ background: "rgba(16,185,129,0.04)" }}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <CheckCircle size={15} className="text-emerald-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                  {exp.paidBy?.name} settled up
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {fmtDate.format(new Date(exp.date))}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                                  Settlement
                                </span>
                                <span className="font-bold text-sm text-emerald-500">{formatCurrency(exp.amount)}</span>
                              </div>
                            </div>
                          );
                        }
                        const catKey = exp.category?.toLowerCase() || "misc";
                        const Icon = categoryIcons[catKey] || FileText;
                        return (
                          <div key={exp._id}
                            className={`flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-muted/25 transition ${
                              idx < displayedExpenses.length - 1 ? "border-b border-border" : ""
                            }`}>
                            <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center shrink-0 text-primary">
                              <Icon size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">{exp.description}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Paid by {exp.paidBy?.name || "Someone"} · {fmtDate.format(new Date(exp.date))}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {exp.category && exp.category !== "general" && (
                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/8 text-primary border border-primary/10">
                                  {exp.category}
                                </span>
                              )}
                              {exp.ocrText && (
                                <button type="button"
                                  onClick={() => { setSelectedOcr(exp); setShowOcrModal(true); }}
                                  className="text-muted-foreground hover:text-primary p-1 rounded cursor-pointer transition">
                                  <Eye size={13} />
                                </button>
                              )}
                              <span className="font-bold text-sm text-foreground">{formatCurrency(exp.amount)}</span>
                            </div>
                          </div>
                        );
                      })}
                      {expenses.length > 10 && (
                        <div className="px-6 py-3.5 border-t border-border text-center">
                          <button onClick={() => setShowAllExpenses(!showAllExpenses)}
                            className="text-sm font-semibold text-primary hover:text-primary/80 transition cursor-pointer">
                            {showAllExpenses ? "Show Less" : `View All Logs (${expenses.length})`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Spend Owners */}
              {activeTab === "breakdown" && (
                <motion.div key="breakdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-base text-foreground">Spend Owners</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Breakdown by payer - tap to expand</p>
                  </div>
                  {expenses.length === 0 ? (
                    <div className="text-center py-14 text-muted-foreground text-sm">No records to break down.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {expenseSummary.payers.map((payer) => {
                        const isOpen = expandedPayerId === payer.id;
                        return (
                          <div key={payer.id}>
                            <button type="button"
                              onClick={() => setExpandedPayerId(isOpen ? null : payer.id)}
                              className="w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-left hover:bg-muted/25 transition cursor-pointer">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                {payer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">{payer.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {payer.items.length} expense{payer.items.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <span className="font-bold text-foreground text-sm shrink-0">{formatCurrency(payer.total)}</span>
                              <ChevronDown size={16}
                                className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
                                  exit={{ height: 0 }} transition={{ duration: 0.2 }}
                                  className="overflow-hidden bg-muted/20 border-t border-border">
                                  <div className="px-5 sm:px-6 py-3 space-y-2">
                                    {payer.items.map((exp) => {
                                      const Icon = categoryIcons[exp.category?.toLowerCase()] || FileText;
                                      return (
                                        <div key={exp._id}
                                          className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
                                          <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
                                            <Icon size={13} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{exp.description}</p>
                                            <p className="text-[10px] text-muted-foreground">{fmtDate.format(new Date(exp.date))}</p>
                                          </div>
                                          <span className="text-xs font-bold text-foreground shrink-0">{formatCurrency(exp.amount)}</span>
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

              {/* Notes */}
              {activeTab === "notes" && (
                <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  <NotepadSection groupId={groupId} />
                </motion.div>
              )}

              {/* Group Balance tab - mobile only */}
              {activeTab === "balances" && (
                <motion.div key="balances" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="lg:hidden space-y-3">
                  <BalancesCard balances={balances} pendingSettlements={pendingSettlements} meId={meId}
                    onRequestSettlement={handleRequestSettlement}
                    onConfirmSettlement={handleConfirmSettlement}
                    onRejectSettlement={handleRejectSettlement}
                    onCancelSettlement={handleCancelSettlement}
                    onAddExpense={() => setShowExpenseModal(true)} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="hidden lg:flex flex-col gap-5">
            <BalancesCard balances={balances} pendingSettlements={pendingSettlements} meId={meId}
              onRequestSettlement={handleRequestSettlement}
              onConfirmSettlement={handleConfirmSettlement}
              onRejectSettlement={handleRejectSettlement}
              onCancelSettlement={handleCancelSettlement} />
            <MembersCard group={group} isCreator={isCreator}
              onAdd={() => setShowAddMember(true)}
              onInvite={() => setShowInviteModal(true)}
              onRemove={requestRemoveMember}
              onViewAll={() => setShowMembersModal(true)} />
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTrip}
        title={`Delete "${group.name}"?`}
        description={`You're about to permanently delete this trip. All expenses, notes, group messages, and member data will be removed forever.`}
      />
      <ConfirmDeleteModal
        isOpen={!!memberToRemove}
        onCancel={() => setMemberToRemove(null)}
        onConfirm={confirmRemoveMember}
        title={`Remove ${memberToRemove?.name || "this member"}?`}
        description="They'll lose access to this group and its expenses right away. This can't be undone."
      />
      <AnimatePresence>
        {showExpenseModal && (
          <AddExpenseModal group={group} onClose={() => setShowExpenseModal(false)} onSuccess={handleExpenseAdded} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal groupId={groupId} token={token} onClose={() => setShowInviteModal(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOcrModal && selectedOcr && (
          <OcrViewModal ocrText={selectedOcr.ocrText} imageUrl={selectedOcr.imageUrl} onClose={() => setShowOcrModal(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddMember && (
          <MemberPicker
            groupId={groupId}
            exclude={group.members.map((m) => m.email)}
            onClose={() => setShowAddMember(false)}
            onSubmit={(emails) => { handleAddMembers(emails); setShowAddMember(false); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMembersModal && (
          <MembersModal
            group={group}
            isCreator={isCreator}
            onClose={() => setShowMembersModal(false)}
            onAdd={() => { setShowMembersModal(false); setShowAddMember(true); }}
            onInvite={() => { setShowMembersModal(false); setShowInviteModal(true); }}
            onRemove={handleRemove}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Group Balances sidebar card ── */
function BalancesCard({ balances, pendingSettlements, meId, onRequestSettlement, onConfirmSettlement, onRejectSettlement, onCancelSettlement, onAddExpense }) {
  // activeForm holds the suggestion index whose payment-method picker is open
  const [activeForm, setActiveForm] = useState(null);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const findPendingFor = (s) =>
    pendingSettlements?.find(
      (r) => String(r.fromUserId._id) === String(s.from.userId) && String(r.toUserId._id) === String(s.to.userId)
    );

  const openForm = (i) => { setActiveForm(i); setMethod("cash"); setNote(""); };
  const closeForm = () => setActiveForm(null);

  const submitRequest = async (s) => {
    setSubmitting(true);
    await onRequestSettlement(s.from, s.to, s.amount, method, note.trim());
    setSubmitting(false);
    closeForm();
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-base text-foreground">Group Balances</h3>
        {onAddExpense ? (
          <button
            onClick={onAddExpense}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all"
            style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)", boxShadow: "0 2px 12px rgba(8,145,178,0.35)" }}
          >
            <PlusCircle size={13} />
            Add Expense
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {!balances?.balances?.length ? (
        <div className="text-center py-10 px-5 text-muted-foreground text-xs">
          No balances yet. Add expenses to calculate.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {balances.balances.map((b, i) => {
            const bal = Number(b.balance);
            const isUp = bal > 0.01;
            const isDown = bal < -0.01;
            return (
              <div key={b.userId || i} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/25 transition">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isUp ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : isDown ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {isUp ? <ArrowUpRight size={14} /> : isDown ? <ArrowDownLeft size={14} /> : <CheckCircle size={14} />}
                </div>
                <span className="flex-1 text-sm font-semibold text-foreground truncate">{b.name}</span>
                <span className={`text-sm font-bold shrink-0 ${
                  isUp ? "text-emerald-600 dark:text-emerald-400"
                  : isDown ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
                }`}>
                  {isUp || isDown ? formatSignedCurrency(bal) : "Settled"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {balances?.suggestions?.length > 0 && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Zap size={12} className="text-amber-500" /> Smart Settlements
          </h4>
          {balances.suggestions.map((s, i) => {
            const isDebtor   = String(s.from.userId) === String(meId); // I owe money
            const isCreditor = String(s.to.userId)   === String(meId); // I am owed money
            const pending = findPendingFor(s);
            const isFormOpen = activeForm === i;

            return (
              <div key={i} className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2.5">
                <p className="text-xs leading-relaxed">
                  <span className={`font-bold ${isDebtor ? "text-rose-600 dark:text-rose-400 underline decoration-dotted" : "text-rose-600 dark:text-rose-400"}`}>
                    {isDebtor ? "You" : s.from.name}
                  </span>
                  <span className="text-muted-foreground"> owe </span>
                  <span className="font-bold text-foreground">{formatCurrency(s.amount)}</span>
                  <span className="text-muted-foreground"> to </span>
                  <span className={`font-bold ${isCreditor ? "text-emerald-600 dark:text-emerald-400 underline decoration-dotted" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {isCreditor ? "You" : s.to.name}
                  </span>
                </p>

                {pending ? (
                  <PendingSettlementRow
                    pending={pending}
                    meId={meId}
                    onConfirm={onConfirmSettlement}
                    onReject={onRejectSettlement}
                    onCancel={onCancelSettlement}
                  />
                ) : isFormOpen ? (
                  <SettlementRequestForm
                    method={method} setMethod={setMethod}
                    note={note} setNote={setNote}
                    submitting={submitting}
                    onSubmit={() => submitRequest(s)}
                    onCancel={closeForm}
                    verb={isDebtor ? "pay" : "receive"}
                  />
                ) : isDebtor ? (
                  <button
                    onClick={() => openForm(i)}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-semibold py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    <CheckCircle size={13} /> I&apos;ve Paid {formatCurrency(s.amount)}
                  </button>
                ) : isCreditor ? (
                  <button
                    onClick={() => openForm(i)}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-semibold py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    <CheckCircle size={13} /> Mark {formatCurrency(s.amount)} as Received
                  </button>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-0.5">
                    Only the people involved can record this settlement
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── A pending settlement claim on a suggestion row: either "waiting on the
   other party" (if I initiated it) or "confirm/reject" (if I need to act) ── */
function PendingSettlementRow({ pending, meId, onConfirm, onReject, onCancel }) {
  const isInitiator = String(pending.initiatedBy._id) === String(meId);
  const initiatorPaid = String(pending.initiatedBy._id) === String(pending.fromUserId._id);
  const counterpartyName = initiatorPaid ? pending.toUserId.name : pending.fromUserId.name;
  const methodLabel = pending.method === "online" ? "via online transfer" : "in cash";

  if (isInitiator) {
    return (
      <div className="rounded-lg border border-amber-400/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
        <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-snug flex items-center gap-1.5">
          <Clock size={12} className="shrink-0" /> Waiting for {counterpartyName} to confirm
        </p>
        <button
          onClick={() => onCancel(pending._id)}
          className="w-full border border-border text-muted-foreground hover:bg-muted/50 font-semibold py-1.5 rounded-lg text-xs transition cursor-pointer"
        >
          Cancel Request
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/30 p-3 space-y-2">
      <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-snug">
        <span className="font-bold">{pending.initiatedBy.name}</span> says{" "}
        {initiatorPaid ? "they paid you" : "they received"}{" "}
        <span className="font-bold">{formatCurrency(pending.amount)}</span> {methodLabel}. Confirm?
      </p>
      {pending.note && (
        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/70 italic truncate">&ldquo;{pending.note}&rdquo;</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(pending._id)}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs transition cursor-pointer"
        >
          Yes, Confirm
        </button>
        <button
          onClick={() => onReject(pending._id)}
          className="flex-1 border border-border text-muted-foreground hover:bg-muted/50 font-semibold py-1.5 rounded-lg text-xs transition cursor-pointer"
        >
          Not Yet
        </button>
      </div>
    </div>
  );
}

/* ── Payment-method picker shown before a settlement claim is sent ── */
function SettlementRequestForm({ method, setMethod, note, setNote, submitting, onSubmit, onCancel, verb }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2.5">
      <p className="text-[11px] text-muted-foreground font-medium">How did you {verb}?</p>
      <div className="flex gap-2">
        {[
          { key: "cash", label: "Cash", Icon: Wallet2 },
          { key: "online", label: "Online", Icon: Zap },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMethod(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              method === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        placeholder="Add a note (optional) - e.g. UPI ref no."
        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-1.5 rounded-lg text-xs transition cursor-pointer"
        >
          {submitting ? "Sending…" : "Send Request"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-border text-muted-foreground hover:bg-muted/50 font-semibold py-1.5 rounded-lg text-xs transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Members sidebar card ── */
function MembersCard({ group, isCreator, onAdd, onInvite, onRemove, onViewAll }) {
  const creatorId = String(group.createdBy?._id || group.createdBy);
  const members = group.members || [];
  const OVERFLOW_AT = 6;
  const visibleMembers = members.length > OVERFLOW_AT ? members.slice(0, OVERFLOW_AT) : members;
  const remaining = members.length - visibleMembers.length;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-base text-foreground">Members ({members.length})</h3>
        {members.length > OVERFLOW_AT && (
          <button type="button" onClick={onViewAll}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer">
            View All
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {visibleMembers.map((m) => {
          const isMemberCreator = String(m._id) === creatorId;
          return (
            <div key={m._id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/25 transition group">
              {m.photoURL ? (
                <Image src={m.photoURL} alt={m.name || ""} width={36} height={36}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-border shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {m.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{m.name || "Unnamed"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
              </div>
              <div className="shrink-0">
                {isMemberCreator ? (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/15">
                    OWNER
                  </span>
                ) : isCreator ? (
                  <button type="button" onClick={() => onRemove(m._id, m.name)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/8 p-1.5 rounded-lg transition cursor-pointer opacity-0 group-hover:opacity-100"
                    title={`Remove ${m.name}`}>
                    <X size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <button type="button" onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-muted/25 border-t border-border transition cursor-pointer">
          +{remaining} more member{remaining !== 1 ? "s" : ""}
        </button>
      )}

      <div className="px-5 py-4 space-y-2.5 border-t border-border">
        {isCreator && (
          <button onClick={onInvite}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm shadow transition cursor-pointer">
            <QrCode size={15} /> Invite Friends (Link/QR)
          </button>
        )}
        <button onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 border border-border hover:bg-muted/50 text-foreground font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer">
          <UserPlus size={15} /> Add Group Member
        </button>
      </div>
    </div>
  );
}
