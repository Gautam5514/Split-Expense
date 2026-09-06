"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { X, Wallet2, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const memberId = (m) => String(m?._id || m?.id || "");

const equalShares = (total, ids) => {
  if (!ids.length || !Number.isFinite(total)) return {};
  const share = Number((total / ids.length).toFixed(2));
  const next = {};
  ids.forEach((id) => {
    next[id] = share;
  });
  const sum = Number((share * ids.length).toFixed(2));
  const last = ids[ids.length - 1];
  next[last] = Number((next[last] + (total - sum)).toFixed(2));
  return next;
};

const mapServerFieldErrors = (data) => {
  const fieldMap = {};
  if (!data || typeof data !== "object") return fieldMap;
  if (data.field && data.message) fieldMap[data.field] = data.message;
  if (data.errors && typeof data.errors === "object" && !Array.isArray(data.errors)) {
    Object.entries(data.errors).forEach(([key, val]) => {
      fieldMap[key] = typeof val === "string" ? val : val?.message || String(val);
    });
  }
  if (Array.isArray(data.errors)) {
    data.errors.forEach((item) => {
      if (item?.field) fieldMap[item.field] = item.message || "Invalid value.";
    });
  }
  if (fieldMap.payer && !fieldMap.paidBy) fieldMap.paidBy = fieldMap.payer;
  if (fieldMap.participant && !fieldMap.participants) fieldMap.participants = fieldMap.participant;
  return fieldMap;
};

export default function AddExpenseModal({ group, onClose, onSuccess }) {
  const members = group?.members || [];
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [paidBy, setPaidBy] = useState("");
  const [participantIds, setParticipantIds] = useState([]);
  const [shares, setShares] = useState({});
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const ids = members.map(memberId).filter(Boolean);
    setParticipantIds(ids);
    setPaidBy((prev) => (prev && ids.includes(prev) ? prev : ids[0] || ""));
  }, [group]);

  useEffect(() => {
    const total = parseFloat(amount);
    setShares(equalShares(Number.isFinite(total) ? total : 0, participantIds));
  }, [amount, participantIds]);

  const clearError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

  const toggleParticipant = (id) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    clearError("participants");
    clearError("splits");
  };

  const validate = () => {
    const e = {};
    if (!description.trim()) e.description = "Description is required.";
    else if (description.trim().length > 200) e.description = "Description must be under 200 characters.";
    if (!amount && amount !== 0) e.amount = "Amount is required.";
    else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) e.amount = "Amount must be a positive number.";
    else if (parseFloat(amount) > 9999999) e.amount = "Amount exceeds the maximum limit of ₹99,99,999.";
    if (!paidBy) e.paidBy = "Select who paid.";
    if (!participantIds.length) e.participants = "Select at least one participant.";
    const total = parseFloat(amount);
    if (!e.amount && participantIds.length) {
      const splitSum = participantIds.reduce((s, id) => s + Number(shares[id] || 0), 0);
      if (Math.abs(splitSum - total) > 0.01) {
        e.splits = `Split amounts must sum to ${total.toFixed(2)} (currently ${splitSum.toFixed(2)}).`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
    if (!validate()) return;

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

      const exactSplits = participantIds.map((id) => ({
        userId: id,
        share: Number(shares[id] || 0),
      }));

      await api.post("/expenses", {
        groupId: group._id,
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy,
        participants: participantIds,
        splitType: "exact",
        exactSplits,
        category,
        fileUrl,
      });

      toast.success("Expense added successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const fieldErrors = mapServerFieldErrors(data);
      if (status >= 400 && status < 500 && Object.keys(fieldErrors).length) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      } else {
        toast.error(data?.message || err?.message || "Failed to add expense");
      }
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4"
      >
        {/* Main Modal Box */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full sm:max-w-2xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden max-h-[92dvh] overflow-y-auto"
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 sm:p-6 border-b bg-gradient-to-r from-cyan-50 via-teal-50 to-sky-50 dark:from-cyan-950 dark:via-teal-950 dark:to-sky-950 border-border">
            <div className="flex items-center gap-2 mb-1">
              <Wallet2 className="text-primary" size={22} />
              <h2 className="text-xl font-semibold text-foreground">
                Add New Expense
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Split among members of{" "}
              <span className="font-medium text-primary">{group?.name}</span>.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Row 1 - Description + Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="E.g. Dinner, Cab Ride"
                  className={`w-full bg-input border rounded-lg p-3 text-foreground shadow-sm focus:outline-none focus:ring-2 ${errors.description ? "border-red-500 focus:ring-red-500" : "border-input focus:ring-primary"}`}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError("description"); }}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className={`w-full bg-input border rounded-lg p-3 text-foreground shadow-sm focus:outline-none focus:ring-2 ${errors.amount ? "border-red-500 focus:ring-red-500" : "border-input focus:ring-primary"}`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); clearError("amount"); clearError("splits"); }}
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>
            </div>

            {/* Payer */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Paid by
              </label>
              <select
                className={`w-full bg-input border rounded-lg p-3 text-foreground shadow-sm focus:outline-none focus:ring-2 ${errors.paidBy ? "border-red-500 focus:ring-red-500" : "border-input focus:ring-primary"}`}
                value={paidBy}
                onChange={(e) => { setPaidBy(e.target.value); clearError("paidBy"); }}
              >
                <option value="">Select payer</option>
                {members.map((m) => (
                  <option key={memberId(m)} value={memberId(m)}>
                    {m.name || m.email || "Member"}
                  </option>
                ))}
              </select>
              {errors.paidBy && <p className="text-red-500 text-xs mt-1">{errors.paidBy}</p>}
            </div>

            {/* Participants + split amounts */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Split between
              </label>
              <div className={`space-y-2 rounded-lg border p-3 ${errors.participants || errors.splits ? "border-red-500" : "border-input"}`}>
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No members in this group.</p>
                ) : (
                  members.map((m) => {
                    const id = memberId(m);
                    const checked = participantIds.includes(id);
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <label className="flex items-center gap-2 flex-1 min-w-0 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(id)}
                          />
                          <span className="truncate">{m.name || m.email || "Member"}</span>
                        </label>
                        {checked && (
                          <input
                            type="number"
                            step="0.01"
                            aria-label={`Split amount for ${m.name || m.email || "member"}`}
                            className="w-28 bg-input border border-input rounded-lg p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            value={shares[id] ?? ""}
                            onChange={(e) => {
                              setShares((prev) => ({ ...prev, [id]: e.target.value }));
                              clearError("splits");
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {errors.participants && <p className="text-red-500 text-xs mt-1">{errors.participants}</p>}
              {errors.splits && <p className="text-red-500 text-xs mt-1">{errors.splits}</p>}
            </div>

            {/* Row 2 - Category + File Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
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
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90 transition disabled:opacity-60"
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
