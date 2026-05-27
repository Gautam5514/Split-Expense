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
import Image from "next/image";
import {
  ArrowLeftCircle,
  Loader2,
  Wallet2,
  PlusCircle,
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
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  BookOpen,
  CheckCircle,
  UserPlus,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";
import Loader3D from "@/components/Loader3D";

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

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const fmtDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const groupId = useMemo(() => params?.id, [params]);

  const [group, setGroup] = useState(null);
  const [meId, setMeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOcr, setSelectedOcr] = useState(null);
  const [expandedPayerId, setExpandedPayerId] = useState(null);
  const [activeTab, setActiveTab] = useState("feed");
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

  useEffect(() => {
    if (groupId) {
      // Fetch current user's MongoDB _id — Firebase token payload doesn't carry it
      api.get("/users/me").then((r) => setMeId(r.data?._id || r.data?.id || null)).catch(() => {});
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
      toast.success("Settlement recorded!");
      fetchExpenses();
      fetchBalances();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to record settlement");
    } finally {
      setLoading(false);
    }
  };

  const isCreator =
    group && meId && String(group.createdBy?._id || group.createdBy) === String(meId);

  const expenseSummary = useMemo(() => {
    const byPayer = expenses.reduce((acc, expense) => {
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
      total: expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    };
  }, [expenses]);

  const currentUserBalance = useMemo(() => {
    if (!balances?.balances || !meId) return 0;
    const b = balances.balances.find((b) => String(b.userId) === String(meId));
    return b ? Number(b.balance) : 0;
  }, [balances, meId]);

  const handleDeleteTrip = async () => {
    try {
      await api.delete(`/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
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
    { key: "notes", label: "Shared Notes", icon: BookOpen },
  ];

  const displayedExpenses = expenses.length > 10 && !showAllExpenses ? expenses.slice(0, 9) : expenses;

  return (
    <div className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-32 sm:pb-12 px-3 sm:px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                group.isCompleted
                  ? "bg-muted text-muted-foreground"
                  : "bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300"
              }`}>
                {group.isCompleted ? "Completed" : "Active Group"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 leading-tight">
                {group.name}
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                <StarIcon size={13} className="text-amber-500 fill-amber-500 shrink-0" />
                Created by{" "}
                <span className="font-semibold text-foreground">{group.createdBy?.name || "You"}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition cursor-pointer"
              >
                <ArrowLeftCircle size={14} /> <span className="hidden sm:inline">Back</span>
              </button>
              {isCreator && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-destructive border border-destructive/25 hover:bg-destructive/5 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                onClick={() => router.push(`/groupchat?groupId=${groupId}`)}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow transition cursor-pointer"
              >
                <MessageCircleMore size={14} /> <span className="sm:inline">Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Spend */}
          <div className="col-span-2 sm:col-span-1 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Group Spend</p>
            <p className="text-2xl font-black text-foreground mt-2">{INR.format(expenseSummary.total)}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Across {expenses.length} logged expense{expenses.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Balance Position */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your Balance Position</p>
            {currentUserBalance > 0.01 ? (
              <>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  +{INR.format(Math.abs(currentUserBalance))}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                  <ArrowUpRight size={11} /> You are owed by this group
                </p>
              </>
            ) : currentUserBalance < -0.01 ? (
              <>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  -{INR.format(Math.abs(currentUserBalance))}
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

          {/* Members */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
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
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <button onClick={() => setShowAddMember(true)} className="text-primary hover:underline cursor-pointer">Add Member</button>
                {isCreator && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <button onClick={() => setShowInviteModal(true)} className="text-primary hover:underline cursor-pointer">Invite Friends</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-5">

          {/* LEFT: TABS + CONTENT */}
          <div className="space-y-4">
            {/* Tab bar — horizontally scrollable on mobile */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-sm w-max min-w-full sm:w-fit">
                {tabs.map(({ key, label, icon: Icon }) => (
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
                <button onClick={() => setActiveTab("balances")}
                  className={`lg:hidden flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "balances"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}>
                  <Wallet2 size={13} />
                  <span>Balances</span>
                </button>
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
                              <span className="font-bold text-sm text-foreground">{INR.format(exp.amount)}</span>
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
                    <p className="text-xs text-muted-foreground mt-0.5">Breakdown by payer — tap to expand</p>
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
                              <span className="font-bold text-foreground text-sm shrink-0">{INR.format(payer.total)}</span>
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
                                          <span className="text-xs font-bold text-foreground shrink-0">{INR.format(exp.amount)}</span>
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

              {/* Balances — mobile only */}
              {activeTab === "balances" && (
                <motion.div key="balances" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="space-y-4 lg:hidden">
                  <BalancesCard balances={balances} onSettle={handleRecordSettlement} />
                  <MembersCard group={group} isCreator={isCreator}
                    onAdd={() => setShowAddMember(true)}
                    onInvite={() => setShowInviteModal(true)}
                    onRemove={handleRemove} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="hidden lg:flex flex-col gap-5">
            <BalancesCard balances={balances} onSettle={handleRecordSettlement} />
            <MembersCard group={group} isCreator={isCreator}
              onAdd={() => setShowAddMember(true)}
              onInvite={() => setShowInviteModal(true)}
              onRemove={handleRemove} />
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
    </div>
  );
}

/* ── Group Balances sidebar card ── */
function BalancesCard({ balances, onSettle }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-base text-foreground">Group Balances</h3>
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </span>
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
                  {isUp ? `+₹${Math.abs(bal).toFixed(0)}` : isDown ? `-₹${Math.abs(bal).toFixed(0)}` : "Settled"}
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
          {balances.suggestions.map((s, i) => (
            <div key={i} className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2.5">
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-rose-600 dark:text-rose-400">{s.from.name}</span>
                <span className="text-muted-foreground"> owes </span>
                <span className="font-bold text-foreground">₹{s.amount.toFixed(0)}</span>
                <span className="text-muted-foreground"> to </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.to.name}</span>
              </p>
              <button onClick={() => onSettle(s.from, s.to, s.amount)}
                className="w-full flex items-center justify-center gap-1.5 border border-primary/25 text-primary hover:bg-primary/8 font-semibold py-2 rounded-lg text-xs transition cursor-pointer">
                <CheckCircle size={13} /> Record Settlement
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Members sidebar card ── */
function MembersCard({ group, isCreator, onAdd, onInvite, onRemove }) {
  const creatorId = String(group.createdBy?._id || group.createdBy);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-bold text-base text-foreground">Members ({group.members?.length || 0})</h3>
      </div>

      <div className="divide-y divide-border">
        {group.members?.map((m) => {
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
                  <button type="button" onClick={() => onRemove(m._id)}
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
