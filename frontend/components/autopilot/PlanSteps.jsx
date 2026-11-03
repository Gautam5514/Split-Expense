"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bell, CheckCircle2, ExternalLink, Loader2, Mail, PiggyBank, Receipt, Scale, UserCheck, UserPlus, Users, CircleDashed, Wallet, List, Pencil, Globe2, Trash2, AlertTriangle } from "lucide-react";
import { PEOPLE_COLORS, initials, money } from "./format";

const ICONS = { create_group: Users, add_members: UserPlus, set_group_budget: PiggyBank, create_expense: Receipt, monitor_budget: Bell, read_summary: Scale, read_overall: Globe2, list_expenses: List, delete_expense: Trash2, delete_group: Trash2 };
const DELETES = ["delete_expense", "delete_group"];

// What a delete will remove, stated plainly before anyone approves it.
function DangerSummary({ step, result }) {
  const p = step.payload, i = p.impact || {};
  if (result) return <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Deleted. {step.type === "delete_group" ? "The group is gone for everyone." : "Balances are updated for everyone in the group."}</p>;
  return (
    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-3.5 w-3.5" /> Permanent. This can&apos;t be undone.</p>
      {step.type === "delete_group" ? (
        <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[["Members", i.members], ["Expenses", i.expenses], ["Total spent", money(i.totalMinor || 0, p.currency)]].map(([k, v]) => <li key={k} className="rounded-lg bg-background/70 px-2 py-2"><p className="text-[10px] text-muted-foreground">{k}</p><p className="text-sm font-semibold tabular-nums">{v}</p></li>)}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Removes this expense{i.date ? ` from ${new Date(i.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""} and recalculates what everyone in the group owes. Members are told it was deleted.</p>
      )}
    </div>
  );
}
const READS = ["read_summary", "read_overall", "list_expenses"];
const SPLIT_LABEL = { equal: "split equally", exact: "exact shares", shares: "by the group's shares", percent: "by the group's percentages" };
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const toMajor = minor => String(minor / 100);

// Change the plan without retyping it. The server rebuilds and re-checks the plan from these edits.
function EditExpense({ step, onSave, onCancel, busy }) {
  const p = step.payload;
  const [title, setTitle] = useState(p.name || "");
  const [amount, setAmount] = useState(toMajor(p.amountMinor));
  const roster = p.roster || p.splits.map(s => ({ memberId: s.memberId, name: s.name }));
  const [chosen, setChosen] = useState(() => new Set(p.splits.map(s => s.memberId)));
  const exact = p.splitType === "exact";
  const validAmount = /^\d+(?:\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0;
  const changes = {};
  if (title.trim() && title.trim() !== p.name) changes.title = title.trim();
  if (validAmount && Math.round(Number(amount) * 100) !== p.amountMinor) changes.amount = amount.trim();
  const before = new Set(p.splits.map(s => s.memberId));
  if (!exact && (chosen.size !== before.size || [...chosen].some(id => !before.has(id)))) changes.excluded = roster.map(r => r.memberId).filter(id => !chosen.has(id));
  const toggle = id => setChosen(c => { const n = new Set(c); if (n.has(id)) { if (n.size > 1) n.delete(id); } else n.add(id); return n; });
  return (
    <form onSubmit={e => { e.preventDefault(); if (Object.keys(changes).length && validAmount) onSave(changes); }} className="mt-3 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <label className="block text-[11px] font-medium text-muted-foreground">What
        <input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" /></label>
      <label className="block text-[11px] font-medium text-muted-foreground">Amount ({p.currency})
        <input value={amount} inputMode="decimal" disabled={exact} onChange={e => setAmount(e.target.value)} aria-invalid={!validAmount} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50" /></label>
      {!exact && (
        <fieldset><legend className="text-[11px] font-medium text-muted-foreground">Split between</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{roster.map(r => {
            const on = chosen.has(r.memberId);
            return <button key={r.memberId} type="button" aria-pressed={on} onClick={() => toggle(r.memberId)} className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground line-through"}`}>{r.name}</button>;
          })}</div>
        </fieldset>
      )}
      {exact && <p className="text-[11px] text-muted-foreground">Exact shares: type the new shares in the chat, like “me 300, Aman 600”.</p>}
      <div className="flex gap-2">
        <button disabled={busy || !validAmount || !Object.keys(changes).length} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Update plan</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-muted">Cancel</button>
      </div>
    </form>
  );
}

function Overall({ overall }) {
  const totals = Object.entries(overall.totals || {});
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {totals.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">You aren&apos;t in any active groups yet.</p>}
        {totals.map(([cur, t]) => [
          <div key={`${cur}-in`} className="rounded-xl border border-border/60 bg-background/40 p-3"><p className="text-[11px] text-muted-foreground">You get back</p><p className="mt-1 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{money(t.owedMinor, cur)}</p></div>,
          <div key={`${cur}-out`} className="rounded-xl border border-border/60 bg-background/40 p-3"><p className="text-[11px] text-muted-foreground">You owe</p><p className="mt-1 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">{money(t.oweMinor, cur)}</p></div>,
        ])}
      </div>
      {overall.groups.length > 0 && (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40">
          {overall.groups.map(g => (
            <li key={g.groupId}><Link href={`/groups/${g.groupId}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50"><span className="min-w-0 flex-1 truncate">{g.name}</span><span className={`tabular-nums font-medium ${g.balanceMinor > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{g.balanceMinor > 0 ? "gets back " : "owes "}{money(Math.abs(g.balanceMinor), g.currency)}</span></Link></li>
          ))}
        </ul>
      )}
      {overall.settledCount > 0 && <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Settled up in {overall.settledCount} other group{overall.settledCount === 1 ? "" : "s"}.</p>}
    </div>
  );
}

function ExpenseList({ expenses, currency }) {
  if (!expenses.length) return <p className="mt-3 text-sm text-muted-foreground">No matching expenses yet.</p>;
  return (
    <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40">
      {expenses.map(e => (
        <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-sm">{e.title}</p><p className="text-[11px] text-muted-foreground">{e.paidBy} · {cap(e.category)} · {new Date(e.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p></div>
          <span className="text-sm font-medium tabular-nums">{money(e.amountMinor, currency)}</span>
        </li>
      ))}
    </ul>
  );
}

function Avatar({ name, index, size = "h-7 w-7 text-[11px]" }) {
  return <span className={`${size} ${PEOPLE_COLORS[index % PEOPLE_COLORS.length]} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}>{initials(name)}</span>;
}

function SplitBreakdown({ splits, currency, total }) {
  return (
    <div className="mt-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Share of the total per person">
        {splits.map((s, i) => (
          <motion.div key={s.memberId} initial={{ width: 0 }} animate={{ width: `${(s.shareMinor / total) * 100}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }} className={PEOPLE_COLORS[i % PEOPLE_COLORS.length]} />
        ))}
      </div>
      <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40">
        {splits.map((s, i) => (
          <li key={s.memberId} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={s.name} index={i} />
            <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{Math.round((s.shareMinor / total) * 100)}%</span>
            <span className="w-24 text-right text-sm font-medium tabular-nums">{money(s.shareMinor, currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Only the people listed are included. Shares are calculated by SplitEase&apos;s own split engine and add up to the exact total.</p>
    </div>
  );
}

function Ring({ pct, size = 84 }) {
  const r = 34, c = 2 * Math.PI * r, shown = Math.min(100, Math.max(0, pct));
  const color = pct >= 100 ? "stroke-red-500" : pct >= 75 ? "stroke-amber-500" : "stroke-primary";
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" role="img" aria-label={`${pct}% of budget used`}>
      <circle cx="42" cy="42" r={r} className="fill-none stroke-muted" strokeWidth="8" />
      <motion.circle cx="42" cy="42" r={r} className={`fill-none ${color}`} strokeWidth="8" strokeLinecap="round" transform="rotate(-90 42 42)" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * shown) / 100 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      <text x="42" y="47" textAnchor="middle" className="fill-foreground text-[15px] font-semibold">{Math.round(pct)}%</text>
    </svg>
  );
}

const PERSON = {
  add: { icon: UserCheck, label: "Joins right away", hint: "Already a contact", tone: "text-emerald-600 dark:text-emerald-400" },
  invite: { icon: UserPlus, label: "Gets an invite", hint: "Joins only when they accept", tone: "text-primary" },
  email: { icon: Mail, label: "Email invite", hint: "Gets a join link by email", tone: "text-amber-600 dark:text-amber-400" },
};

function People({ people, result }) {
  return (
    <div className="mt-3">
      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40">
        {people.map((p, i) => {
          const meta = PERSON[p.status]; const Icon = meta.icon;
          return (
            <li key={p.userId || p.email} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={p.name || p.email} index={i + 1} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm">{p.name || p.email}</p><p className="text-[11px] text-muted-foreground">{meta.hint}</p></div>
              <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${meta.tone}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span>
            </li>
          );
        })}
      </ul>
      {result && <p className="mt-2 text-xs text-muted-foreground">{[result.added?.length ? `${result.added.length} added` : "", result.invited ? `${result.invited} invited` : "", result.emailed ? `${result.emailed} emailed` : ""].filter(Boolean).join(" · ")}</p>}
      {!result && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Nobody is added without their consent: only people you already share a group or chat with can be added directly.</p>}
    </div>
  );
}

function Insights({ result, currency }) {
  const ins = result.insights;
  const name = id => result.members?.find(m => m.id === id)?.name || "Member";
  const balances = Object.entries(result.balances || {}).map(([id, v]) => ({ id, name: name(id), v: Math.round(Number(v) * 100) })).filter(b => b.v !== 0).sort((a, b) => b.v - a.v);
  return (
    <div className="mt-4 space-y-4">
      {ins && (
        <div className="grid gap-3">
          {ins.budget && (
            <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
              <Ring pct={ins.budget.usedPct} />
              <div><p className="text-xs text-muted-foreground">Budget used</p><p className="text-sm font-semibold tabular-nums">{money(ins.totalMinor, currency)}</p><p className="text-xs text-muted-foreground tabular-nums">of {money(ins.budget.budgetMinor, currency)}</p></div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {[["Total spent", money(ins.totalMinor, currency)], ["Expenses", String(ins.expenseCount)], ["Average", money(ins.averageMinor, currency)]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 bg-background/40 p-3"><p className="text-[11px] text-muted-foreground">{k}</p><p className="mt-1 truncate text-sm font-semibold tabular-nums">{v}</p></div>
            ))}
          </div>
        </div>
      )}
      {ins?.categories?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Where the money went</p>
          <ul className="space-y-2.5">
            {ins.categories.map((c, i) => (
              <li key={c.name}>
                <div className="mb-1 flex justify-between text-xs"><span className="capitalize">{c.name}</span><span className="tabular-nums text-muted-foreground">{money(c.amountMinor, currency)}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className={`h-full rounded-full ${PEOPLE_COLORS[i % PEOPLE_COLORS.length]}`} initial={{ width: 0 }} animate={{ width: `${(c.amountMinor / ins.totalMinor) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06 }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Net balances</p>
        {balances.length === 0 ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Everyone is settled up.</p> : (
          <ul className="space-y-2">{balances.map((b, i) => (
            <li key={b.id} className="flex items-center gap-3 text-sm"><Avatar name={b.name} index={i} /><span className="flex-1 truncate">{b.name}</span><span className={`tabular-nums font-medium ${b.v > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{b.v > 0 ? "gets back " : "owes "}{money(Math.abs(b.v), currency)}</span></li>
          ))}</ul>
        )}
      </div>
      {result.settlements?.length > 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="mb-3 text-xs font-medium text-primary">Simplest way to settle · suggestion only, no payment is made</p>
          <ul className="space-y-2">{result.settlements.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{name(s.from)}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{name(s.to)}</span><span className="ml-auto tabular-nums font-semibold">{money(Math.round(s.amount * 100), currency)}</span></li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}

export default function PlanSteps({ run, groupName, running, onEdit, busy }) {
  const steps = run.plan?.steps || [];
  const [editing, setEditing] = useState(null);
  const canEdit = step => onEdit && run.status === "waiting_approval" && step.action !== undefined && step.type === "create_expense";
  const firstPending = steps.findIndex(s => !run.results.some(r => r.stepId === s.id));
  return (
    <ol className="relative space-y-3">
      {steps.map((step, i) => {
        const p = step.payload;
        const result = run.results.find(r => r.stepId === step.id);
        const Icon = ICONS[step.type] || Wallet;
        const state = result?.verified ? "verified" : running && i === firstPending ? "executing" : "proposed";
        const isRead = READS.includes(step.type);
        const isDelete = DELETES.includes(step.type);
        return (
          <motion.li key={step.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} className={`relative overflow-hidden rounded-2xl border bg-card p-4 transition-colors ${state === "verified" ? "border-emerald-500/40" : state === "executing" ? "border-primary/50" : isDelete ? "border-red-500/40" : "border-border"}`}>
            <div className="flex items-start gap-3.5">
              <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${state === "verified" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : isDelete ? "bg-red-500/12 text-red-600 dark:text-red-400" : "bg-primary/10 text-primary"}`}><Icon className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold leading-tight"><span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>{step.title}</h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${state === "verified" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : state === "executing" ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {state === "verified" ? <CheckCircle2 className="h-3 w-3" /> : state === "executing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleDashed className="h-3 w-3" />}
                    {state === "verified" ? "Verified" : state === "executing" ? "Executing" : isRead ? "Read-only" : "Proposed"}
                  </span>
                </div>
                {step.type !== "read_overall" && <p className="mt-1 text-xs text-muted-foreground">{p.name && step.type !== "create_group" ? p.name : groupName(p.groupId)} · {p.currency}{step.type === "create_group" && p.groupType ? ` · ${cap(p.groupType)}` : ""}</p>}
                {p.amountMinor !== undefined && step.type !== "monitor_budget" && <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{money(p.amountMinor, p.currency)}</p>}
                {step.type === "create_expense" && p.splits && <><p className="mt-1 text-xs text-muted-foreground">Paid by you · {p.splits.length} {p.splits.length > 1 ? "people" : "person"}, {SPLIT_LABEL[p.splitType] || "split"}{p.category ? ` · ${cap(p.category)}` : ""}</p>
                  {editing === step.id ? <EditExpense step={step} busy={busy} onCancel={() => setEditing(null)} onSave={changes => { setEditing(null); onEdit(step, changes); }} /> : <SplitBreakdown splits={p.splits} currency={p.currency} total={p.amountMinor} />}
                  {canEdit(step) && editing !== step.id && <button type="button" disabled={busy} onClick={() => setEditing(step.id)} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"><Pencil className="h-3 w-3" /> Edit amount or people</button>}</>}
                {step.type === "add_members" && p.people && <People people={p.people} result={result} />}
                {step.type === "monitor_budget" && (
                  <div className="mt-3"><div className="flex flex-wrap gap-2">{p.thresholds.map(t => <span key={t} className="rounded-lg border border-border bg-background/50 px-3 py-1.5 text-sm font-semibold tabular-nums">{t}%</span>)}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">In-app alerts only, checked when you press “Check budgets”. Approving this step is your opt-in; you can disable it any time.</p></div>
                )}
                {isDelete && <DangerSummary step={step} result={result} />}
                {step.type === "read_summary" && result && <Insights result={result} currency={p.currency} />}
                {step.type === "read_overall" && result?.overall && <Overall overall={result.overall} />}
                {step.type === "list_expenses" && result?.expenses && <ExpenseList expenses={result.expenses} currency={p.currency} />}
                {isRead && !result && <p className="mt-2 text-sm text-muted-foreground">{step.type === "read_overall" ? "Adds up your balance in every group." : step.type === "list_expenses" ? "Looks through this group's expenses." : "Reads your group's ledger and explains who owes whom."} Makes no changes.</p>}
                {result?.href && !isRead && step.type !== "delete_group" && <Link href={result.href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">Open in group <ExternalLink className="h-3 w-3" /></Link>}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
