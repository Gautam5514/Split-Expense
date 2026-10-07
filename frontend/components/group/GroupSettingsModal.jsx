"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { GROUP_TYPES, CURRENCIES } from "@/lib/groupPresets";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * Creator-only group settings: type, trip dates/budget, bill day, receipts,
 * currency and the default split (e.g. rent always 2:1:1).
 */
export default function GroupSettingsModal({ group, hasExpenses, onClose, onSaved }) {
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
    if (splitType === "percent" && Math.abs(weightTotal - 100) > 0.01)
      return toast.error("Default percentages must add up to 100.");
    if (splitType === "shares" && !(weightTotal > 0))
      return toast.error("Give at least one member a share.");

    const body = {
      groupType,
      settings: {
        receiptRequired,
        joinApproval,
        defaultSplit: {
          type: splitType,
          weights: splitType === "equal" ? [] : members.map((m) => ({
            userId: String(m._id),
            value: Number(weights[String(m._id)]) || 0,
          })),
        },
      },
    };
    if (!hasExpenses) body.settings.currency = currency;
    if (groupType === "trip") body.trip = { startDate: startDate || null, endDate: endDate || null, budget: budget === "" ? null : budget };

    try {
      setSaving(true);
      const res = await api.patch(`/groups/${group._id}/settings`, body);
      toast.success("Group settings saved");
      onSaved?.(res.data);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl bg-background text-foreground border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-bold text-foreground mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={() => !saving && onClose?.()}>
      <motion.form
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onSubmit={save} onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-foreground">Group settings</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          <div>
            <span className={label}>Group type</span>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(GROUP_TYPES).map((t) => {
                const active = groupType === t.key;
                return (
                  <div key={t.key}
                    aria-current={active}
                    className={`flex flex-col items-center gap-2 pt-3.5 pb-2.5 rounded-2xl text-[11px] font-semibold transition ${
                      active ? "bg-muted/70 ring-2 ring-inset ring-foreground/80 text-foreground" : "text-muted-foreground/60"}`}>
                    <GroupTypeIcon type={t.key} size={40} muted={!active} />
                    {t.label}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Group type is set when the group is created and can&apos;t be changed later.</p>
          </div>

          {groupType === "trip" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><span className={label}>Start date</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></div>
                <div><span className={label}>End date</span><input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputCls} /></div>
              </div>
              <div><span className={label}>Budget</span><input type="number" min="0" inputMode="decimal" value={budget} placeholder="No budget" onChange={(e) => setBudget(e.target.value)} className={inputCls} /></div>
            </div>
          )}

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="text-xs font-bold text-foreground block">Receipt required</span>
              <span className="text-[11px] text-muted-foreground">Every expense must have a bill photo</span>
            </span>
            <input type="checkbox" checked={receiptRequired} onChange={(e) => setReceiptRequired(e.target.checked)} className="w-5 h-5 accent-cyan-600 cursor-pointer" />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="text-xs font-bold text-foreground block">Approve people who join by link</span>
              <span className="text-[11px] text-muted-foreground">Link joins wait for your OK - good for business groups</span>
            </span>
            <input type="checkbox" checked={joinApproval} onChange={(e) => setJoinApproval(e.target.checked)} className="w-5 h-5 accent-cyan-600 cursor-pointer" />
          </label>

          <div>
            <span className={label}>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={hasExpenses} className={`${inputCls} disabled:opacity-60`}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {hasExpenses && <p className="text-[11px] text-muted-foreground mt-1">Currency is locked once expenses exist. Use &quot;Other currency&quot; on an expense for foreign spends.</p>}
          </div>

          <div>
            <span className={label}>Default split for new expenses</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-background border border-border mb-2">
              {[["equal", "Equal"], ["shares", "Shares"], ["percent", "Percent"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setSplitType(k)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${splitType === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
            {splitType !== "equal" && (
              <div className="rounded-xl border border-border divide-y divide-border">
                {members.map((m) => (
                  <div key={m._id} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex-1 text-sm text-foreground truncate">{m.name || m.email}</span>
                    <input type="number" min="0" step={splitType === "percent" ? "0.01" : "0.5"} inputMode="decimal"
                      value={weights[String(m._id)] ?? ""}
                      onChange={(e) => setWeights((p) => ({ ...p, [String(m._id)]: e.target.value }))}
                      className="w-20 rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-right text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-xs text-muted-foreground w-10">{splitType === "percent" ? "%" : "share"}</span>
                  </div>
                ))}
                <p className={`px-3 py-2 text-xs font-semibold ${splitType === "percent" && Math.abs(weightTotal - 100) > 0.01 ? "text-amber-600" : "text-muted-foreground"}`}>
                  Total: {weightTotal}{splitType === "percent" ? "%" : " shares"}
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">E.g. the bigger room pays 2 shares of rent. You can still change the split on any expense.</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
          </button>
        </div>
      </motion.form>
    </div>
  );
}
