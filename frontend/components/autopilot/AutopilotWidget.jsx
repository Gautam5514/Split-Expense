"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUp, Check, Trash2, ChevronDown, Layers, Loader2, Mail, Plus, RotateCcw, ShieldCheck, Users, X, Receipt, Scale, PiggyBank, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PlanSteps from "./PlanSteps";
import styles from "./AutopilotWidget.module.css";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { PEOPLE_COLORS, STATUS, STAGES, initials, stageFor, money } from "./format";

const ENABLED = process.env.NEXT_PUBLIC_AUTOPILOT_ENABLED === "true";
const HIDDEN = ["/login", "/register", "/reset-password", "/admin"];
const STORE = "autopilot.thread.v1";
const OPEN_STATES = ["clarification_required", "waiting_approval"];
const TERMINAL = ["completed", "failed", "partial_success", "cancelled", "rejected"];
const EXAMPLES = [
  { icon: Users, label: "Plan a trip", hint: "Group, people & budget", text: "Create group Goa Trip with Aman and Priya, budget 40000" },
  { icon: Receipt, label: "Split a bill", hint: "Exact shares, no guessing", text: "Dinner 3600 paid by me, split equally, leave out Rahul" },
  { icon: Scale, label: "Who owes whom?", hint: "A simpler settle-up", text: "Who owes whom? Show the simplest settle-up" },
  { icon: PiggyBank, label: "Watch my budget", hint: "Stay on top of spending", text: "Set the budget to 25000 and alert me at 75 and 90" },
];
const uuid = () => crypto.randomUUID();
const APPROVE_WORDS = /^(approve[ds]?|yes|yep|yeah|ok(?:ay)?|confirm(?:ed)?|go ahead|do it|looks good|lgtm|haan|ha|ji|theek hai|kar do)[.!\s]*$/i;
const REJECT_WORDS = /^(no|nope|nah|reject|cancel|not now|stop|don'?t|nahi|nahin|mat karo|rehne do)[.!\s]*$/i;
const STALLED_MS = 2 * 60_000;
// At or above this (in minor units) a typed "yes" isn't enough: the user taps the button that names the amount.
const BIG_MINOR = 50_000_00;
const isDeletePlan = run => (run.plan?.steps || []).some(s => s.type === "delete_expense" || s.type === "delete_group");
const planTotal = run => (run.plan?.steps || []).filter(s => s.type === "create_expense").reduce((n, s) => n + (s.payload.amountMinor || 0), 0);
const errText = (err) => {
  const code = err.response?.data?.code;
  if (code === "AUTOPILOT_DISABLED") return "Autopilot is switched off on the server right now. Your groups and expenses are unaffected.";
  if (err.response?.status === 429 || code === "RATE_LIMITED") return "You're going a little fast. Give it a few seconds and try again.";
  if (err.code === "ECONNABORTED") return "That took longer than expected. Nothing was changed. Try again in a moment.";
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.status >= 500) return "Something went wrong on our side. Nothing was changed. Try again in a moment.";
  return typeof navigator !== "undefined" && navigator.onLine === false ? "You're offline. Reconnect and try again." : "I couldn't reach the server. Check your connection and try again.";
};


// A small compass spark: direction and assistance, without another app-logo tile.
function Mark({ size = 36, className = "" }) {
  return <span style={{ width: size, height: size }} className={`${styles.mark} ${className}`} aria-hidden="true">
    <svg viewBox="0 0 28 28" width={size * 0.66} height={size * 0.66} fill="none">
      <path d="m16.5 4-2 8 7.5 3-8 1.5L10 24l.5-9L4 11l8-1L16.5 4Z" fill="currentColor" />
      <path d="m22 3 .8 2.2L25 6l-2.2.8L22 9l-.8-2.2L19 6l2.2-.8L22 3Z" fill="currentColor" opacity=".6" />
    </svg>
  </span>;
}

// Group avatar: its own photo when it has one, otherwise the same glossy type tile as the New group popup.
function GroupAvatar({ group, size = 28 }) {
  if (!group) return <span style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-[30%] bg-muted text-muted-foreground"><Layers style={{ width: size * 0.5, height: size * 0.5 }} /></span>;
  if (group.photo?.url) return <img src={group.photo.url} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-[30%] object-cover" />;
  return <GroupTypeIcon type={group.groupType} size={size} />;
}

function GroupPicker({ groups, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc, true); };
  }, [open]);
  const current = groups.find(g => g._id === value);
  const options = [null, ...groups];
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label="Group context" className="flex max-w-full items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2.5 text-xs transition hover:border-foreground/30">
        <GroupAvatar group={current} size={22} />
        <span className="min-w-0 truncate font-medium">{current ? current.name : "All groups"}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="absolute left-0 top-full z-10 mt-1.5 max-h-60 w-64 overflow-y-auto rounded-2xl border border-border bg-[var(--menu-solid)] p-1.5 shadow-xl">
            {options.map(g => (
              <li key={g?._id || "all"} role="option" aria-selected={(g?._id || "") === value}>
                <button type="button" onClick={() => { onChange(g?._id || ""); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted">
                  <GroupAvatar group={g} size={30} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-foreground">{g ? g.name : "All groups"}</span><span className="block truncate text-[11px] text-muted-foreground">{g ? `${g.groupType ? g.groupType[0].toUpperCase() + g.groupType.slice(1) : "Group"} · ${g.settings?.currency || "INR"}` : "Or start a new one"}</span></span>
                  {(g?._id || "") === value && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStages({ status }) {
  const { at, tone } = stageFor(status);
  const color = { active: "bg-primary", done: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" }[tone];
  return (
    <div className="flex items-center gap-1.5" aria-label={`Stage ${Math.min(at + 1, 5)} of 5: ${STAGES[Math.min(at, 4)]}`}>
      {STAGES.map((s, i) => <span key={s} title={s} className={`h-1 flex-1 rounded-full ${i < at ? (tone === "done" ? "bg-emerald-500" : "bg-primary") : i === at ? `${color} ${tone === "active" ? "animate-pulse" : ""}` : "bg-muted"}`} />)}
    </div>
  );
}

function Bubble({ children, mine, className = "" }) {
  return <div className={`text-[14px] leading-[22px] ${mine ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-background" : "max-w-full text-foreground/90"} ${className}`}>{children}</div>;
}

function EmailAsk({ q, disabled, onSend }) {
  const [value, setValue] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSend(value.trim()); }} className="mt-2 flex items-center gap-2">
      <div className="relative min-w-0 flex-1"><Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input type="email" inputMode="email" autoComplete="off" value={value} disabled={disabled} onChange={e => setValue(e.target.value)} placeholder={`${q.ref}'s email`} aria-label={`Email for ${q.ref}`} className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
      <button disabled={disabled || !valid} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Invite</button>
    </form>
  );
}

function Question({ q, disabled, onPick, onEmail }) {
  const [emailMode, setEmailMode] = useState(false);
  return (
    <div>
      <p className="text-[14px] leading-[22px] text-foreground/90">{q.text}</p>
      {q.options.length > 0 && !emailMode && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {q.options.map((o, i) => (
            <button key={o.value} disabled={disabled} onClick={() => onPick(q, o)} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:border-foreground/40 disabled:opacity-50">
              {q.kind === "person" && <span className={`${PEOPLE_COLORS[i % PEOPLE_COLORS.length]} inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white`}>{initials(o.label)}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{o.label}</span>{o.hint && <span className="block truncate text-[11px] text-muted-foreground">{o.hint}</span>}</span>
            </button>
          ))}
          {q.kind === "person" && <button disabled={disabled} onClick={() => setEmailMode(true)} className="self-start px-1 text-xs text-primary hover:underline">None of these. Invite by email</button>}
        </div>
      )}
      {(q.kind === "email" || emailMode) && <EmailAsk q={q} disabled={disabled} onSend={email => onEmail(q, email)} />}
    </div>
  );
}

function RunMessage({ run, nameOf, superseded, busy, onDecide, onAnswer, onResume, onCancel, onChip, onRetry, onEdit }) {
  const status = run.status;
  // Trust the server's clock; the local estimate is only for servers that don't send `stale`.
  const stalled = run.stale ?? (["planning", "running"].includes(status) && run.updatedAt && Date.now() - new Date(run.updatedAt).getTime() > STALLED_MS);
  if (superseded) return <p className="px-2 text-xs italic text-muted-foreground">Updated below ↓</p>;
  if (status === "planning") return stalled
    ? <div className="space-y-2"><Bubble>This request stopped before a plan was ready. Nothing was changed.</Bubble><div className="flex gap-2"><button disabled={busy} onClick={() => onRetry(run)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"><RotateCcw className="h-3 w-3" /> Try again</button><button disabled={busy} onClick={() => onCancel(run)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">Dismiss</button></div></div>
    : <Bubble><span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working on it…</span></Bubble>;
  const plan = run.plan;
  const questions = plan?.questions || [];
  const askedTexts = new Set(questions.map(q => q.text));
  const plain = (plan?.clarifications || []).filter(c => !askedTexts.has(c));
  return (
    <div className="space-y-3.5">
      {run.ai?.degraded && ["clarification_required", "waiting_approval"].includes(status) && <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />The AI is busy, so I used basic mode. Short, simple sentences work best right now.</p>}
      {status === "clarification_required" && (
        <>
          {plain.map((c, i) => <Bubble key={i}>{c}</Bubble>)}
          {questions.map(q => <Question key={q.id} q={q} disabled={busy} onPick={onAnswer.pick} onEmail={onAnswer.email} />)}
        </>
      )}
      {plan?.steps?.length > 0 && (
        <div className="space-y-2">
          <MiniStages status={status} />
          <PlanSteps run={run} groupName={nameOf} running={status === "running"} busy={busy} onEdit={onEdit && ((step, changes) => onEdit(run, step, changes))} />
        </div>
      )}
      {plan?.notes?.map((n, i) => <p key={i} className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs leading-5">{n}</p>)}
      {status === "waiting_approval" && (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[13px] font-semibold">Ready for your approval</p>
          <p className="mb-3 mt-0.5 text-xs leading-5 text-muted-foreground">{run.writesEnabled ? (onEdit && run.plan.steps.some(s => s.type === "create_expense" && s.action !== undefined) ? "Nothing has changed yet. Approve, edit the card, or tell me what to adjust." : "Nothing has changed yet. Approve, or just tell me what to adjust.") : "Execution is switched off on the server."}</p>
          <div className="flex gap-2">
            <button disabled={busy || !run.writesEnabled} onClick={() => onDecide(run, "approve")} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-40 ${isDeletePlan(run) ? "bg-red-600 text-white hover:bg-red-500" : "bg-primary text-primary-foreground"}`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isDeletePlan(run) ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />} {isDeletePlan(run) ? "Delete permanently" : planTotal(run) ? `Approve ${money(planTotal(run), run.plan.steps.find(s => s.type === "create_expense").payload.currency)}` : "Approve changes"}</button>
            <button disabled={busy} onClick={() => onDecide(run, "reject")} className="rounded-full border border-border px-4 py-2.5 text-sm hover:bg-muted">Not now</button>
          </div>
        </div>
      )}
      {status === "completed" && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Done, and verified against your ledger.</p>
          <div className="flex flex-wrap gap-2">{["Who owes whom?", "My total balance", "Add an expense"].map(c => <button key={c} onClick={() => onChip(c)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/60">{c}</button>)}</div>
        </div>
      )}
      {run.error && <Bubble className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"><span role="alert">{run.error}</span></Bubble>}
      {status === "running" && stalled && (
        <div className="space-y-2">
          <Bubble>This is taking longer than usual. Completed steps are saved; you can pick up where it stopped.</Bubble>
          <div className="flex gap-2"><button disabled={busy} onClick={() => onResume(run)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"><RotateCcw className="h-3 w-3" /> Resume</button><button disabled={busy} onClick={() => onCancel(run)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">Stop here</button></div>
        </div>
      )}
      {run.notices?.map((n, i) => <p key={i} className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5"><PiggyBank className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />{n}</p>)}
      {["failed", "partial_success"].includes(status) && <div className="flex gap-2"><button disabled={busy} onClick={() => onResume(run)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"><RotateCcw className="h-3 w-3" /> Resume</button>{status === "failed" && !run.plan && <button disabled={busy} onClick={() => onRetry(run)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">Try again</button>}</div>}
      {["rejected", "cancelled"].includes(status) && <p className="px-2 text-xs text-muted-foreground">{STATUS[status].label}. {run.results?.length ? `${run.results.length} completed step${run.results.length === 1 ? " remains" : "s remain"} saved. No further changes will be made.` : "No changes were made."}</p>}
    </div>
  );
}

export default function AutopilotWidget() {
  const { token, loading: authLoading } = useAuth();
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [caps, setCaps] = useState(null);
  const [off, setOff] = useState(false);
  const [connection, setConnection] = useState("idle");
  const [connectAttempt, setConnectAttempt] = useState(0);
  const [restored, setRestored] = useState(false);
  const launcherRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [ctxId, setCtxId] = useState("");
  const [thread, setThread] = useState([]);
  const [runs, setRuns] = useState({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingTick, setPendingTick] = useState(0);
  const scroller = useRef(null);
  const inputRef = useRef(null);
  const nextId = useRef(1);
  const booted = useRef(false);

  const [announce, setAnnounce] = useState("");
  const handled = useRef(new Set()); // completed runs whose follow-ups already ran
  // One capability check per session decides whether the launcher appears at all,
  // so a server with Autopilot off never shows a button that vanishes on click.
  const capsPromise = useRef(null);
  const loadCaps = useCallback(() => (capsPromise.current ||= api.get("/agent/capabilities").then(r => r.data).catch(err => { capsPromise.current = null; throw err; })), []);
  // Hide the launcher if the server says Autopilot is off; network blips still show it.
  useEffect(() => {
    if (!ENABLED || !token) return;
    let live = true;
    loadCaps().then(c => { if (live) setCaps(c); }).catch(err => { if (live && err.response?.data?.code === "AUTOPILOT_DISABLED") setOff(true); });
    return () => { live = false; };
  }, [token, loadCaps]);

  const pendingPrompt = useRef(null);
  const pathGroup = useMemo(() => pathname?.match(/^\/groups\/([a-f\d]{24})/i)?.[1] || "", [pathname]);
  useEffect(() => { if (pathGroup) setCtxId(pathGroup); }, [pathGroup]);

  // Open from anywhere: a custom event, or the legacy /autopilot redirect.
  useEffect(() => {
    const onOpen = e => {
      setOpen(true);
      if (e.detail?.autoSend && e.detail.prompt) { pendingPrompt.current = e.detail.prompt; setThread([]); setRuns({}); setPendingTick(t => t + 1); }
      else if (e.detail?.prompt) setInput(e.detail.prompt);
      if (/^[a-f\d]{24}$/i.test(e.detail?.groupId || "")) setCtxId(e.detail.groupId);
    };
    window.addEventListener("autopilot:open", onOpen);
    const params = new URLSearchParams(window.location.search);
    if (params.get("autopilot") === "1") {
      setOpen(true);
      // Links from reminders carry an editable draft; nothing is sent until the user does.
      const prompt = params.get("prompt");
      if (prompt) setInput(prompt.slice(0, 500));
      const gid = params.get("groupId");
      if (/^[a-f\d]{24}$/i.test(gid || "")) setCtxId(gid);
    }
    return () => window.removeEventListener("autopilot:open", onOpen);
  }, []);

  const loadGroups = useCallback(async () => { const { data } = await api.get("/agent/groups"); setGroups(data); return data; }, []);

  // First open: capabilities, groups, then restore the previous conversation from the server.
  useEffect(() => {
    if (!open || booted.current || !token || !ENABLED) return;
    booted.current = true;
    setConnection("loading");
    (async () => {
      try {
        const [c] = await Promise.all([loadCaps(), loadGroups()]);
        setCaps(c);
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem(STORE) || "null"); } catch { /* malformed or blocked storage must not prevent a new chat */ }
        if (Array.isArray(saved?.thread) && saved.thread.length && !pendingPrompt.current) {
          const fetched = await Promise.all([...new Set(saved.thread.filter(t => t.runId).map(t => t.runId))].map(id => api.get(`/agent/runs/${id}`).then(r => r.data).catch(() => null)));
          const map = Object.fromEntries(fetched.filter(Boolean).map(r => [r._id, r]));
          // Restored runs already had their follow-ups (group switch, budget check) the first time.
          for (const r of Object.values(map)) if (r.status === "completed") handled.current.add(r._id);
          setRuns(map);
          setThread(saved.thread.filter(t => !t.runId || map[t.runId]));
          nextId.current = Math.max(0, ...saved.thread.map(t => Number(t.id) || 0)) + 1;
        }
        setConnection("ready");
      } catch (err) {
        setConnection("error");
        booted.current = false;
        if (err.response?.data?.code === "AUTOPILOT_DISABLED") setConnection("disabled");
      } finally { setRestored(true); }
    })();
  }, [open, token, loadGroups, loadCaps, connectAttempt]);

  useEffect(() => { if (!restored || !token || connection !== "ready") return; try { sessionStorage.setItem(STORE, JSON.stringify({ thread: thread.slice(-30) })); } catch { /* storage unavailable */ } }, [thread, restored, token, connection]);
  useEffect(() => {
    if (authLoading || token) return;
    setThread([]); setRuns({}); setCaps(null); setOpen(false); setRestored(false); setConnection("idle"); booted.current = false;
    try { sessionStorage.removeItem(STORE); } catch { /* storage unavailable */ }
  }, [authLoading, Boolean(token)]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduceMotion ? "instant" : "smooth" }); }, [thread, runs, busy]);
  useEffect(() => { if (!open) return; const timer = setTimeout(() => inputRef.current?.focus(), 150); return () => clearTimeout(timer); }, [open]);
  useEffect(() => { const k = e => { if (e.key === "Escape") { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); } }; if (open) window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);

  // Poll runs that are still in flight, backing off from 1.5s to 6s; stalled runs stop polling.
  const runningIds = Object.values(runs).filter(r => ["running", "planning"].includes(r.status) && !r.stale).map(r => r._id).join(",");
  useEffect(() => {
    if (!runningIds) return;
    let delay = 1500, timer, live = true;
    const tick = async () => {
      await Promise.all(runningIds.split(",").map(id => api.get(`/agent/runs/${id}`, { timeout: 15000 }).then(({ data }) => live && setRuns(r => ({ ...r, [id]: { ...data, notices: r[id]?.notices } }))).catch(() => {})));
      delay = Math.min(delay * 1.4, 6000);
      if (live) timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => { live = false; clearTimeout(timer); };
  }, [runningIds]);

  // Announce state changes once for screen readers, without reading the whole log.
  const lastStatus = useRef({});
  useEffect(() => {
    for (const run of Object.values(runs)) {
      if (lastStatus.current[run._id] === run.status) continue;
      const first = lastStatus.current[run._id] === undefined;
      lastStatus.current[run._id] = run.status;
      if (!first || run.status !== "planning") setAnnounce(`Autopilot: ${STATUS[run.status]?.label || run.status}.`);
    }
  }, [runs]);

  // After a run creates a group, keep working inside it.
  useEffect(() => {
    for (const run of Object.values(runs)) {
      if (run.status !== "completed" || handled.current.has(run._id)) continue;
      handled.current.add(run._id);
      const created = run.results?.find(r => r.stepId === run.plan?.steps?.find(s => s.type === "create_group")?.id);
      if (created?.groupId) loadGroups().then(() => setCtxId(created.groupId)).catch(() => {});
      // A deleted group leaves the picker, and its page.
      const gone = run.results?.find(r => r.deletedGroup);
      if (gone) {
        loadGroups().catch(() => {});
        setCtxId(id => (id === gone.recordId ? "" : id));
        if (window.location.pathname.startsWith(`/groups/${gone.recordId}`)) window.location.assign("/dashboard");
      }
      // Budget alerts are checked on demand: after money moves, surface any newly crossed threshold.
      if (run.groupId && run.plan?.steps?.some(s => ["create_expense", "monitor_budget", "set_group_budget"].includes(s.type))) {
        const since = new Date(run.createdAt).getTime() - 1000;
        api.post("/agent/monitors/check").then(() => api.get("/agent/monitors", { timeout: 15000 })).then(({ data }) => {
          const fresh = (data.notices || []).filter(n => String(n.groupId) === String(run.groupId) && new Date(n.createdAt).getTime() >= since).map(n => n.message);
          if (fresh.length) setRuns(r => ({ ...r, [run._id]: { ...r[run._id], notices: fresh.slice(0, 3) } }));
        }).catch(() => {});
      }
    }
  }, [runs, loadGroups]);

  const openRun = [...thread].reverse().map(t => t.runId && runs[t.runId]).find(r => r && OPEN_STATES.includes(r.status));
  const supersededIds = useMemo(() => new Set(Object.values(runs).filter(r => r.status === "cancelled" && r.events?.some(e => e.type === "run.superseded")).map(r => r._id)), [runs]);
  const push = item => setThread(t => [...t, { id: nextId.current++, ...item }]);

  const send = useCallback(async (text, opts = {}) => {
    let message = text.trim();
    if (!message || (message.length < 3 && !opts.reuse) || busy || !caps || connection !== "ready") return;
    const display = message;
    // Older servers need 3+ characters; a chip answer's text is only for the transcript.
    if (message.length < 3) message = `Use ${message}`;
    const payload = { message, groupId: opts.groupId !== undefined ? opts.groupId : (ctxId || null), requestKey: opts.requestKey || uuid(), parentRunId: opts.parentRunId !== undefined ? opts.parentRunId : (openRun?._id || null), ...(opts.answers ? { answers: opts.answers } : {}), ...(opts.reuse ? { reuse: true } : {}), ...(opts.edits ? { edits: opts.edits } : {}) };
    if (!opts.silent) push({ role: "user", text: display });
    setBusy(true); setInput("");
    try {
      const { data } = await api.post("/agent/runs", payload, { timeout: 90000 });
      setRuns(r => ({ ...r, [data._id]: data }));
      // The request named a different group than the picker: follow it so the footer stays truthful.
      if (data.groupId && String(data.groupId) !== payload.groupId) setCtxId(String(data.groupId));
      push({ role: "agent", runId: data._id });
      // Only when the server really continued that plan (a new, separate request leaves it open).
      if (payload.parentRunId && String(data.parentRunId || "") === String(payload.parentRunId)) setRuns(r => r[payload.parentRunId] ? { ...r, [payload.parentRunId]: { ...r[payload.parentRunId], status: "cancelled", events: [...(r[payload.parentRunId].events || []), { type: "run.superseded" }] } } : r);
    } catch (err) {
      const disabled = err.response?.data?.code === "AUTOPILOT_DISABLED";
      if (disabled) setConnection("disabled");
      push({ role: "agent", text: errText(err), error: true, retry: disabled ? undefined : payload });
    } finally { setBusy(false); }
  }, [busy, ctxId, openRun, caps, connection]);

  // "Let Autopilot set it up" from the New group popup: start a fresh chat and send it.
  useEffect(() => {
    if (!pendingPrompt.current || !caps || busy) return;
    const prompt = pendingPrompt.current;
    pendingPrompt.current = null;
    send(prompt, { groupId: null, parentRunId: null });
  }, [pendingTick, caps, busy, send]);

  const decide = async (run, decision) => {
    setBusy(true);
    if (decision === "approve") setRuns(r => ({ ...r, [run._id]: { ...run, status: "running" } }));
    try {
      const { data } = await api.post(`/agent/runs/${run._id}/decision`, { decision, planVersion: run.planVersion, payloadHash: run.payloadHash, approvedStepIds: decision === "approve" ? run.plan.steps.filter(s => s.requiresApproval).map(s => s.id) : [] });
      setRuns(r => ({ ...r, [run._id]: data }));
    } catch (err) {
      // The server is the source of truth: reload to show exactly what committed.
      try { const { data } = await api.get(`/agent/runs/${run._id}`); setRuns(r => ({ ...r, [run._id]: data })); } catch { /* keep optimistic state; polling retries */ }
      push({ role: "agent", text: errText(err), error: true });
    } finally { setBusy(false); }
  };
  const resume = async run => {
    setBusy(true);
    try { const { data } = await api.post(`/agent/runs/${run._id}/resume`, undefined, { timeout: 90000 }); setRuns(r => ({ ...r, [run._id]: data })); }
    catch (err) { push({ role: "agent", text: errText(err), error: true }); }
    finally { setBusy(false); }
  };
  const cancel = async run => {
    setBusy(true);
    try { const { data } = await api.post(`/agent/runs/${run._id}/cancel`); setRuns(r => ({ ...r, [run._id]: data })); }
    catch (err) { push({ role: "agent", text: errText(err), error: true }); }
    finally { setBusy(false); }
  };

  // Plan-card edits: the server rebuilds the plan from them and asks for approval again.
  const canEdit = caps?.features?.includes("edit_plan");
  const edit = (run, step, changes) => {
    const p = step.payload;
    const bits = [changes.title && `“${changes.title}”`, changes.amount && money(Math.round(Number(changes.amount) * 100), p.currency), changes.excluded && `split between ${(p.roster || []).filter(r => !changes.excluded.includes(r.memberId)).map(r => r.name).join(", ")}`].filter(Boolean);
    return send(`Change ${p.name}: ${bits.join(", ")}`, { parentRunId: run._id, groupId: run.groupId ? String(run.groupId) : null, reuse: true, edits: [{ action: step.action, ...changes }] });
  };
  const answer = {
    pick: (q, o) => q.kind === "group"
      ? (setCtxId(o.value), send(o.label, { groupId: o.value, reuse: true }))
      : q.kind === "expense"
        ? send(o.label, { reuse: true, edits: [{ action: Number(q.id.split(":")[1]), expenseId: o.value }] })
        : send(o.label, { answers: [{ ref: q.ref, userId: o.value }], reuse: true }),
    email: (q, email) => send(email, { answers: [{ ref: q.ref, email }], reuse: true }),
  };

  // A typed reply to an open email question is treated as the answer.
  const submit = e => {
    e?.preventDefault();
    const text = input.trim();
    const emailQ = openRun?.plan?.questions?.find(q => q.kind === "email");
    const email = emailQ && text.match(/[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/)?.[0];
    if (email) return send(text.length >= 3 ? text : email, { answers: [{ ref: emailQ.ref, email }], reuse: true });
    // "yes" / "approve" on a plan that's waiting means the approve button, not a new request.
    if (openRun?.status === "waiting_approval" && !busy && ((openRun.writesEnabled && APPROVE_WORDS.test(text)) || REJECT_WORDS.test(text))) {
      push({ role: "user", text }); setInput("");
      if (APPROVE_WORDS.test(text) && isDeletePlan(openRun)) return push({ role: "agent", text: "Deleting can't be undone, so please tap the red “Delete permanently” button to confirm." });
      if (APPROVE_WORDS.test(text) && planTotal(openRun) >= BIG_MINOR) return push({ role: "agent", text: "That's a large amount, so please tap the Approve button on the plan to confirm it." });
      return decide(openRun, APPROVE_WORDS.test(text) ? "approve" : "reject");
    }
    send(text);
  };
  const reset = () => { setThread([]); setRuns({}); setInput(""); try { sessionStorage.removeItem(STORE); } catch { /* ignore */ } };

  if (!ENABLED || !token || (off && !open) || HIDDEN.some(p => pathname === p || pathname?.startsWith(`${p}/`))) return null;
  const ctxGroup = groups.find(g => g._id === ctxId);
  const placeholder = openRun?.status === "clarification_required" ? "Reply to Autopilot…" : openRun?.status === "waiting_approval" ? "Approve above, or tell me what to change…" : "Tell Autopilot what to do…";

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button ref={launcherRef} initial={reduceMotion ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} onClick={() => setOpen(true)} aria-label="Open Autopilot" aria-expanded={open} aria-controls="autopilot-panel" className={styles.launcher}>
            <span className={styles.launcherIcon} aria-hidden="true"><Sparkles size={23} strokeWidth={1.65} /></span>
            <span className={styles.launcherLabel} aria-hidden="true"><span className="block text-[13px] font-semibold tracking-tight">Ask Autopilot</span><span className="mt-0.5 block text-[10px] font-normal opacity-70">{openRun ? "Your plan needs a look" : "A little help with expenses"}</span></span>
            {openRun && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-300" />}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section id="autopilot-panel" role="dialog" aria-label="Autopilot" initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ type: "spring", damping: 28, stiffness: 320 }} className={`${styles.panel} fixed inset-0 z-[70] flex flex-col overflow-hidden sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(740px,calc(100dvh-2.5rem))] sm:w-[440px] sm:rounded-[28px] sm:border sm:border-border`}>
            <header className={`${styles.header} shrink-0 border-b border-border px-5 pb-3.5 pt-4`}>
              <div className="flex items-center gap-3">
                <Mark size={38} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-semibold leading-none tracking-tight">Autopilot</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">{connection === "ready" ? (caps?.ai?.mode === "local" ? "Basic mode · you’re in control" : "Plan together. You’re in control.") : connection === "error" ? "Connection needs a quick retry" : connection === "disabled" ? "Switched off on this server" : "Connecting securely…"}</p>
                </div>
                {thread.length > 0 && <button disabled={busy} onClick={reset} aria-label="New chat" title="New chat" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Plus className="h-4 w-4" /></button>}
                <button onClick={() => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); }} aria-label="Close Autopilot" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Working in</span>
                <GroupPicker groups={groups} value={ctxId} onChange={setCtxId} />
              </div>
            </header>

            <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5" role="log" aria-label="Autopilot conversation" aria-live="off">
              {thread.length === 0 && (
                <div className={styles.welcome}>
                  <span className={styles.eyebrow}><Sparkles className="h-3 w-3" /> Less admin. More living.</span>
                  <h3 className="mt-4 text-[30px] font-semibold leading-[1.12] tracking-[-0.04em]">Money stuff,<br /><span className="text-muted-foreground">a little easier.</span></h3>
                  <p className="mt-3 max-w-[320px] text-[13px] leading-[21px] text-muted-foreground">A trip, a dinner, or the monthly bills. Tell me what you need—in English or Hinglish.</p>
                  <div className={styles.shortcuts}>
                    {EXAMPLES.map(({ icon: Icon, label, hint, text }) => (
                      <button key={label} type="button" onClick={() => { setInput(text); inputRef.current?.focus(); }} disabled={busy} className={styles.shortcut}>
                        <span className={styles.shortcutIcon}><Icon className="h-4 w-4" /></span>
                        <span><span className="block text-[13px] font-semibold">{label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{hint}</span></span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.trust}><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>You review the plan before anything changes.<br />No automatic payments. No surprises.</span></div>
                </div>
              )}
              {thread.map(item => (
                <div key={item.id}>
                  {item.role === "user" && <Bubble mine>{item.text}</Bubble>}
                  {item.role === "agent" && item.text && (
                    <div className="space-y-2">
                      <Bubble className={item.error ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : ""}>{item.error && <AlertTriangle className="-mt-0.5 mr-1.5 inline h-3.5 w-3.5" />}{item.text}</Bubble>
                      {item.retry && <button disabled={busy} onClick={() => send(item.retry.message, { requestKey: item.retry.requestKey, parentRunId: item.retry.parentRunId, groupId: item.retry.groupId, answers: item.retry.answers, reuse: item.retry.reuse, silent: true })} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"><RotateCcw className="h-3 w-3" /> Try again</button>}
                    </div>
                  )}
                  {item.role === "agent" && item.runId && runs[item.runId] && <RunMessage run={runs[item.runId]} nameOf={id => groups.find(g => g._id === id)?.name || runs[item.runId].plan?.steps?.find(s => s.type === "create_group")?.payload.name || "Group"} superseded={supersededIds.has(item.runId)} busy={busy} onDecide={decide} onAnswer={answer} onResume={resume} onCancel={cancel} onChip={c => c === "Add an expense" ? (setInput("Add  paid by me, split equally"), inputRef.current?.focus()) : c === "My total balance" ? send("What's my total balance across all groups?", { groupId: null, parentRunId: null }) : send("Who owes whom? Show the simplest settle-up")} onEdit={canEdit ? edit : undefined} onRetry={r => send(r.message)} />}
                </div>
              ))}
              {busy && thread.at(-1)?.role === "user" && <Bubble><span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</span></Bubble>}
            </div>

            <p role="status" aria-live="polite" className="sr-only">{busy ? "Autopilot is thinking." : announce}</p>
            {connection === "disabled" && <div role="alert" className="mx-4 mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5">Autopilot is switched off on this server right now. Your groups and expenses are unaffected.</div>}
            {connection === "error" && <div role="alert" className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs"><span className="flex-1">Couldn’t connect. Your draft is still here.</span><button onClick={() => setConnectAttempt(n => n + 1)} className="font-semibold underline">Retry connection</button></div>}
            <form onSubmit={submit} className={`${styles.composer} shrink-0 border-t border-border px-4 pt-3`}>
              <div className={`${styles.input} flex items-end gap-2 rounded-2xl border border-border bg-card py-1.5 pl-3.5 pr-1.5 transition`}>
                <textarea ref={inputRef} rows={1} value={input} maxLength={1500} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
                  placeholder={placeholder} aria-label="Message Autopilot" className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground/70" />
                <button disabled={busy || !caps || connection !== "ready" || (input.trim().length < 3 && !(openRun?.status === "waiting_approval" && (APPROVE_WORDS.test(input.trim()) || REJECT_WORDS.test(input.trim()))))} aria-label="Send" className={`${styles.send} inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition active:scale-90 disabled:opacity-40`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">{busy ? "Preparing your next step…" : "Review first · approve when you’re ready"}</p>
              {ctxGroup && <p className="mt-2 px-1 text-[11px] text-muted-foreground">Changes apply to <span className="font-medium text-foreground">{ctxGroup.name}</span> unless you say otherwise.</p>}
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
