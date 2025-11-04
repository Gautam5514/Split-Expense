"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import MemberPicker from "@/components/MemberPicker";
import AddExpenseModal from "@/components/AddExpenseModal";
import { Users, ArrowLeft, Loader2, Wallet2, Star, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      toast.success(`Added ${emails.length} member${emails.length > 1 ? "s" : ""}`);
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
              <Star size={14} className="text-yellow-400" />
              Created by{" "}
              <span className="text-emerald-400 font-medium">
                {group.createdBy?.name || "You"}
              </span>
            </p>
          </div>
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Members Section */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-400">
              <Users size={18} /> Group Members
            </h2>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
            >
              <Wallet2 size={16} /> Add Expense
            </button>
          </div>

          {group.members?.length ? (
            <ul className="divide-y divide-gray-800">
              {group.members.map((m) => (
                <li
                  key={m._id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-gray-800/40 rounded-lg transition-all"
                >
                  <div>
                    <p className="font-medium text-gray-100">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </div>
                  {String(group.createdBy?._id) === String(m._id) ? (
                    <span className="text-xs text-yellow-400 font-medium">
                      (Creator)
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemove(m._id)}
                      className="text-xs border border-red-600/40 text-red-400 px-3 py-1 rounded-lg hover:bg-red-600/10 transition-all"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No members yet.</p>
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

        {/* Expenses Section */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-400 mb-4">
            Group Expenses
          </h2>
          {expenses.length === 0 ? (
            <p className="text-gray-500 text-sm">No expenses yet. Add one!</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <motion.div
                  key={exp._id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="flex justify-between items-center bg-gray-800/70 hover:bg-gray-800 p-4 rounded-lg transition-all"
                >
                  <div>
                    <p className="font-medium text-white">{exp.description}</p>
                    <p className="text-xs text-gray-400">
                      Paid by {exp.paidBy?.name || "Unknown"} — ₹{exp.amount}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 uppercase">
                    {exp.category}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Balances Section */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-pink-400 mb-4">Balances</h2>
          {balances?.balances?.length ? (
            <div className="space-y-2">
              {balances.balances.map((b) => (
                <div
                  key={b.userId}
                  className="flex justify-between items-center bg-gray-800/70 p-3 rounded-lg text-sm"
                >
                  <span className="text-gray-300">{b.name}</span>
                  <span
                    className={`font-medium ${
                      b.balance > 0
                        ? "text-green-400"
                        : b.balance < 0
                        ? "text-red-400"
                        : "text-gray-500"
                    }`}
                  >
                    {b.balance > 0
                      ? `+₹${b.balance}`
                      : b.balance < 0
                      ? `-₹${Math.abs(b.balance)}`
                      : "Settled"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No balances yet.</p>
          )}

          {/* Settlement Suggestions */}
          {balances?.suggestions?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-3 text-emerald-400">
                💡 Settlement Suggestions
              </h3>
              <div className="space-y-2">
                {balances.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/70 p-3 rounded-lg text-sm text-gray-200"
                  >
                    <b className="text-red-400">{s.from.name}</b> should pay{" "}
                    <b className="text-emerald-400">₹{s.amount}</b> to{" "}
                    <b className="text-blue-400">{s.to.name}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
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
