"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import MemberPicker from "@/components/MemberPicker";
import AddExpenseModal from "@/components/AddExpenseModal";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GroupBalanceSection from "../../../components/GroupBalanceSection";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";

const categoryIcons = {
  food: Utensils,
  travel: Bus,
  shopping: ShoppingBag,
  gift: Gift,
  bills: CreditCard,
  rent: Home,
  coffee: Coffee,
  misc: FileText,
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
  const [selectedOcr, setSelectedOcr] = useState(null);
  const [expandedPayerId, setExpandedPayerId] = useState(null);

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

  const goBack = () => router.back();
  const goToChat = () => router.push(`/groupchat?groupId=${groupId}`);

  // Loading State
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
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 md:px-10 space-y-10">

      {/* 🌈 PREMIUM GRADIENT HEADER */}
      <div className="max-w-8xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border border-border p-8 rounded"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-700 bg-clip-text text-transparent">
                {group.name}
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                <StarIcon size={14} className="text-yellow-500" />
                Created by{" "}
                <span className="text-primary font-medium">
                  {group.createdBy?.name || "You"}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Group Chat */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={goToChat}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 cursor-pointer text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl shadow-md transition-all"
              >
                <MessageCircleMore size={16} />
                Group Chat
              </motion.button>

              {isCreator && (
                <button
                  type="button"
                  onClick={handleDeleteTrip}
                  className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 cursor-pointer transition-colors"
                >
                  <Trash2 size={16} />
                  Delete Trip
                </button>
              )}

              {/* Back */}
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors"
              >
                <ArrowLeftCircle size={16} /> Back
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 🟦 MEMBERS SECTION */}
      <section className="max-w-8xl mx-auto bg-card border border-border rounded p-7 ">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Users2 size={18} /> Group Members
          </h2>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 bg-primary cursor-pointer hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
          >
            <Wallet2 size={16} /> Add Expense
          </button>
        </div>

        {group.members?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {group.members.map((m) => (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="relative group bg-muted border border-border hover:border-primary/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Avatar */}
                {m.photoURL ? (
                  <img
                    src={m.photoURL}
                    className="w-12 h-12 rounded-full object-cover border border-border shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                <div className="mt-3 truncate">
                  <p className="text-foreground font-medium text-sm">
                    {m.name || "Unnamed User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>

                {/* Creator Badge */}
                {String(group.createdBy?._id) === String(m._id) ? (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Creator
                  </span>
                ) : (
                  <button
                    onClick={() => handleRemove(m._id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            No members yet. Add some!
          </div>
        )}
      </section>

      {/* 🟩 ADD MEMBERS SECTION */}
      <section className="max-w-8xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-purple-600 flex items-center gap-2">
            <PlusCircle size={18} /> Add Members
          </h2>
          {adding && <span className="text-xs text-muted-foreground">Adding…</span>}
        </div>

        <MemberPicker
          groupId={groupId}
          exclude={group.members.map((m) => m.email)}
          onSubmit={(selectedEmails) => handleAddMembers(selectedEmails)}
        />
      </section>

      {/* 🟧 EXPENSE LIST */}
      <section className="max-w-8xl mx-auto bg-card border border-border rounded p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
              <Wallet2 size={18} /> Spend Owners
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Click a spender to view each place and amount.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {expenses.length} {expenses.length === 1 ? "record" : "records"}
            </span>
            <span className="font-semibold text-foreground">
              {expenseSummary.currency.format(expenseSummary.total)}
            </span>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center text-primary">
              <Receipt size={22} />
            </div>
            <p className="text-muted-foreground text-sm">No expenses yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_0.8fr_40px] gap-4 bg-muted/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Spend owner</span>
              <span>Total spent</span>
              <span>Entries</span>
              <span></span>
            </div>

            <div className="divide-y divide-border">
              {expenseSummary.payers.map((payer) => {
                const isOpen = expandedPayerId === payer.id;
                const firstLetter = payer.name.charAt(0).toUpperCase();
                return (
                  <div key={payer.id} className="bg-card">
                    <button
                      type="button"
                      onClick={() => setExpandedPayerId(isOpen ? null : payer.id)}
                      className="w-full grid grid-cols-1 gap-4 px-4 py-4 text-left transition hover:bg-muted/60 md:grid-cols-[1.4fr_0.8fr_0.8fr_40px] md:items-center md:px-5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {firstLetter || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {payer.name}
                          </p>
                          {payer.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {payer.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground md:hidden">
                          Total spent
                        </p>
                        <p className="font-semibold text-foreground">
                          {expenseSummary.currency.format(payer.total)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground md:hidden">
                          Entries
                        </p>
                        <p className="text-sm text-muted-foreground">
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
                          className="overflow-hidden border-t border-border bg-muted/30"
                        >
                          <div className="px-4 py-4 md:px-5">
                            <div className="space-y-2">
                              {payer.items.map((exp) => {
                                const key = exp.category?.toLowerCase() || "misc";
                                const Icon = categoryIcons[key] || FileText;

                                return (
                                  <div
                                    key={exp._id}
                                    className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm md:grid-cols-[1fr_auto_auto] md:items-center"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-primary">
                                        <Icon size={16} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">
                                          {exp.description}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                          <CalendarDays size={13} />
                                          {exp.date
                                            ? expenseSummary.date.format(new Date(exp.date))
                                            : "No date"}
                                        </p>
                                      </div>
                                    </div>

                                    <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium uppercase text-muted-foreground">
                                      {exp.category || "misc"}
                                    </span>

                                    <div className="flex items-center justify-between gap-3 md:justify-end">
                                      <span className="text-sm font-semibold text-foreground">
                                        {expenseSummary.currency.format(Number(exp.amount) || 0)}
                                      </span>

                                      {exp.ocrText && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedOcr(exp);
                                            setShowOcrModal(true);
                                          }}
                                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
                                          aria-label={`View receipt for ${exp.description}`}
                                        >
                                          <Eye size={17} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 🟦 BALANCE SECTION */}
      <GroupBalanceSection balances={balances} />

      {/* 📝 NOTEPAD */}
      <NotepadSection groupId={groupId} />

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

      {/* OCR MODAL */}
      <AnimatePresence>
        {showOcrModal && selectedOcr && (
          <OcrViewModal
            ocrText={selectedOcr.ocrText}
            imageUrl={selectedOcr.imageUrl}
            onClose={() => setShowOcrModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
