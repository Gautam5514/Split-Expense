"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Wallet2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddExpenseModal({ group, onClose, onSuccess }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount)
      return toast.error("Please fill all required fields.");
    if (parseFloat(amount) <= 0)
      return toast.error("Amount must be greater than zero.");

    try {
      setLoading(true);
      await api.post("/expenses", {
        groupId: group._id,
        description: description.trim(),
        amount: parseFloat(amount),
        splitType: "equal",
        category,
      });
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
          className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden text-white"
        >
          {/* Top Bar */}
          <div className="absolute top-3 right-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Wallet2 className="text-indigo-400" size={22} />
              <h2 className="text-xl font-semibold tracking-tight">
                Add New Expense
              </h2>
            </div>
            <p className="text-sm text-gray-400">
              Split equally among members of <span className="text-indigo-400">{group?.name}</span>.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <input
                type="text"
                placeholder="E.g. Dinner, Cab Ride"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Amount (₹)</label>
              <input
                type="number"
                placeholder="Enter amount"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Category</label>
              <div className="relative">
                <select
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="food">Food</option>
                  <option value="travel">Travel</option>
                  <option value="stay">Stay</option>
                  <option value="shopping">Shopping</option>
                </select>
                <span className="absolute right-3 top-3 text-gray-500 pointer-events-none">
                  ▼
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> Adding...
                  </>
                ) : (
                  "Add Expense"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
