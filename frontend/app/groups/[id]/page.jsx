"use client";

import { useEffect, useState, useMemo, createElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import AddPeopleModal from "@/components/people/AddPeopleModal";
import PendingMembers from "@/components/group/PendingMembers";
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
  CheckCircle2,
  UserPlus,
  Zap,
  Wallet2,
  Clock,
  Copy,
  Download,
  Check,
  Plus,
  Settings2,
  Smartphone,
  LogOut,
  Camera,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";
import Loader3D from "@/components/Loader3D";
import socket, { connectSocket } from "@/lib/socket";
import { formatMoney } from "@/lib/formatCurrency";
import GroupAvatarEditor from "@/components/group/GroupAvatarEditor";
import { getGroupIcon } from "@/lib/groupIcons";
import { groupTypeMeta, categoryMeta } from "@/lib/groupPresets";
import GroupTypeCard from "@/components/group/GroupTypeCard";
import GroupSettingsModal from "@/components/group/GroupSettingsModal";
import CategoryBreakdown from "@/components/group/CategoryBreakdown";

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
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null); // { id, name } | null
  const [selectedOcr, setSelectedOcr] = useState(null);
  const [expandedPayerId, setExpandedPayerId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 1024); }, []);
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "balances" : "feed"
  );
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingMembers, setPendingMembers] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  // Type card data (budget, month totals, bills, missing receipts...)
  const fetchSummary = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/summary`);
      setSummary(res.data);
    } catch {
      // Non-critical - the type card just stays in its loading state.
    }
  };

  // Creator-only list of invites waiting to be accepted + join requests.
  const fetchPendingMembers = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/invites`);
      setPendingMembers(res.data);
    } catch {
      setPendingMembers(null);
    }
  };

  const handleLeave = async () => {
    try {
      await api.post(`/groups/${groupId}/leave`);
      toast.success("You left the group");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't leave the group");
    } finally {
      setShowLeaveConfirm(false);
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
    fetchSummary();
    fetchPendingMembers();
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
      fetchSummary();
    };
    socket.on("settlementUpdate", onSettlementUpdate);
    return () => {
      socket.off("settlementUpdate", onSettlementUpdate);
      socket.emit("leaveGroup", groupId);
    };
  }, [groupId, token]);

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
    toast.success("Expense added!");
    setShowExpenseModal(false);
    fetchExpenses();
    fetchBalances();
    fetchSummary();
  };

  // A debtor's "I paid" only files a claim - the creditor has to confirm it
  // (see handleConfirmSettlement below), so nobody can mark their own debt
  // paid. A creditor's "I received it" settles right away.
  const handleRequestSettlement = async (fromUser, toUser, amount, method, note) => {
    try {
      const { data } = await api.post("/expenses/settle/request", {
        groupId,
        fromUserId: fromUser.userId,
        toUserId: toUser.userId,
        amount: Number(amount),
        method,
        note,
      });
      if (data?.status === "confirmed") {
        // Creditor recorded "I received it" - the server settles it straight away.
        toast.success("Marked as received. Balances updated.");
        fetchExpenses();
        fetchBalances();
        fetchSummary();
      } else {
        toast.success("Settlement request sent - waiting for their confirmation.");
      }
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
      fetchSummary();
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
      toast.success("Group deleted");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete group");
    } finally {
      setShowDeleteConfirm(false);
    }
  };


  const handleMarkCompleted = async () => {
    try {
      await api.put(`/groups/${groupId}/complete`, {});
      toast.success("Marked as completed!");
      fetchGroup();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to mark as completed");
    }
  };

  if (loading) {
    return <Loader3D message="Opening group..." />;
  }

  if (!group) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="text-muted-foreground mb-4">Group not found.</p>
        <button onClick={() => router.push("/dashboard")} className="text-primary underline text-sm cursor-pointer">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const typeMeta = groupTypeMeta(group.groupType);
  const currency = group.settings?.currency || "INR";
  const money = (v) => formatMoney(v, currency);
  const fmtRange = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
  const typeSubline = [
    typeMeta.label,
    group.groupType === "trip" && group.trip?.startDate
      ? `${fmtRange.format(new Date(group.trip.startDate))}${group.trip?.endDate ? ` – ${fmtRange.format(new Date(group.trip.endDate))}` : ""}`
      : null,
  ].filter(Boolean).join(" · ");

  const tabs = [
    { key: "feed", label: "Expenses", icon: Receipt },
    { key: "breakdown", label: "Insights", icon: TrendingUp },
    // { key: "notes", label: "Shared Notes", icon: BookOpen },
  ];

  // What an expense means for me: "you owe ₹x" / "you lent ₹x".
  const myImpact = (exp) => {
    if (!meId) return null;
    const myShare = (exp.splits || []).reduce(
      (a, s) => a + (String(s.userId?._id || s.userId) === String(meId) ? Number(s.share) || 0 : 0), 0);
    const myPaid = exp.payers?.length
      ? exp.payers.reduce((a, p) => a + (String(p.userId?._id || p.userId) === String(meId) ? Number(p.amount) || 0 : 0), 0)
      : String(exp.paidBy?._id) === String(meId) ? Number(exp.amount) || 0 : 0;
    const net = myPaid - myShare;
    if (Math.abs(net) < 0.01) return myShare > 0 ? { text: "settled", tone: "muted" } : { text: "not involved", tone: "muted" };
    return net > 0 ? { text: `you lent ${money(net)}`, tone: "up" } : { text: `you owe ${money(-net)}`, tone: "down" };
  };
  const payerLabel = (exp) =>
    exp.payers?.length > 1
      ? `${exp.payers.length} people paid`
      : `${String(exp.paidBy?._id) === String(meId) ? "You" : exp.paidBy?.name || "Someone"} paid`;

  const displayedExpenses = expenses.length > 10 && !showAllExpenses ? expenses.slice(0, 9) : expenses;

  return (
    <div className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-32 sm:pb-12 px-3 sm:px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className={`bg-card border border-border rounded-2xl px-3 py-3 sm:px-5 sm:py-4 shadow-sm ${group.isCompleted ? "opacity-80" : ""}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="Back to groups"
              className="shrink-0 w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>

            {(() => {
              const GroupIcon = getGroupIcon(group.icon) || typeMeta.Icon;
              return (
                <button
                  type="button"
                  onClick={() => isCreator && setShowIconPicker(true)}
                  title={isCreator ? "Change group photo or icon" : undefined}
                  aria-label={isCreator ? "Change group photo or icon" : undefined}
                  className={`relative shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden ${
                    isCreator ? "cursor-pointer group/avatar" : "cursor-default"
                  }`}
                  style={group.photo?.url ? undefined : { background: `linear-gradient(135deg, ${typeMeta.accent[0]}, ${typeMeta.accent[1]})` }}
                >
                  {group.photo?.url ? (
                    <Image src={group.photo.url} alt="" width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    createElement(GroupIcon, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white", strokeWidth: 2.2 })
                  )}
                  {isCreator && (
                    <span className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition flex items-center justify-center">
                      <Camera size={16} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })()}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold text-foreground leading-tight truncate">
                  {group.name}
                </h1>
                {group.isCompleted && (
                  <span className="hidden sm:inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    Completed
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1 font-semibold text-primary truncate">
                  {createElement(typeMeta.Icon, { size: 11, className: "shrink-0" })}
                  <span className="truncate">{typeSubline}</span>
                </span>
                <span className="shrink-0">·</span>
                <button type="button" onClick={() => setShowMembersModal(true)} className="shrink-0 hover:text-foreground transition cursor-pointer">
                  {group.members?.length || 0} member{group.members?.length !== 1 ? "s" : ""}
                </button>
              </p>
            </div>

            {/* Actions: Chat + everything else in one menu */}
            <div className="shrink-0 flex items-center gap-1.5">
              <button
                onClick={() => router.push(`/groupchat?groupId=${groupId}`)}
                aria-label="Group chat"
                className="flex items-center justify-center gap-1.5 h-10 w-10 sm:h-9 sm:w-auto sm:px-3.5 rounded-full text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition cursor-pointer"
              >
                <MessageCircleMore size={16} />
                <span className="hidden sm:inline">Chat</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu((v) => !v)}
                  aria-label="More options"
                  aria-expanded={showMenu}
                  className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  <MoreHorizontal size={18} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-2xl border border-border bg-card shadow-xl p-1.5" role="menu">
                      {[
                        isCreator && { label: "Group settings", Icon: Settings2, onClick: () => setShowSettings(true) },
                        isCreator && { label: "Photo & icon", Icon: Camera, onClick: () => setShowIconPicker(true) },
                        { label: "Members", Icon: Users, onClick: () => setShowMembersModal(true) },
                        isCreator && !group.isCompleted && { label: "Mark as completed", Icon: CheckCircle2, onClick: handleMarkCompleted },
                        !isCreator && meId && { label: "Leave group", Icon: LogOut, onClick: () => setShowLeaveConfirm(true), danger: true },
                        isCreator && { label: "Delete group", Icon: Trash2, onClick: () => setShowDeleteConfirm(true), danger: true },
                      ].filter(Boolean).map(({ label, Icon, onClick, danger }) => (
                        <button key={label} type="button" role="menuitem"
                          onClick={() => { setShowMenu(false); onClick(); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition cursor-pointer ${
                            danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"}`}>
                          <Icon size={15} className={danger ? "" : "text-muted-foreground"} /> {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MY BALANCE + TYPE CARD ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {(() => {
            const canSettle = balances?.suggestions?.some((s) => String(s.from.userId) === String(meId) || String(s.to.userId) === String(meId));
            const up = currentUserBalance > 0.01;
            const down = currentUserBalance < -0.01;
            return (
              <div className="bg-card border border-border rounded-2xl p-3 md:p-4 shadow-sm flex items-center justify-between gap-3 md:flex-col md:items-start md:justify-start">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Your balance</p>
                  <p className={`text-xl font-black mt-0.5 md:mt-1 truncate ${
                    up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                    {up ? `+${money(Math.abs(currentUserBalance))}` : down ? `-${money(Math.abs(currentUserBalance))}` : "Settled up"}
                  </p>
                  <p className={`text-[11px] mt-1 md:mt-1.5 flex items-center gap-1 ${
                    up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-rose-600 dark:text-rose-400" : "text-primary"}`}>
                    {up ? <><ArrowUpRight size={11} /> You get back</> : down ? <><ArrowDownLeft size={11} /> You owe</> : <><CheckCircle size={11} /> Nothing pending</>}
                  </p>
                </div>
                {canSettle && (
                  <button type="button"
                    onClick={() => { if (isMobile) setActiveTab("balances"); else document.getElementById("group-balances")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="shrink-0 h-8 px-3.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition cursor-pointer md:mt-2">
                    Settle up
                  </button>
                )}
              </div>
            );
          })()}
          <div className="md:col-span-2">
            <GroupTypeCard
              group={group}
              summary={summary}
              isCreator={isCreator}
              onOpenSettings={() => setShowSettings(true)}
            />
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">

          {/* LEFT: TABS + CONTENT */}
          <div className="min-w-0 space-y-4">

            {/* Tab bar */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1 bg-card border border-border rounded-2xl p-1 shadow-sm w-max min-w-full lg:min-w-0 lg:w-fit">

                {/* Group Balance - mobile only, FIRST position */}
                <button onClick={() => setActiveTab("balances")}
                  className={`lg:hidden flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "balances"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}>
                  <Wallet2 size={13} />
                  <span>Balances</span>
                </button>

                {/* Expenses Log + Spend Owners - always shown */}
                {tabs.filter(t => t.key !== "notes").map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 lg:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
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
                  <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-base text-foreground">Expenses</h3>
                    <button onClick={() => setShowExpenseModal(true)}
                      className="hidden lg:flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition cursor-pointer">
                      <PlusCircle size={14} /> Add Expense
                    </button>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
                        <Receipt className="text-primary/50" size={22} />
                      </div>
                      <p className="font-semibold text-foreground text-sm">No expenses recorded</p>
                      <p className="text-xs text-muted-foreground mt-1">Add your first expense - just the amount and what it was for.</p>
                      <button onClick={() => setShowExpenseModal(true)}
                        className="mt-4 inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition cursor-pointer">
                        <Plus size={14} /> Add expense
                      </button>
                    </div>
                  ) : (
                    <>
                      {displayedExpenses.map((exp, idx) => {
                        const isSettlementRow = exp.isSettlement || exp.description?.toLowerCase().startsWith("settlement");
                        if (isSettlementRow) {
                          return (
                            <div key={exp._id}
                              className={`flex items-center gap-3 px-4 sm:px-6 py-3 transition ${
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
                                <span className="font-bold text-sm text-emerald-500">{money(exp.amount)}</span>
                              </div>
                            </div>
                          );
                        }
                        const Icon = categoryMeta(exp.category?.toLowerCase()).Icon || FileText;
                        const impact = myImpact(exp);
                        return (
                          <div key={exp._id}
                            className={`flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-muted/25 transition ${
                              idx < displayedExpenses.length - 1 ? "border-b border-border" : ""
                            }`}>
                            <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center shrink-0 text-primary">
                              <Icon size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">{exp.description}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {payerLabel(exp)} · {fmtDate.format(new Date(exp.date))}
                                {exp.currency && ` · ${formatMoney(exp.originalAmount, exp.currency)}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {exp.notes && (
                                <span title={exp.notes} className="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground max-w-[120px] truncate">
                                  {exp.notes}
                                </span>
                              )}
                              {exp.ocrText && (
                                <button type="button"
                                  onClick={() => { setSelectedOcr(exp); setShowOcrModal(true); }}
                                  className="text-muted-foreground hover:text-primary p-1 rounded cursor-pointer transition">
                                  <Eye size={13} />
                                </button>
                              )}
                              <div className="text-right">
                                <span className="block font-bold text-sm text-foreground">{money(exp.amount)}</span>
                                {impact && (
                                  <span className={`block text-[10px] font-semibold ${
                                    impact.tone === "up" ? "text-emerald-600 dark:text-emerald-400"
                                    : impact.tone === "down" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                                    {impact.text}
                                  </span>
                                )}
                              </div>
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
                  {summary?.byCategory?.length > 0 && (
                    <div className="border-b border-border">
                      <div className="px-4 sm:px-6 pt-4">
                        <h3 className="font-bold text-base text-foreground">Where the money went</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {money(summary.total)} across {summary.count} expense{summary.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <CategoryBreakdown rows={summary.byCategory} currency={currency} />
                    </div>
                  )}
                  <div className="px-4 sm:px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-base text-foreground">Who paid</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">By payer - tap to expand</p>
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
                              className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-muted/25 transition cursor-pointer">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                {payer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">{payer.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {payer.items.length} expense{payer.items.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <span className="font-bold text-foreground text-sm shrink-0">{money(payer.total)}</span>
                              <ChevronDown size={16}
                                className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
                                  exit={{ height: 0 }} transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-border">
                                  <div className="pl-4 sm:pl-6 pr-4 sm:pr-6 divide-y divide-border">
                                    {payer.items.map((exp) => {
                                      const Icon = categoryMeta(exp.category?.toLowerCase()).Icon || FileText;
                                      return (
                                        <div key={exp._id}
                                          className="flex items-center gap-3 py-3 pl-12">
                                          <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
                                            <Icon size={13} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{exp.description}</p>
                                            <p className="text-[10px] text-muted-foreground">{fmtDate.format(new Date(exp.date))}</p>
                                          </div>
                                          <span className="text-xs font-bold text-foreground shrink-0">{money(exp.amount)}</span>
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
                  className="lg:hidden grid gap-3 md:grid-cols-2 md:items-start">
                  <BalancesCard balances={balances} pendingSettlements={pendingSettlements} meId={meId} currency={currency} groupName={group.name}
                    onRequestSettlement={handleRequestSettlement}
                    onConfirmSettlement={handleConfirmSettlement}
                    onRejectSettlement={handleRejectSettlement}
                    onCancelSettlement={handleCancelSettlement} />
                  <div className="grid gap-3">
                    <MembersCard group={group} isCreator={isCreator}
                      onAdd={() => setShowAddMember(true)}
                      onInvite={() => setShowInviteModal(true)}
                      onRemove={requestRemoveMember}
                      onViewAll={() => setShowMembersModal(true)} />
                    {isCreator && <PendingMembers groupId={groupId} pending={pendingMembers} onChanged={() => { fetchPendingMembers(); fetchGroup(); fetchBalances(); }} />}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* RIGHT SIDEBAR */}
          <div id="group-balances" className="hidden lg:flex flex-col gap-5">
            <BalancesCard balances={balances} pendingSettlements={pendingSettlements} meId={meId} currency={currency} groupName={group.name}
              onRequestSettlement={handleRequestSettlement}
              onConfirmSettlement={handleConfirmSettlement}
              onRejectSettlement={handleRejectSettlement}
              onCancelSettlement={handleCancelSettlement} />
            <MembersCard group={group} isCreator={isCreator}
              onAdd={() => setShowAddMember(true)}
              onInvite={() => setShowInviteModal(true)}
              onRemove={requestRemoveMember}
              onViewAll={() => setShowMembersModal(true)} />
            {isCreator && <PendingMembers groupId={groupId} pending={pendingMembers} onChanged={() => { fetchPendingMembers(); fetchGroup(); fetchBalances(); }} />}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTrip}
        title={`Delete "${group.name}"?`}
        description={`You're about to permanently delete this group. All expenses, notes, group messages, and member data will be removed forever.`}
      />
      <ConfirmDeleteModal
        isOpen={showLeaveConfirm}
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title={`Leave "${group.name}"?`}
        description="You can only leave once you're settled up. You'll need a new invite to come back."
        confirmLabel="Yes, Leave"
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
          <AddExpenseModal group={group} meId={meId} onClose={() => setShowExpenseModal(false)} onSuccess={handleExpenseAdded} />
        )}
      </AnimatePresence>
      {showIconPicker && (
        <GroupAvatarEditor
          group={{ ...group, groupType: group.groupType }}
          onClose={() => setShowIconPicker(false)}
          onChange={(patch) => setGroup((g) => ({ ...g, ...patch }))}
        />
      )}
      {showSettings && (
        <GroupSettingsModal
          group={group}
          hasExpenses={expenses.length > 0}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => { setGroup((g) => ({ ...g, ...updated, members: g.members })); fetchSummary(); }}
        />
      )}
      {/* Mobile: one obvious primary action */}
      {!showExpenseModal && !group.isCompleted && (
        <button type="button" onClick={() => setShowExpenseModal(true)}
          className="lg:hidden fixed right-4 z-40 flex items-center gap-2 pl-4 pr-5 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 cursor-pointer"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}>
          <Plus size={18} /> Add expense
        </button>
      )}
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
          <AddPeopleModal
            groupId={groupId}
            onClose={() => setShowAddMember(false)}
            onShareLink={isCreator ? () => { setShowAddMember(false); setShowInviteModal(true); } : undefined}
            onDone={() => { fetchGroup(); fetchPendingMembers(); fetchBalances(); }}
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
function BalancesCard({ balances, pendingSettlements, meId, currency = "INR", groupName = "", onRequestSettlement, onConfirmSettlement, onRejectSettlement, onCancelSettlement, onAddExpense }) {
  // Group-currency aware versions of the shared formatters.
  const formatCurrency = (v) => formatMoney(v, currency);
  const formatSignedCurrency = (v) => `${Number(v) >= 0 ? "+" : "-"}${formatMoney(Math.abs(Number(v) || 0), currency)}`;
  // upi:// deep link - opens GPay/PhonePe/Paytm with payee + amount filled in.
  const upiLink = (s) =>
    `upi://pay?pa=${encodeURIComponent(s.to.upiId)}&pn=${encodeURIComponent(s.to.name || "")}&am=${Number(s.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`SplitEase: ${groupName}`.slice(0, 50))}`;
  // activeForm holds the suggestion index whose payment-method picker is open
  const [activeForm, setActiveForm] = useState(null);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The suggestion whose payment panel (UPI + QR) is open, or null.
  const [payPanel, setPayPanel] = useState(null);

  const findPendingFor = (s) =>
    pendingSettlements?.find(
      (r) => String(r.fromUserId._id) === String(s.from.userId) && String(r.toUserId._id) === String(s.to.userId)
    );

  // Pending requests that the current user is a party to but which DON'T line
  // up with any smart-settlement suggestion (the greedy debt-minimizer reroutes
  // debt, so a real A->B request often has no A->B suggestion row). Without
  // this, those requests would be invisible - the counterparty could never
  // confirm them and the initiator could never cancel, leaving the debt stuck.
  const shownPendingIds = new Set(
    (balances?.suggestions || [])
      .map((s) => findPendingFor(s))
      .filter(Boolean)
      .map((r) => String(r._id))
  );
  const orphanPending = (pendingSettlements || []).filter((r) => {
    if (shownPendingIds.has(String(r._id))) return false;
    const isParty =
      String(r.fromUserId._id) === String(meId) || String(r.toUserId._id) === String(meId);
    return isParty;
  });

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
                    formatCurrency={formatCurrency}
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
                    receiving={isCreditor}
                    amountLabel={formatCurrency(s.amount)}
                  />
                ) : isDebtor ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {(s.to.upiId || s.to.upiQrUrl) && currency === "INR" && (
                        <button
                          type="button"
                          onClick={() => setPayPanel(s)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                        >
                          <Smartphone size={13} /> Pay {formatCurrency(s.amount)}
                        </button>
                      )}
                      <button
                        onClick={() => openForm(i)}
                        className="shrink-0 flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-semibold py-2 px-3 rounded-lg text-xs transition cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle size={13} /> I&apos;ve Paid
                      </button>
                    </div>
                    {(s.to.upiId || s.to.upiQrUrl) && currency === "INR" && (
                      <p className="text-[10px] text-muted-foreground text-center">After paying, tap &quot;I&apos;ve Paid&quot; so {s.to.name} can confirm.</p>
                    )}
                  </div>
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

      {orphanPending.length > 0 && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Clock size={12} className="text-amber-500" /> Pending Settlements
          </h4>
          {orphanPending.map((pending) => (
            <div key={pending._id} className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2.5">
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {String(pending.fromUserId._id) === String(meId) ? "You" : pending.fromUserId.name}
                </span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {String(pending.toUserId._id) === String(meId) ? "You" : pending.toUserId.name}
                </span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-bold text-foreground">{formatCurrency(pending.amount)}</span>
              </p>
              <PendingSettlementRow
                pending={pending}
                meId={meId}
                formatCurrency={formatCurrency}
                onConfirm={onConfirmSettlement}
                onReject={onRejectSettlement}
                onCancel={onCancelSettlement}
              />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {payPanel && (
          <PaymentPanel
            suggestion={payPanel}
            groupName={groupName}
            formatCurrency={formatCurrency}
            upiLink={upiLink}
            onClose={() => setPayPanel(null)}
            onMarkPaid={() => {
              const idx = balances.suggestions.findIndex(
                (x) => String(x.to.userId) === String(payPanel.to.userId) && String(x.from.userId) === String(payPanel.from.userId)
              );
              setPayPanel(null);
              if (idx >= 0) openForm(idx);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Payment panel: right-slide drawer showing the payee's UPI ID (copy) and
   QR scanner (download), plus a UPI-app deep link. Opened from a debtor's
   "Pay" button. The actual settlement still goes through "I've Paid". ── */
function PaymentPanel({ suggestion: s, groupName, formatCurrency, upiLink, onClose, onMarkPaid }) {
  const [copied, setCopied] = useState(false);
  const hasUpiId = !!s.to.upiId;
  const hasQr = !!s.to.upiQrUrl;

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(s.to.upiId);
      setCopied(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press to copy manually");
    }
  };

  const downloadQr = async () => {
    try {
      const res = await fetch(s.to.upiQrUrl, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(s.to.name || "payee").replace(/\s+/g, "-")}-upi-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in a new tab so the user can long-press / right-click save.
      window.open(s.to.upiQrUrl, "_blank", "noopener");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-sm flex-col bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Pay</p>
            <h2 className="mt-0.5 text-lg font-black tracking-[-0.02em] text-foreground">Send {formatCurrency(s.amount)}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-5">
          {/* Payee summary */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">Paying</p>
            <p className="mt-0.5 text-lg font-black text-foreground">{s.to.name}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {formatCurrency(s.amount)}
            </p>
          </div>

          {/* QR scanner */}
          {hasQr && (
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <QrCode size={13} className="text-cyan-600 dark:text-cyan-400" /> Scan to pay
              </p>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <img src={s.to.upiQrUrl} alt={`${s.to.name} UPI QR`} className="h-52 w-52 rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={downloadQr}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-bold text-foreground transition hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400"
                >
                  <Download size={13} /> Download QR
                </button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                Open any UPI app → Scan → point at this code (or the downloaded image).
              </p>
            </div>
          )}

          {/* UPI ID with copy */}
          {hasUpiId && (
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Wallet2 size={13} className="text-cyan-600 dark:text-cyan-400" /> UPI ID
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2 pl-3.5">
                <span className="flex-1 truncate font-mono text-sm font-semibold text-foreground">{s.to.upiId}</span>
                <button
                  type="button"
                  onClick={copyUpi}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                    copied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* One-tap deep link on mobile browsers */}
          {hasUpiId && (
            <a
              href={upiLink(s)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(8,145,178,0.9)] transition hover:-translate-y-0.5"
            >
              <Smartphone size={15} /> Open UPI app
            </a>
          )}

          {!hasUpiId && !hasQr && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              {s.to.name} hasn&apos;t added a UPI ID or QR yet. Ask them to add one in their profile, or settle in cash.
            </p>
          )}
        </div>

        {/* Footer: confirm they paid → existing settlement request flow */}
        <div className="shrink-0 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onMarkPaid}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            <CheckCircle size={15} /> I&apos;ve Paid {formatCurrency(s.amount)}
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {s.to.name} will get a request to confirm before it&apos;s settled.
          </p>
        </div>
      </motion.div>
    </>
  );
}

/* ── A pending settlement claim on a suggestion row: either "waiting on the
   other party" (if I initiated it) or "confirm/reject" (if I need to act) ── */
function PendingSettlementRow({ pending, meId, formatCurrency, onConfirm, onReject, onCancel }) {
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
function SettlementRequestForm({ method, setMethod, note, setNote, submitting, onSubmit, onCancel, verb, receiving = false, amountLabel = "" }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2.5">
      {receiving && (
        <p className="text-[12px] text-foreground font-semibold leading-snug">
          Are you sure you received {amountLabel}? This will mark it as settled.
        </p>
      )}
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
          {submitting ? (receiving ? "Settling…" : "Sending…") : receiving ? "Yes, I Received It" : "Send Request"}
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
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/8 p-2 rounded-lg transition cursor-pointer lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
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
