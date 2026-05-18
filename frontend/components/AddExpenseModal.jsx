"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Wallet2, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddExpenseModal({ group, onClose, onSuccess }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
    });

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount)
      return toast.error("Please fill all required fields.");

    if (parseFloat(amount) <= 0)
      return toast.error("Amount must be greater than zero.");

    try {
      setLoading(true);
      let fileUrl = null;

      if (file) {
        const base64 = await toBase64(file);

        const uploadRes = await api.post("/upload", {
          file: base64,
          folder: "splitwise_receipts",
          resourceType: "auto",
        });

        fileUrl = uploadRes.data?.url;
        if (!fileUrl) throw new Error("Upload failed");
      }

      await api.post("/expenses", {
        groupId: group._id,
        description: description.trim(),
        amount: parseFloat(amount),
        splitType: "equal",
        category,
        fileUrl,
      });

      toast.success("Expense added successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Fullscreen Modal Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        {/* Main Modal Box */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 25 }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
          className="relative w-full max-w-3xl bg-card border border-border rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X size={22} />
          </button>

          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-border">
            <div className="flex items-center gap-2 mb-1">
              <Wallet2 className="text-primary" size={22} />
              <h2 className="text-xl font-semibold text-foreground">
                Add New Expense
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Split equally among members of{" "}
              <span className="font-medium text-primary">{group?.name}</span>.
            </p>
          </div>

          {/* Form - NO scrolling, compact layout */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Row 1 - Description + Amount */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="E.g. Dinner, Cab Ride"
                  className="w-full bg-input border border-input rounded-lg p-3 text-foreground 
                  shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full bg-input border border-input rounded-lg p-3 text-foreground 
                  shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2 - Category + File Upload */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Category
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-input border border-input rounded-lg p-3 text-foreground 
                    shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="general">General</option>
                    <option value="food">Food</option>
                    <option value="travel">Travel</option>
                    <option value="stay">Stay</option>
                    <option value="shopping">Shopping</option>
                    <option value="bills">Bills</option>
                  </select>
                  <span className="absolute right-3 top-3 text-muted-foreground">▼</span>
                </div>
              </div>

              {/* Upload */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Upload Bill / Receipt (optional)
                </label>

                <div className="flex flex-col items-center justify-center border border-input rounded-lg p-4 bg-muted hover:border-primary/50 transition cursor-pointer">
                  <ImageIcon size={20} className="text-muted-foreground mb-2" />

                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="text-sm text-muted-foreground"
                  />

                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="mt-3 rounded-lg max-h-40 object-contain border border-border shadow-sm"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground border border-input rounded-lg hover:bg-muted transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> Uploading...
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
