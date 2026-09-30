"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { formatMoney } from "@/lib/formatCurrency";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Minus, Plus, Split, IndianRupee, Loader2, QrCode, Copy, Check,
  Download, Users, ArrowLeft,
} from "lucide-react";

/**
 * Quick Split — a fast, group-less bill split.
 *   create: enter total + pick headcount with +/- → equal split
 *   result: everyone pays the creator (UPI QR + id), tick people off
 *
 * Props:
 *  - isOpen, onClose
 *  - openId?: reopen a saved split straight into the result view
 *  - onChanged?: called after create / paid-toggle so the caller can refresh
 */
export default function QuickSplitModal({ isOpen, onClose, openId, onChanged }) {
  const [phase, setPhase] = useState("create"); // "create" | "result"
  const [amount, setAmount] = useState("");
  const [people, setPeople] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Reset / load whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (openId) {
      setPhase("result");
      api.get(`/quick-splits/${openId}`)
        .then((res) => setResult(res.data))
        .catch(() => { toast.error("Couldn't open that split"); onClose?.(); });
    } else {
      setPhase("create");
      setAmount("");
      setPeople(2);
      setResult(null);
      setCopied(false);
    }
  }, [isOpen, openId]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const total = Number(amount) || 0;
  const perPerson = people > 0 ? Math.round((total / people) * 100) / 100 : 0;

  const handleSplit = async () => {
    if (!(total >= 0.01)) { toast.error("Enter a valid total amount"); return; }
    setSubmitting(true);
    try {
      const res = await api.post("/quick-splits", {
        totalAmount: total,
        splitType: "equal",
        peopleCount: people,
      });
      setResult(res.data);
      setPhase("result");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't create the split");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePaid = async (p) => {
    try {
      const res = await api.patch(`/quick-splits/${result.id}/participants/${p.id}`, { paid: !p.paid });
      setResult((prev) => ({ ...prev, ...res.data, payee: prev.payee }));
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't update");
    }
  };

  const copyUpi = async () => {
    if (!result?.payee?.upiId) return;
    try {
      await navigator.clipboard.writeText(result.payee.upiId);
      setCopied(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select it manually");
    }
  };

  const downloadQr = async () => {
    const url = result?.payee?.upiQrUrl;
    if (!url) return;
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "upi-qr.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  const cur = result?.currency || "INR";
  const hasUpi = !!result?.payee?.upiId;
  const hasQr = !!result?.payee?.upiQrUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              {phase === "result" && !openId && (
                <button
                  type="button"
                  onClick={() => setPhase("create")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-teal-500/10 text-cyan-600 ring-1 ring-cyan-500/15 dark:text-cyan-400">
                <Split size={18} />
              </span>
              <div>
                <h2 className="text-base font-black tracking-tight text-foreground">Quick Split</h2>
                <p className="text-[11px] text-muted-foreground">
                  {phase === "create" ? "Split a bill in seconds" : `${result?.participants?.length || 0} people`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5">
            {phase === "create" ? (
              <div className="space-y-6">
                {/* Amount */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Total amount</label>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15">
                    <IndianRupee size={20} className="text-muted-foreground" />
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0"
                      className="w-full bg-transparent text-2xl font-extrabold text-foreground outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                {/* People counter */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">How many people?</label>
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setPeople((n) => Math.max(n - 1, 1))}
                      disabled={people <= 1}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background transition active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
                      aria-label="Fewer people"
                    >
                      <Minus size={24} strokeWidth={2.6} />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-5xl font-black leading-none tracking-tighter text-foreground">{people}</span>
                      <span className="mt-1 text-xs font-semibold text-muted-foreground">{people === 1 ? "person" : "people"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPeople((n) => Math.min(n + 1, 50))}
                      disabled={people >= 50}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background transition active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
                      aria-label="More people"
                    >
                      <Plus size={24} strokeWidth={2.6} />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col items-center rounded-2xl bg-cyan-500/[0.08] py-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Each person pays</span>
                  <span className="mt-0.5 text-3xl font-black tracking-tight text-cyan-600 dark:text-cyan-400">{formatMoney(perPerson, "INR")}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{formatMoney(total, "INR")} ÷ {people}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={submitting || !(total >= 0.01)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(8,145,178,0.9)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Split size={16} />}
                  Split &amp; show QR
                </button>
              </div>
            ) : result ? (
              <div className="space-y-5">
                {/* Summary */}
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-muted/25 p-5">
                  <p className="text-3xl font-black tracking-tight text-foreground">{formatMoney(result.totalAmount, cur)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      <Users size={11} /> {result.participants.length} people
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                      {formatMoney(result.participants[0]?.share || 0, cur)} each
                    </span>
                  </div>
                </div>

                {/* Pay-to */}
                {hasUpi || hasQr ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Everyone pays you here</p>
                    {hasQr && (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-4">
                        <img src={result.payee.upiQrUrl} alt="UPI QR" className="h-48 w-48 rounded-lg object-contain" />
                        <button
                          type="button"
                          onClick={downloadQr}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-bold text-foreground transition hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400"
                        >
                          <Download size={13} /> Download QR
                        </button>
                      </div>
                    )}
                    {hasUpi && (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2 pl-3.5">
                        <QrCode size={15} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
                        <span className="flex-1 truncate font-mono text-sm font-semibold text-foreground">{result.payee.upiId}</span>
                        <button
                          type="button"
                          onClick={copyUpi}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${copied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-foreground text-background hover:opacity-90"}`}
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Add your UPI ID &amp; QR in your profile so friends can pay you in one tap.
                  </p>
                )}

                {/* Per-person — the creator ticks people off as they pay back */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Track who paid you back</p>
                  <div className="overflow-hidden rounded-2xl border border-border">
                    {result.participants.map((p, i) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePaid(p)}
                        className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-muted/40 ${i > 0 ? "border-t border-border" : ""}`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${p.paid ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-transparent"}`}
                          aria-hidden
                        >
                          <Check size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${p.paid ? "text-muted-foreground line-through" : "text-foreground"}`}>{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatMoney(p.share, cur)}</p>
                        </div>
                        {p.paid && (
                          <span className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Paid</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Tap a name once they&apos;ve paid you — just so you remember who&apos;s left.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-border py-3 text-sm font-bold text-foreground transition hover:bg-muted"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
