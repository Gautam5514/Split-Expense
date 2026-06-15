"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Loader2, Lock, Sparkles, X } from "lucide-react";

/* Confirm-purchase modal for coin store items (premium themes & fonts).
   Fully controlled: `item` null = closed. The caller owns the API call -
   this only collects the user's decision and reflects the busy state. */
export default function PurchaseModal({ item, balance, busy, onConfirm, onCancel }) {
  // Esc closes (unless a purchase is mid-flight).
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, busy, onCancel]);

  const affordable = item ? balance >= item.cost : false;

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onCancel()}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
          >
            <button
              onClick={onCancel}
              disabled={busy}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              <X size={16} />
            </button>

            {/* Item preview */}
            {item.swatch ? (
              <div
                className="mx-auto mb-4 w-24 rounded-xl overflow-hidden border border-border shadow-sm"
                style={{ backgroundColor: item.swatch.dark }}
              >
                <div className="p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.swatch.primary, boxShadow: `0 0 8px ${item.swatch.primary}` }} />
                    <Lock size={9} className="text-white/40" />
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="h-1 w-4/5 rounded bg-white/20" />
                    <div className="h-1 w-3/5 rounded bg-white/10" />
                  </div>
                  <div
                    className="mt-2 h-3.5 w-10 rounded"
                    style={{ backgroundColor: item.swatch.card, border: `1px solid ${item.swatch.line}` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                <span className="text-xl font-extrabold text-foreground" style={{ fontFamily: item.fontFamily }}>
                  Aa
                </span>
              </div>
            )}

            <h2 className="text-lg font-extrabold text-foreground text-center">
              Unlock {item.name}?
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-1.5 leading-relaxed">
              One-time purchase with coins. Once unlocked, it&apos;s yours forever -
              even if your balance drops later.
            </p>

            {/* Balance breakdown */}
            <div className="mt-4 rounded-xl border border-border bg-muted/40 divide-y divide-border">
              <Row label="Your balance" value={balance} />
              <Row label={`${item.name} cost`} value={-item.cost} negative />
              <Row label="Balance after" value={Math.max(balance - item.cost, 0)} bold />
            </div>

            {/* Keep-forever pill */}
            <div className="mt-4 flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-2.5">
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Purchases are permanent. Your Elite badge never goes down.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy || !affordable}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Unlocking…
                  </>
                ) : (
                  <>
                    <Coins size={14} /> Unlock · {item.cost}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, negative, bold }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className={`text-xs ${bold ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
        {label}
      </span>
      <span
        className={`inline-flex items-center gap-1 text-sm font-bold ${
          negative ? "text-rose-500" : bold ? "text-foreground" : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {negative ? value : value}
        <Coins size={12} className={negative ? "text-rose-500" : "text-amber-500"} />
      </span>
    </div>
  );
}
