"use client";

import { useEffect, useState } from "react";
import { Repeat, Plus, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { formatMoney } from "@/lib/formatCurrency";
import { categoriesForGroup, categoryMeta } from "@/lib/groupPresets";

const fmtDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const ordinal = (n) =>
  `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/**
 * Monthly bills (rent, WiFi, maid...) that get added automatically on their
 * day. Split follows the group's default split when a bill covers everyone.
 */
export default function RecurringBills({ group, meId, onChanged }) {
  const currency = group.settings?.currency || "INR";
  const members = group.members || [];
  const categories = categoriesForGroup(group);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "", amount: "",
    dayOfMonth: group.roommate?.billDay || 1,
    category: categories.includes("rent") ? "rent" : categories[0],
    paidBy: String(meId || members[0]?._id || ""),
  });

  const load = () =>
    api.get(`/groups/${group._id}/recurring`)
      .then((r) => setRules(r.data || []))
      .catch(() => toast.error("Failed to load monthly bills"))
      .finally(() => setLoading(false));

  useEffect(() => { load();   }, [group._id]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("Name the bill, e.g. Rent");
    if (!(Number(form.amount) > 0)) return toast.error("Enter an amount");
    try {
      setSaving(true);
      await api.post(`/groups/${group._id}/recurring`, { ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth) });
      toast.success("Monthly bill added");
      setShowForm(false);
      setForm((f) => ({ ...f, description: "", amount: "" }));
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add bill");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule) => {
    try {
      await api.patch(`/groups/${group._id}/recurring/${rule._id}`, { active: !rule.active });
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update bill");
    }
  };

  const remove = async (rule) => {
    if (!window.confirm(`Stop and delete "${rule.description}"? Expenses already added stay.`)) return;
    try {
      await api.delete(`/groups/${group._id}/recurring/${rule._id}`);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete bill");
    }
  };

  const inputCls = "w-full rounded-lg bg-background text-foreground border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
        <div>
          <h3 className="font-bold text-base text-foreground">Monthly bills</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Added automatically on their day every month</p>
        </div>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition cursor-pointer">
            <Plus size={14} /> Add bill
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={create} className="px-5 sm:px-6 py-4 border-b border-border bg-muted/20 space-y-2.5">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <input placeholder="Rent, WiFi, Maid…" value={form.description} maxLength={200}
              onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} autoFocus />
            <input type="number" min="0" inputMode="decimal" placeholder="Amount" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} className={inputCls} aria-label="Day of month">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Every {ordinal(d)}</option>)}
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} aria-label="Category">
              {categories.map((c) => <option key={c} value={c}>{categoryMeta(c).label}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-muted-foreground">You pay it; it&apos;s split among everyone the group&apos;s way.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 cursor-pointer">
              {saving && <Loader2 size={14} className="animate-spin" />} Save
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={18} /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3"><Repeat className="text-primary" size={20} /></div>
          <p className="font-semibold text-foreground text-sm">No monthly bills yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add rent or WiFi once - it&apos;ll be split every month on its own.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {rules.map((r) => {
            const Icon = categoryMeta(r.category).Icon;
            return (
              <div key={r._id} className={`flex items-center gap-3 px-5 sm:px-6 py-3.5 ${r.active ? "" : "opacity-60"}`}>
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon size={15} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{r.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.active ? `Next on ${fmtDay.format(new Date(r.nextRunAt))}` : "Paused"} · {r.paidBy?.name || "Someone"} pays
                  </p>
                </div>
                <span className="font-bold text-sm text-foreground shrink-0">{formatMoney(r.amount, currency)}</span>
                <button type="button" onClick={() => toggle(r)} title={r.active ? "Pause" : "Resume"}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                  {r.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button type="button" onClick={() => remove(r)} title="Delete"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
