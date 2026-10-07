"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { GROUP_TYPES, CURRENCIES } from "@/lib/groupPresets";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { buildSettingsPayload, validateDefaultSplit, isLockedError } from "@/lib/groupSettingsPayload";

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * Creator-only group settings: type, trip dates/budget, bill day, receipts,
 * currency and the default split (e.g. rent always 2:1:1).
 */
export default function GroupSettingsModal({ group, hasExpenses: hasExpensesProp, onClose, onSaved }) {
  // Server flag wins; the list length covers an expense added this session.
  const [serverLocked, setServerLocked] = useState(false);
  const hasExpenses = !!(hasExpensesProp || group.hasExpenses || serverLocked);
  const members = group.members || [];
  const ds = group.settings?.defaultSplit || { type: "equal", weights: [] };

  const groupType = group.groupType || "general";
  const [startDate, setStartDate] = useState(toInputDate(group.trip?.startDate));
  const [endDate, setEndDate] = useState(toInputDate(group.trip?.endDate));
  const [budget, setBudget] = useState(group.trip?.budget ?? "");
  const [currency, setCurrency] = useState(group.settings?.currency || "INR");
  const [receiptRequired, setReceiptRequired] = useState(!!group.settings?.receiptRequired);
  const [joinApproval, setJoinApproval] = useState(!!group.settings?.joinApproval);
  const [splitType, setSplitType] = useState(ds.type || "equal");
  const [weights, setWeights] = useState(() => {
    const saved = Object.fromEntries((ds.weights || []).map((w) => [String(w.userId), String(w.value)]));
    return Object.fromEntries(
      members.map((m) => [String(m._id), saved[String(m._id)] ?? (ds.type === "percent" ? "" : "1")])
    );
  });
  const [saving, setSaving] = useState(false);

  const weightTotal = members.reduce((a, m) => a + (Number(weights[String(m._id)]) || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    if (!hasExpenses) {
      const problem = validateDefaultSplit({ splitType, weights, members });
      if (problem) return toast.error(problem);
    }

    const body = buildSettingsPayload({
      locked: hasExpenses, receiptRequired, joinApproval, currency, splitType, weights, members, groupType,
      trip: { startDate, endDate, budget },
    });

    try {
      setSaving(true);
      const res = await api.patch(`/groups/${group._id}/settings`, body);
      toast.success("Group settings saved");
      onSaved?.(res.data);
      onClose?.();
    } catch (err) {
      if (isLockedError(err)) setServerLocked(true); // an expense was added meanwhile
      toast.error(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl bg-background text-foreground border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition";
  const label = "text-xs font-semibold text-foreground mb-1.5 block";
  const sectionTitle = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1";
  const card = "rounded-2xl border border-border bg-muted/30";

  const unit = splitType === "percent" ? "%" : splitType === "shares" ? "shares" : "";
  const splitName = { equal: "Equal", shares: "By shares", percent: "By percent" }[splitType] || "Equal";
  const splitHint = {
    equal: "Everyone pays the same amount.",
    shares: "Bigger share, bigger part of the bill.",
    percent: "Each person pays a fixed percent.",
  }[splitType] || "";
  const sharePct = (m) => {
    const t = weightTotal || 1;
    return Math.round(((Number(weights[String(m._id)]) || 0) / t) * 100);
  };

  // Switch-style toggle. Still a real checkbox underneath (keyboard + screen readers).
  const toggle = ({ title, hint, checked, onChange }) => (
    <label key={title} className="flex items-center justify-between gap-4 px-4 py-3.5 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block w-11 h-6 rounded-full bg-border transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40" />
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );

  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-");
  // Plain read-only line: label on the left, value on the right. No controls.
  const row = (name, value) => (
    <div key={name} className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{name}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
  const avatar = (name) => (
    <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={() => !saving && onClose?.()}>
      <motion.form
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onSubmit={save} onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground leading-tight">Group settings</h2>
            {group.name && <p className="text-xs text-muted-foreground mt-0.5 truncate">{group.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6">
          {/* Group type: permanent */}
          <section>
            <p className={sectionTitle}>Group type</p>
            <div className={`${card} p-2`}>
              <div className="grid grid-cols-4 gap-1">
                {Object.values(GROUP_TYPES).map((t) => {
                  const active = groupType === t.key;
                  return (
                    <div key={t.key} aria-current={active}
                      className={`flex flex-col items-center gap-1.5 pt-3 pb-2 rounded-xl text-[11px] font-semibold transition ${
                        active ? "bg-background shadow-sm ring-1 ring-border text-foreground" : "text-muted-foreground/50"}`}>
                      <GroupTypeIcon type={t.key} size={34} muted={!active} />
                      {t.label}
                    </div>
                  );
                })}
              </div>
              {!hasExpenses && <p className="text-[11px] text-muted-foreground px-2 pt-2 pb-1">Group type is set when the group is created and can&apos;t be changed later.</p>}
            </div>
          </section>

          {/* Rules: the only things that stay editable */}
          <section>
            <p className={sectionTitle}>Rules</p>
            <div className={`${card} divide-y divide-border`}>
              {toggle({ title: "Receipt required", hint: "Every expense must have a bill photo", checked: receiptRequired, onChange: setReceiptRequired })}
              {toggle({ title: "Approve people who join by link", hint: "Link joins wait for your OK - good for business groups", checked: joinApproval, onChange: setJoinApproval })}
            </div>
          </section>

          {groupType === "trip" && (
            <section>
              <p className={sectionTitle}>Trip</p>
              {hasExpenses ? (
                <div className={`${card} divide-y divide-border`}>
                  {row("Start date", fmtDate(startDate))}
                  {row("End date", fmtDate(endDate))}
                  {row("Budget", budget === "" || budget == null ? "-" : `${currency} ${budget}`)}
                </div>
              ) : (
                <div className={`${card} p-4 space-y-3`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className={label}>Start date</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                    <div><span className={label}>End date</span><input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div><span className={label}>Budget</span><input type="number" min="0" inputMode="decimal" value={budget} placeholder="No budget" onChange={(e) => setBudget(e.target.value)} className={inputCls} /></div>
                </div>
              )}
            </section>
          )}

          {/* Money */}
          <section>
            <p className={sectionTitle}>Money</p>
            {hasExpenses ? (
              <div className={`${card} divide-y divide-border`} data-testid="split-locked">
                {row("Currency", currency)}
                {row("Default split", splitName)}
                {splitType !== "equal" && members.map((m) => (
                  <div key={m._id} className="flex items-center gap-3 px-4 py-2.5 bg-background/40">
                    {avatar(m.name || m.email)}
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">{m.name || m.email}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{weights[String(m._id)] || 0}</span>
                    <span className="text-xs text-muted-foreground w-10">{unit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${card} p-4 space-y-5`}>
                <div>
                  <span className={label}>Currency</span>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <span className={label}>Default split for new expenses</span>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-background border border-border">
                    {[["equal", "Equal"], ["shares", "Shares"], ["percent", "Percent"]].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setSplitType(k)} aria-pressed={splitType === k}
                        className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${splitType === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{splitHint}</p>

                  {splitType !== "equal" && (
                    <div className="mt-3 rounded-xl bg-background border border-border">
                      <ul className="divide-y divide-border">
                        {members.map((m) => (
                          <li key={m._id} className="flex items-center gap-3 px-3.5 py-2.5">
                            {avatar(m.name || m.email)}
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-foreground truncate">{m.name || m.email}</span>
                              {splitType === "shares" && <span className="block text-[11px] text-muted-foreground">{sharePct(m)}% of each bill</span>}
                            </span>
                            <input type="number" min="0" step={splitType === "percent" ? "0.01" : "0.5"} inputMode="decimal"
                              aria-label={`${splitType === "percent" ? "Percent" : "Shares"} for ${m.name || m.email}`}
                              value={weights[String(m._id)] ?? ""}
                              onChange={(e) => setWeights((p) => ({ ...p, [String(m._id)]: e.target.value }))}
                              className="w-20 rounded-lg bg-muted/60 border border-transparent px-2 py-1.5 text-sm text-right font-semibold text-foreground tabular-nums focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                            <span className="text-xs text-muted-foreground w-10">{unit}</span>
                          </li>
                        ))}
                      </ul>
                      <div className={`flex items-center justify-between px-3.5 py-2.5 border-t border-border text-xs font-semibold ${splitType === "percent" && Math.abs(weightTotal - 100) > 0.01 ? "text-amber-600" : "text-muted-foreground"}`}>
                        <span>Total</span>
                        <span className="tabular-nums">{weightTotal}{splitType === "percent" ? "% of 100%" : " shares"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-4 border-t border-border bg-card">
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
          </button>
        </div>
      </motion.form>
    </div>
  );
}
