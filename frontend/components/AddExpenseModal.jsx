"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { X, Loader2, ImagePlus, Plus, StickyNote, Trash2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { categoriesForGroup, categoryMeta } from "@/lib/groupPresets";

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

const CURRENCY_SYMBOL = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };

/**
 * Add expense - kept deliberately simple: what it was for, how much, a
 * category and an optional bill photo. You are always the payer (everyone
 * logs what they paid), and the split is the one chosen when the group was
 * created, so there is nothing else to decide here.
 */
export default function AddExpenseModal({ group, onClose, onSuccess }) {
  const categories = categoriesForGroup(group);
  const currency = group?.settings?.currency || "INR";
  const symbol = CURRENCY_SYMBOL[currency] || currency;
  const receiptRequired = !!group?.settings?.receiptRequired;
  const memberCount = group?.members?.length || 1;
  const splitType = group?.settings?.defaultSplit?.type || "equal";
  const splitText =
    splitType === "shares" ? "by shares" : splitType === "percent" ? "by percentage" : "equally";

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0] || "general");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: "" }));

  const validate = () => {
    const e = {};
    const amt = parseFloat(amount);
    if (!description.trim()) e.description = "What was it for?";
    else if (description.trim().length > 200) e.description = "Keep it under 200 characters.";
    if (!amount) e.amount = "Enter the amount.";
    else if (!(amt > 0)) e.amount = "Amount must be more than 0.";
    else if (amt > 9999999) e.amount = "That amount is too large.";
    if (receiptRequired && !file) e.fileUrl = "This group needs a bill photo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    clearError("fileUrl");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      let fileUrl = null;
      if (file) {
        const uploadRes = await api.post("/upload", {
          file: await toBase64(file),
          folder: "splitwise_receipts",
          resourceType: "auto",
        });
        fileUrl = uploadRes.data?.url;
        if (!fileUrl) throw new Error("Upload failed");
      }
      // No payer / split in the request: the server records me as the payer
      // and applies the group's own split.
      await api.post("/expenses", {
        groupId: group._id,
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        notes: notes.trim(),
        fileUrl,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      else toast.error(data?.message || err.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const label = "block text-xs font-medium text-muted-foreground mb-1.5";
  const field = (hasError) =>
    `h-11 w-full rounded-xl bg-muted/60 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 border focus:outline-none focus:bg-background focus:ring-2 transition ${
      hasError ? "border-destructive/60 focus:ring-destructive/15" : "border-transparent focus:border-primary/40 focus:ring-primary/15"}`;
  const CategoryIcon = categoryMeta(category).Icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] sm:px-4"
        onClick={() => !loading && onClose?.()}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card shadow-xl"
        >
          <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-4 sm:pt-6">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Add expense</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                You paid · split {splitText} among {memberCount} in <span className="font-medium text-foreground">{group?.name}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 sm:px-6 pt-5 pb-5 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              {/* Description */}
              <div>
                <label htmlFor="exp-desc" className={label}>Description</label>
                <input id="exp-desc" type="text" autoFocus placeholder="e.g. Dinner, Cab ride" maxLength={200}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError("description"); }}
                  className={field(errors.description)} />
                {errors.description && <p className="text-destructive text-xs mt-1">{errors.description}</p>}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="exp-amount" className={label}>Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">{symbol}</span>
                  <input id="exp-amount" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); clearError("amount"); }}
                    className={`${field(errors.amount)} pl-8 font-semibold tabular-nums`} />
                </div>
                {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount}</p>}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="exp-cat" className={label}>Category</label>
                <div className="relative">
                  <CategoryIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value)}
                    className={`${field(false)} appearance-none pl-10 pr-9 cursor-pointer`}>
                    {categories.map((c) => <option key={c} value={c}>{categoryMeta(c).label}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Bill photo */}
              <div>
                <span className={label}>
                  Bill / receipt {receiptRequired ? <span className="text-foreground">(required)</span> : "(optional)"}
                </span>
                {file ? (
                  <div className="h-11 flex items-center gap-2.5 rounded-xl bg-muted/60 pl-1.5 pr-2">
                    {preview
                      ? <img src={preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      : <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">PDF</span>}
                    <span className="flex-1 min-w-0 truncate text-xs text-foreground">{file.name}</span>
                    <button type="button" onClick={() => { setFile(null); setPreview(null); }} aria-label="Remove bill photo"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-background cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className={`h-11 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition cursor-pointer ${
                      errors.fileUrl ? "border-destructive/60 text-destructive" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/40"}`}>
                    <ImagePlus size={16} /> Add bill photo
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={pickFile} />
                {errors.fileUrl && <p className="text-destructive text-xs mt-1">{errors.fileUrl}</p>}
              </div>
            </div>

            {/* Note */}
            <div className="mt-4">
              {showNotes ? (
                <div>
                  <label htmlFor="exp-note" className={label}>Note</label>
                  <textarea id="exp-note" rows={2} maxLength={500} autoFocus placeholder="Anything to remember - e.g. invoice no."
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 border border-transparent focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 resize-none transition" />
                </div>
              ) : (
                <button type="button" onClick={() => setShowNotes(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer">
                  <Plus size={13} /> <StickyNote size={13} /> Add note
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} disabled={loading}
                className="h-11 px-5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="h-11 px-6 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition disabled:opacity-60 cursor-pointer">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? (file ? "Uploading…" : "Saving…") : "Add expense"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
