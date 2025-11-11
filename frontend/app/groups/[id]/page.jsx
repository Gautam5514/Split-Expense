"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import MemberPicker from "@/components/MemberPicker";
import AddExpenseModal from "@/components/AddExpenseModal";
import {
  ArrowLeft,
  Loader2,
  Wallet2,
  PlusCircle,
  Users2,
  Wallet2Icon,
  ArrowLeftCircle,
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
} from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import GroupBalanceSection from "../../../components/GroupBalanceSection";
import NotepadSection from "@/components/Notepad/NotepadSection";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = useMemo(() => params?.id, [params]);

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Fetch group details
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

  const goBack = () => router.back();

  const goToChat = () => router.push(`/groupchat?groupId=${groupId}`);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-black text-gray-400">
        <Loader2 className="animate-spin mr-2" /> Loading group details…
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-gray-300 bg-black">
        <p className="mb-3">Group not found.</p>
        <button
          className="text-emerald-400 underline flex items-center gap-1"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 py-12 px-4 sm:px-6 md:px-10 space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto space-y-10"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{group.name}</h1>
            <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
              <StarIcon size={14} className="text-yellow-400" />
              Created by{" "}
              <span className="text-emerald-400 font-medium">
                {group.createdBy?.name || "You"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* ✅ New Group Chat Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={goToChat}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
            >
              <MessageCircleMore size={16} />
              Group Chat
            </motion.button>

            <button
              onClick={goBack}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeftCircle size={16} /> Back
            </button>
          </div>
        </div>

        {/* Members Section */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-400">
              <Users2 size={18} /> Group Members
            </h2>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
            >
              <Wallet2Icon size={16} /> Add Expense
            </button>
          </div>

          {/* Members Grid */}
          {group.members?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {group.members.map((m) => (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="relative group bg-gray-800/40 border border-gray-700 hover:border-emerald-600/40 rounded-xl p-4 flex flex-col items-center text-center transition-all"
                >
                  {/* Avatar */}
                  {m.photoURL ? (
                    <img
                      src={m.photoURL}
                      alt={m.name || "User"}
                      className="w-12 h-12 rounded-full object-cover shadow-inner border border-gray-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-700/30 flex items-center justify-center text-emerald-400 font-semibold text-sm shadow-inner">
                      {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}

                  {/* Info */}
                  <div className="mt-3 w-full truncate">
                    <p className="text-gray-100 font-medium text-sm truncate">
                      {m.name || "Unnamed User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  </div>

                  {/* Role / Action */}
                  {String(group.createdBy?._id) === String(m._id) ? (
                    <span className="absolute top-2 right-2 text-[10px] text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded-full">
                      Creator
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemove(m._id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-400"
                      title="Remove member"
                    >
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-8">
              No members yet. Add some to get started!
            </div>
          )}
        </section>

        {/* Add Member Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
              <PlusCircle size={18} /> Add Members
            </h2>
            {adding && <span className="text-xs text-gray-500">Adding…</span>}
          </div>
          <MemberPicker
            groupId={groupId}
            exclude={group.members.map((m) => m.email)}
            onSubmit={(selectedEmails) => handleAddMembers(selectedEmails)}
          />
        </section>

        {/* Group Expenses Section */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-indigo-400">
              <Wallet2 size={18} /> Group Expenses
            </h2>
            <span className="text-xs text-gray-500">
              {expenses.length} {expenses.length === 1 ? "record" : "records"}
            </span>
          </div>

          {/* Empty State */}
          {expenses.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/60 flex items-center justify-center text-indigo-400">
                <Receipt size={22} />
              </div>
              <p className="text-gray-400 text-sm">
                No expenses yet — add your first one!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => {
                const key = exp.category?.toLowerCase() || "misc";
                const Icon = categoryIcons[key] || FileText;

                return (
                  <motion.div
                    key={exp._id}
                    whileHover={{ scale: 1.015 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 border border-gray-700/60 hover:border-emerald-600/40 rounded-xl p-4 transition-all"
                  >
                    {/* Left: Icon + Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-900/60 flex items-center justify-center text-emerald-400 border border-gray-700">
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {exp.description}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          Paid by{" "}
                          <span className="text-emerald-400 font-medium">
                            {exp.paidBy?.name || "Unknown"}
                          </span>{" "}
                          • ₹{exp.amount}
                        </p>
                      </div>
                    </div>

                    {/* Right: Category */}
                    <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 bg-gray-800/60 px-3 py-1 rounded-full border border-gray-700/70">
                      {exp.category || "Misc"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Balances Section */}
        <GroupBalanceSection balances={balances} />

        <NotepadSection groupId={groupId} />
      </motion.div>

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <AddExpenseModal
            group={group}
            onClose={() => setShowExpenseModal(false)}
            onSuccess={handleExpenseAdded}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
