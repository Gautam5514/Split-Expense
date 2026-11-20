"use client";

import AutopilotMark from "@/components/autopilot/AutopilotMark";

// Autopilot as a full page: the same conversation as the floating chat, with
// room for what a small panel can't show - every group and where you stand in
// it, past requests, budget alerts, and a library of things to ask.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight, BellRing, Check, CheckCircle2, CircleDollarSign, Clock3, History, Layers, ListChecks, Loader2, Mail, Mic,
  PanelRightOpen, PiggyBank, Plus, Receipt, RefreshCw, Scale, ShieldCheck, Trash2, Users, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AUTOPILOT_ENABLED } from "@/lib/autopilotConfig";
import { useAutopilotSession, OPEN_STATES } from "./useAutopilotSession";
import { Composer, ConnectionNotice, GroupAvatar, GroupPicker, Thread } from "./parts";
import { STATUS, money } from "./format";
import { activityHeadline, runActivity } from "./activity";
import { loadBriefing, readBriefing } from "./briefing";
import { launchIfCold } from "./AutopilotLaunch";
import styles from "./AutopilotWorkspace.module.css";

// Things to ask, by what the user is trying to get done. Tapping one puts it in
// the box to edit; nothing is sent until they press send.
const LIBRARY = [
  {
    id: "start", label: "Start something", icon: Users, items: [
      { title: "Plan a trip", hint: "Group, people and a budget in one go", text: "Create group Goa Trip with Aman and Priya, budget 40000" },
      { title: "Set up a flat", hint: "A group for rent and monthly bills", text: "Create group Flat 4B with Riya and Karan" },
      { title: "Add people", hint: "By name, or by email for someone new", text: "Add Karan to this group" },
    ],
  },
  {
    id: "bills", label: "Add bills", icon: Receipt, items: [
      { title: "Split a dinner", hint: "Equal shares, paid by you", text: "Dinner 3600 paid by me, split equally" },
      { title: "Leave someone out", hint: "Only the people who were there", text: "Cab 640 paid by me, leave out Rahul" },
      { title: "Split with one person", hint: "Just the two of you", text: "Hotel 9500 paid by me, split with Aman" },
    ],
  },
  {
    id: "balances", label: "Know where you stand", icon: Scale, items: [
      { title: "Who owes whom?", hint: "The fewest payments to settle up", text: "Who owes whom? Show the simplest settle-up" },
      { title: "My total balance", hint: "Across every group", text: "What's my total balance across all groups?", global: true },
      { title: "Recent expenses", hint: "The latest bills in this group", text: "List the last 10 expenses" },
    ],
  },
  {
    id: "budget", label: "Watch the budget", icon: PiggyBank, items: [
      { title: "Set a budget with alerts", hint: "Hear about it at 75% and 90%", text: "Set the budget to 25000 and alert me at 75 and 90" },
      { title: "How are we doing?", hint: "Spending so far, by category", text: "Summarise spending in this group" },
    ],
  },
  {
    id: "wrap", label: "Wrap up", icon: ListChecks, items: [
      { title: "Complete the group", hint: "Close a finished trip", text: "Mark this group as completed" },
      { title: "Send the statement", hint: "A PDF to everyone by email", text: "Email everyone the final statement" },
    ],
  },
  {
    id: "fix", label: "Fix a mistake", icon: Trash2, items: [
      { title: "Remove the last bill", hint: "Only bills you added", text: "Delete the last expense" },
      { title: "Remove a bill by name", hint: "I'll ask if more than one matches", text: "Delete the dinner expense" },
    ],
  },
];
const HINGLISH = ["Goa trip mein 1200 ka dinner add karo", "Kaun kisko kitna dega?", "Last expense hata do"];

const ago = (date) => {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Up late?" : h < 12 ? "Good morning." : h < 17 ? "Good afternoon." : "Good evening."; };
const amount = (value, currency = "INR") => money(Math.round(Math.abs(Number(value) || 0) * 100), currency);

function Orb({ size = 44, busy }) {
  return (
    <span style={{ width: size, height: size }} className={`${styles.orb} ${busy ? styles.orbBusy : ""} shrink-0`} aria-hidden="true">
      <AutopilotMark size={size * 0.74} />
    </span>
  );
}

function BalanceText({ value, currency }) {
  const v = Number(value) || 0;
  if (Math.abs(v) < 0.01) return <span className="text-[11px] text-muted-foreground">Settled</span>;
  return <span className={`text-[11px] font-semibold ${v > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{v > 0 ? "+" : "−"}{amount(v, currency)}</span>;
}

/** Left rail: which group Autopilot is working in, and earlier requests. */
function ContextRail({ ap, balances, history, historyState, onPick }) {
  const { groups, ctxId, setCtxId, busy } = ap;
  const waiting = history.filter(r => OPEN_STATES.includes(r.status));
  const recent = history.filter(r => !OPEN_STATES.includes(r.status)).slice(0, 12);
  const nameOf = id => groups.find(g => g._id === String(id))?.name;
  const Row = ({ run }) => (
    <button type="button" disabled={busy} onClick={() => onPick(run._id)} className={styles.historyRow} title="Open this request">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS[run.status]?.dot || "bg-zinc-400"}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-foreground">{run.message}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{STATUS[run.status]?.label || run.status} · {nameOf(run.groupId) ? `${nameOf(run.groupId)} · ` : ""}{ago(run.createdAt)}</span>
      </span>
    </button>
  );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-4 pb-2">
        <button type="button" disabled={busy} onClick={() => { ap.reset(); ap.focusInput(); }} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#176e61] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#11594f] active:scale-[.98] disabled:opacity-50">
          <Plus className="h-4 w-4" /> New request
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className={`${styles.railLabel} px-2 pb-2 pt-3`}>Working in</p>
        <ul className="space-y-0.5" role="listbox" aria-label="Group Autopilot works in">
          {[null, ...groups].map(g => {
            const on = (g?._id || "") === ctxId;
            return (
              <li key={g?._id || "all"} role="option" aria-selected={on}>
                <button type="button" onClick={() => setCtxId(g?._id || "")} className={`flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition ${on ? "bg-[#2dd4bf1c] ring-1 ring-[#34a89366]" : "hover:bg-foreground/[0.04]"}`}>
                  <GroupAvatar group={g} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{g ? g.name : "All groups"}</span>
                    {g ? <BalanceText value={balances?.perGroup?.[g._id]} currency={g.settings?.currency} /> : <span className="text-[11px] text-muted-foreground">Or start a new one</span>}
                  </span>
                  {on && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#148575] dark:text-[#7be0c7]" />}
                </button>
              </li>
            );
          })}
        </ul>

        {waiting.length > 0 && (
          <>
            <p className={`${styles.railLabel} flex items-center gap-1.5 px-2 pb-1 pt-5 !text-amber-600 dark:!text-amber-400`}><Clock3 className="h-3 w-3" /> Waiting for you</p>
            {waiting.map(run => <Row key={run._id} run={run} />)}
          </>
        )}
        <p className={`${styles.railLabel} flex items-center gap-1.5 px-2 pb-1 pt-5`}><History className="h-3 w-3" /> Recent requests</p>
        {historyState === "loading" && <p className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</p>}
        {historyState === "error" && <p className="px-2 py-2 text-xs text-muted-foreground">Couldn’t load your earlier requests.</p>}
        {historyState === "ready" && !recent.length && !waiting.length && <p className="px-2 py-2 text-xs leading-5 text-muted-foreground">Nothing yet. Requests from the last 30 days show up here, so you can reopen any of them.</p>}
        {recent.map(run => <Row key={run._id} run={run} />)}
      </div>
    </div>
  );
}

const NODE = {
  done: { icon: Check, cls: "bg-emerald-500 text-white" },
  now: { icon: Loader2, cls: "bg-[#176e61] text-white", spin: true },
  todo: { icon: null, cls: "border border-border bg-background" },
  wait: { icon: Clock3, cls: "bg-amber-500 text-white" },
  bad: { icon: X, cls: "bg-rose-500 text-white" },
};

/** What Autopilot is doing, and has done, for the requests in this conversation. Sits straight on the panel, no box. */
function ActivityFeed({ ap }) {
  const reduceMotion = useReducedMotion();
  const { thread, runs, busy } = ap;
  // Requests in this conversation, newest first; ones replaced by a follow-up are folded into it.
  const asked = thread.filter(t => t.runId && runs[t.runId] && !ap.supersededIds.has(t.runId)).map(t => runs[t.runId]).reverse();
  if (!asked.length && !busy) return null;
  const [current, ...earlier] = asked;
  const items = current ? runActivity(current) : [];
  const live = busy || items.some(x => x.state === "now");
  const waiting = items.some(x => x.state === "wait");
  const done = items.filter(x => x.state === "done").length;
  const total = items.filter(x => x.state !== "wait" && x.state !== "bad").length;
  return (
    <section aria-label="What Autopilot is doing">
      <p className={`${styles.railLabel} flex items-center gap-2`}>
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-sky-500" : waiting ? "bg-amber-500" : "bg-emerald-500"}`} />
        {live ? "Working" : waiting ? "Your turn" : "Activity"}
      </p>
      {busy && !current && <p className="mt-4 flex items-center gap-2.5 text-[14px]"><Loader2 className="h-4 w-4 animate-spin text-[#148575]" /> Understanding your request…</p>}
      {current && (
        <>
          <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight" title={current.message}>{current.message}</p>
          {total > 1 && (
            <div className="mt-3 flex items-center gap-2.5" aria-hidden="true">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-[#14b8a6]" initial={false} animate={{ width: `${(done / total) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} /></div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{done}/{total}</span>
            </div>
          )}
          <ol className="relative mt-5 space-y-3.5 before:absolute before:bottom-3 before:left-[9.5px] before:top-3 before:w-px before:bg-border">
            {items.map((item, i) => {
              const node = NODE[item.state] || NODE.todo;
              const tone = item.state === "wait" ? "text-amber-700 dark:text-amber-300 font-semibold" : item.state === "bad" ? "text-rose-600 dark:text-rose-400 font-medium" : item.state === "now" ? "font-semibold text-foreground" : item.state === "todo" ? "text-muted-foreground" : "text-foreground/80";
              return (
                <motion.li key={item.id} initial={reduceMotion ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.04 }} className="relative flex items-start gap-3">
                  <span className={`relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${node.cls}`}>{node.icon && <node.icon className={`h-3 w-3 ${node.spin ? "animate-spin" : ""}`} strokeWidth={3} />}</span>
                  <span className={`min-w-0 text-[14px] leading-5 ${tone}`}>{item.text}</span>
                </motion.li>
              );
            })}
          </ol>
        </>
      )}
      {earlier.length > 0 && (
        <div className="mt-7 border-t border-border/70 pt-5">
          <p className={styles.railLabel}>Earlier in this chat</p>
          <ul className="mt-3 space-y-3">
            {earlier.slice(0, 4).map(run => {
              const last = runActivity(run).at(-1);
              return (
                <li key={run._id} className="flex items-start gap-2.5 text-[13px] leading-5">
                  <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${last?.state === "bad" ? "bg-rose-500" : last?.state === "wait" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span className="min-w-0"><span className="block truncate text-foreground/85">{run.message}</span><span className="block truncate text-[12px] text-muted-foreground">{last?.text}</span></span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Right rail: what Autopilot is doing, plus budget alerts when there are any. Empty until work starts. */
function InsightRail({ ap, monitors, onStopRule, onCheckBudgets, checking }) {
  const { groups } = ap;
  const nameOf = id => groups.find(g => g._id === String(id))?.name || "Group";
  const rules = (monitors?.rules || []).filter(r => r.enabled);
  const notices = (monitors?.notices || []).slice(0, 4);
  return (
    <div className="h-full space-y-7 overflow-y-auto px-6 py-6">
      <ActivityFeed ap={ap} />

      {(rules.length > 0 || notices.length > 0) && (
        <section className="border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`${styles.railLabel} flex items-center gap-1.5`}><BellRing className="h-3 w-3" /> Budget watch</p>
            <button type="button" disabled={checking} onClick={onCheckBudgets} title="Check budgets now" aria-label="Check budgets now" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} /></button>
          </div>
          {rules.length > 0 && (
            <ul className="mt-3 space-y-2.5">
              {rules.map(rule => (
                <li key={rule._id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{nameOf(rule.groupId)}</span>
                    <span className="mt-1 flex flex-wrap gap-1">{(rule.thresholds || []).map(t => <span key={t} className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">{t}%</span>)}</span>
                  </span>
                  <button type="button" onClick={() => onStopRule(rule)} className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-muted">Stop</button>
                </li>
              ))}
            </ul>
          )}
          {notices.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-border pt-3">
              {notices.map(n => <li key={n._id} className="flex items-start gap-2 text-xs leading-5"><PiggyBank className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /><span>{n.message}<span className="block text-[10px] text-muted-foreground">{ago(n.createdAt)}</span></span></li>)}
            </ul>
          )}
        </section>
      )}

    </div>
  );
}

/** Dictation, where the browser supports it. Text lands in the box to review; it is never sent by itself. */
function useDictation(onText) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const sink = useRef(onText);
  useEffect(() => { sink.current = onText; }, [onText]);
  useEffect(() => { setSupported(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)); return () => rec.current?.abort?.(); }, []);
  const toggle = useCallback(() => {
    if (rec.current) { rec.current.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN"; // also picks up Hinglish reasonably well
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = e => { const text = Array.from(e.results).map(x => x[0]?.transcript || "").join(" ").trim(); if (text) sink.current(text); };
    r.onend = () => { rec.current = null; setListening(false); };
    r.onerror = () => { rec.current = null; setListening(false); };
    rec.current = r;
    setListening(true);
    try { r.start(); } catch { rec.current = null; setListening(false); }
  }, []);
  return { supported, listening, toggle };
}

export default function AutopilotWorkspace() {
  const reduceMotion = useReducedMotion();
  const { token, loading: authLoading } = useAuth();
  const [balances, setBalances] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState("loading");
  const [monitors, setMonitors] = useState(null);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState(LIBRARY[0].id);
  const [sheet, setSheet] = useState(null); // "context" | "insights" on small screens

  // Side data is a convenience: any of it failing must never block the conversation.
  const refreshSide = useCallback(() => {
    api.get("/agent/runs").then(({ data }) => { setHistory(Array.isArray(data) ? data : []); setHistoryState("ready"); }).catch(() => setHistoryState(s => (s === "ready" ? s : "error")));
    api.get("/balances/summary").then(({ data }) => setBalances(data)).catch(() => {});
    api.get("/agent/monitors").then(({ data }) => setMonitors(data)).catch(() => {});
  }, []);
  const refreshTimer = useRef(null);
  const onRunSettled = useCallback(() => { clearTimeout(refreshTimer.current); refreshTimer.current = setTimeout(refreshSide, 600); }, [refreshSide]);
  useEffect(() => () => clearTimeout(refreshTimer.current), []);

  const ap = useAutopilotSession({ active: true, onRunSettled });
  const { connection, thread, busy, ctxGroup, openRun, latestRun, prefill, focusInput, setInput } = ap;

  // Open already informed: the launch sequence has just loaded this, so reuse it instead of asking twice.
  useEffect(() => {
    if (!token || !AUTOPILOT_ENABLED) return;
    let live = true;
    launchIfCold(); // a direct visit gets the same opening as the navbar button
    loadBriefing().all.then(({ balances: b, runs }) => {
      if (!live) return;
      if (b) setBalances(b);
      if (Array.isArray(runs)) { setHistory(runs); setHistoryState("ready"); } else setHistoryState("error");
    });
    api.get("/agent/monitors").then(({ data }) => live && setMonitors(data)).catch(() => {});
    return () => { live = false; };
  }, [token]);

  // Links can hand over a draft: /autopilot?prompt=...&groupId=... (add &send=1 to send it straight away).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");
    const groupId = params.get("groupId");
    if (prompt || groupId) prefill({ prompt: prompt || undefined, groupId: groupId || undefined, autoSend: params.get("send") === "1" });
  }, [prefill]);

  // Tips and reminders opened while this page is showing land here, not in the floating chat.
  useEffect(() => {
    const onOpen = e => { prefill(e.detail || {}); focusInput(); };
    window.addEventListener("autopilot:open", onOpen);
    return () => window.removeEventListener("autopilot:open", onOpen);
  }, [prefill, focusInput]);

  // "/" jumps to the message box from anywhere on the page.
  useEffect(() => {
    const onKey = e => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      focusInput();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusInput]);
  useEffect(() => { if (!sheet) return; const k = e => { if (e.key === "Escape") setSheet(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [sheet]);

  const dictation = useDictation(useCallback(text => { setInput(prev => (prev ? `${prev.trimEnd()} ${text}` : text).slice(0, 1500)); focusInput(); }, [setInput, focusInput]));
  const lastMine = useMemo(() => [...thread].reverse().find(t => t.role === "user")?.text || "", [thread]);
  const stopRule = async (rule) => {
    try { await api.patch(`/agent/monitors/${rule._id}`, { enabled: false }); setMonitors(m => m && { ...m, rules: m.rules.map(r => (r._id === rule._id ? { ...r, enabled: false } : r)) }); } catch { /* the rule stays listed; they can try again */ }
  };
  const checkBudgets = async () => {
    setChecking(true);
    try { await api.post("/agent/monitors/check"); const { data } = await api.get("/agent/monitors"); setMonitors(data); } catch { /* keep what is shown */ }
    finally { setChecking(false); }
  };
  const pick = (item) => {
    setInput(item.text);
    if (item.global) ap.setCtxId("");
    focusInput();
  };
  const openPast = (id) => { setSheet(null); ap.openPastRun(id); };

  if (!AUTOPILOT_ENABLED) return <Gate title="Autopilot is switched off" text="It isn’t enabled for this site right now. Your groups and expenses are unaffected." />;
  if (authLoading) return <div className="flex h-[60dvh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!token) return <Gate title="Sign in to use Autopilot" text="Autopilot plans trips, splits bills and works out who owes whom inside your own groups, so it needs your account." cta={{ href: "/login", label: "Sign in" }} more={{ href: "/features/autopilot", label: "See what it does" }} />;

  const section = LIBRARY.find(s => s.id === tab) || LIBRARY[0];
  const waitingCount = history.filter(r => OPEN_STATES.includes(r.status)).length;
  // What the agent is doing right now, in plain words. No model or provider names.
  const { text: activity, tone } = activityHeadline({ connection, busy, run: thread.length ? latestRun : null });
  // Shortcuts for the moment: they step aside while a plan is open or the user is typing.
  const quick = openRun || ap.input.trim()
    ? []
    : ctxGroup
      ? [{ icon: Scale, label: "Who owes whom?", text: "Who owes whom? Show the simplest settle-up", send: true }, { icon: PiggyBank, label: "Summarise spending", text: "Summarise spending in this group", send: true }, { icon: ListChecks, label: "Recent expenses", text: "List the last 10 expenses", send: true }, { icon: Receipt, label: "Add a bill", text: "Add  paid by me, split equally" }]
      : [{ icon: CircleDollarSign, label: "My total balance", text: "What's my total balance across all groups?", send: true }, { icon: Users, label: "Plan a trip", text: "Create group Goa Trip with Aman and Priya, budget 40000" }, { icon: Receipt, label: "Add a bill", text: "Add  paid by me, split equally" }];

  // What to offer first, from what was just read: unfinished plans, then the biggest debt either way.
  const brief = readBriefing({ groups: ap.groups, balances, runs: history });
  const settleIn = (group) => { ap.setCtxId(group._id); ap.send("Who owes whom? Show the simplest settle-up", { groupId: group._id, parentRunId: null }); };
  const forYou = [
    brief.waiting[0] && { key: "waiting", tone: "amber", icon: Clock3, title: brief.waiting.length === 1 ? "One plan is waiting for you" : `${brief.waiting.length} plans are waiting for you`, hint: `“${brief.waiting[0].message}”`, action: "Review it", run: () => openPast(brief.waiting[0]._id) },
    brief.youOwe[0] && { key: "owe", tone: "rose", icon: Scale, title: `Settle up in ${brief.youOwe[0].group.name}`, hint: `You owe ${amount(brief.youOwe[0].balance, brief.youOwe[0].group.settings?.currency)} there.`, action: "Show who to pay", run: () => settleIn(brief.youOwe[0].group) },
    brief.owedToYou[0] && { key: "owed", tone: "emerald", icon: CircleDollarSign, title: `Collect in ${brief.owedToYou[0].group.name}`, hint: `${amount(brief.owedToYou[0].balance, brief.owedToYou[0].group.settings?.currency)} is owed to you.`, action: "See who owes you", run: () => settleIn(brief.owedToYou[0].group) },
    connection === "ready" && brief.groupCount === 0 && { key: "first", tone: "teal", icon: Users, title: "Create your first group", hint: "A trip, a flat or a team. Add people as you go.", action: "Start one", run: () => pick({ text: "Create group Goa Trip with Aman and Priya, budget 40000" }) },
  ].filter(Boolean).slice(0, 3);
  const TONE = { amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400", rose: "border-rose-500/25 bg-rose-500/[0.07] text-rose-600 dark:text-rose-400", emerald: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-400", teal: "border-teal-500/25 bg-teal-500/[0.07] text-teal-600 dark:text-teal-400" };
  // One sentence that says where things stand, in place of a generic welcome.
  const standing = !brief.hasBalances || !brief.groupCount ? null : [
    `You’re in ${brief.groupCount} group${brief.groupCount === 1 ? "" : "s"}.`,
    brief.totalOwed < 0.01 && brief.totalOwe < 0.01 ? "Everything is settled." : [brief.totalOwed >= 0.01 && `${amount(brief.totalOwed)} is owed to you`, brief.totalOwe >= 0.01 && `you owe ${amount(brief.totalOwe)}`].filter(Boolean).join(" and ").replace(/^y/, "Y") + ".",
  ].join(" ");

  // The side panel appears when work starts (or a budget alert exists); otherwise the chat has the room.
  const hasInsights = busy || thread.some(t => t.runId) || (monitors?.rules || []).some(r => r.enabled) || (monitors?.notices || []).length > 0;

  const contextRail = <ContextRail ap={ap} balances={balances} history={history} historyState={historyState} onPick={openPast} />;
  const insightRail = <InsightRail ap={ap} monitors={monitors} onStopRule={stopRule} onCheckBudgets={checkBudgets} checking={checking} />;

  return (
    <div className={`${styles.shell} flex h-[calc(100dvh-72px)] overflow-hidden text-foreground md:h-[calc(100dvh-64px)]`}>
      <div className={styles.aurora} />

      <aside className={`${styles.rail} hidden w-[292px] shrink-0 border-r border-border lg:block`} aria-label="Groups and earlier requests">{contextRail}</aside>

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Autopilot conversation">
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
          <Orb size={40} busy={busy} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold leading-none tracking-tight">Autopilot</h1>
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === "busy" ? "animate-pulse bg-sky-500" : tone === "wait" ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span className={tone === "ok" ? "" : "font-medium text-foreground"}>{activity}</span>{ctxGroup && <><span aria-hidden="true">·</span><span className="truncate">{ctxGroup.name}</span></>}
            </p>
          </div>
          <button type="button" onClick={() => setSheet("context")} className="relative rounded-full border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden" aria-label="Groups and earlier requests">
            <Layers className="h-4 w-4" />
            {waitingCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background" />}
          </button>
          {hasInsights && <button type="button" onClick={() => setSheet("insights")} className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground xl:hidden" aria-label="What Autopilot is doing"><PanelRightOpen className="h-4 w-4" /></button>}
        </header>

        <Thread ap={ap} className="px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl pb-4">
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#148575] dark:text-[#7be0c7]"><AutopilotMark className="h-3.5 w-3.5" /> {greeting()}</p>
              <h2 className={`${styles.heroTitle} mt-4`}>Tell me what happened.<br /><span className={styles.heroAccent}>I’ll handle the maths.</span></h2>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">{standing && <span className="font-medium text-foreground">{standing} </span>}Say what you need the way you’d say it to a friend, in English or Hinglish. I’ll show you the plan, and nothing changes until you approve it.</p>
            </motion.div>

            {forYou.length > 0 && (
              <section className="mt-7" aria-label="For you right now">
                <p className={`${styles.railLabel} mb-2.5`}>For you right now</p>
                <div className={`grid gap-3 ${forYou.length > 1 ? "sm:grid-cols-2" : ""} ${forYou.length > 2 ? "lg:grid-cols-3" : ""}`}>
                  {forYou.map(({ key, tone, icon: Icon, title, hint, action, run }, i) => (
                    <motion.button key={key} type="button" disabled={busy || connection !== "ready"} onClick={run} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 + i * 0.08, ease: [0.22, 1, 0.36, 1] }} className={`group flex flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-60 ${TONE[tone]}`}>
                      <Icon className="h-4 w-4" />
                      <span className="mt-3 block text-[14px] font-semibold text-foreground">{title}</span>
                      <span className="mt-1 block truncate text-[12px] leading-5 text-muted-foreground">{hint}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold">{action} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-8 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Things to ask">
              {LIBRARY.map(s => <button key={s.id} type="button" role="tab" aria-selected={s.id === tab} onClick={() => setTab(s.id)} className={`${styles.tab} ${s.id === tab ? styles.tabOn : ""}`}>{s.label}</button>)}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={section.id} role="tabpanel" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map(item => (
                  <button key={item.title} type="button" disabled={busy} onClick={() => pick(item)} className={styles.command}>
                    <span className={styles.commandIcon}><section.icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold">{item.title}</span>
                      <span className="mt-1 block text-[12px] leading-[18px] text-muted-foreground">{item.hint}</span>
                      <span className="mt-2.5 block truncate font-mono text-[11px] text-foreground/55">“{item.text}”</span>
                    </span>
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Hinglish works too:</span>
              {HINGLISH.map(text => <button key={text} type="button" disabled={busy} onClick={() => pick({ text })} className={styles.chip}>{text}</button>)}
            </div>
          </div>
        </Thread>

        <p role="status" aria-live="polite" className="sr-only">{busy ? "Autopilot is thinking." : ap.announce}</p>
        <div className="shrink-0 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 sm:px-8 md:pb-5">
          <div className="mx-auto max-w-3xl">
            <ConnectionNotice ap={ap} className="mb-3" />
            <AnimatePresence initial={false}>
              {quick.length > 0 && (
                <motion.div key="quick" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 6 }} transition={{ duration: 0.2 }} className="mb-3 flex gap-2 overflow-x-auto pb-0.5">
                  {quick.map(({ icon: Icon, ...q }) => <button key={q.label} type="button" disabled={busy || connection !== "ready"} onClick={() => (q.send ? ap.send(q.text, ctxGroup ? {} : { groupId: null, parentRunId: null }) : (setInput(q.text), focusInput()))} className={styles.chip}><Icon className="h-3.5 w-3.5 text-[#148575] dark:text-[#7be0c7]" />{q.label}</button>)}
                </motion.div>
              )}
            </AnimatePresence>
            <form onSubmit={ap.submit} className={`${styles.composerWrap} p-2.5`}>
              <Composer
                ap={ap}
                rows={2}
                onKeyDown={e => { if (e.key === "ArrowUp" && !ap.input && lastMine) { e.preventDefault(); setInput(lastMine); } }}
                toolbar={
                  <>
                    {/* Where the request will land, changeable right here. */}
                    <GroupPicker groups={ap.groups} value={ap.ctxId} onChange={ap.setCtxId} up />
                    <span className="hidden min-w-0 truncate text-[11px] text-muted-foreground sm:inline" aria-live="polite">
                      {dictation.listening ? "Listening…" : busy ? "Working on it…" : ap.input.trim() ? <><kbd className={styles.kbd}>Enter</kbd> to send</> : "You approve every change"}
                    </span>
                  </>
                }
                before={dictation.supported && (
                  <button type="button" onClick={dictation.toggle} aria-pressed={dictation.listening} aria-label={dictation.listening ? "Stop dictation" : "Dictate your request"} title={dictation.listening ? "Stop" : "Speak instead of typing"} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${dictation.listening ? styles.micOn : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              />
            </form>
          </div>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {hasInsights && (
          <motion.aside key="insights" initial={reduceMotion ? false : { opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: 28 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className={`${styles.rail} hidden w-[320px] shrink-0 border-l border-border xl:block`} aria-label="What Autopilot is doing">{insightRail}</motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet && (
          <motion.div className={`fixed inset-0 z-[80] ${sheet === "context" ? "lg:hidden" : "xl:hidden"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close panel" onClick={() => setSheet(null)} className="absolute inset-0 bg-black/45" />
            <motion.div role="dialog" aria-label={sheet === "context" ? "Groups and earlier requests" : "What Autopilot is doing"} initial={reduceMotion ? false : { x: sheet === "context" ? -40 : 40 }} animate={{ x: 0 }} exit={reduceMotion ? undefined : { x: sheet === "context" ? -40 : 40 }} transition={{ type: "spring", damping: 30, stiffness: 320 }} className={`absolute inset-y-0 flex w-[min(340px,88vw)] flex-col bg-background shadow-2xl ${sheet === "context" ? "left-0 border-r" : "right-0 border-l"} border-border`}>
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">{sheet === "context" ? "Groups & requests" : "Activity"}</p>
                <button type="button" onClick={() => setSheet(null)} aria-label="Close" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1">{sheet === "context" ? contextRail : insightRail}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Gate({ title, text, cta, more }) {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Orb size={56} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {cta && <Link href={cta.href} className="rounded-full bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#11594f]">{cta.label}</Link>}
        {more && <Link href={more.href} className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-muted">{more.label}</Link>}
      </div>
    </div>
  );
}
