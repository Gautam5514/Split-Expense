"use client";

// One Autopilot conversation: capabilities, groups, the thread, its runs and
// every action on them. The floating chat and the full-page workspace both run
// on this, so a plan started in one continues in the other.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AUTOPILOT_ENABLED } from "@/lib/autopilotConfig";
import { STATUS, money } from "./format";
import { resetPeopleDirectory } from "./PersonAvatar";

export const STORE = "autopilot.thread.v1";
export const OPEN_STATES = ["clarification_required", "waiting_approval"];
export const APPROVE_WORDS = /^(approve[ds]?|yes|yep|yeah|ok(?:ay)?|confirm(?:ed)?|go ahead|do it|looks good|lgtm|haan|ha|ji|theek hai|kar do)[.!\s]*$/i;
export const REJECT_WORDS = /^(no|nope|nah|reject|cancel|not now|stop|don'?t|nahi|nahin|mat karo|rehne do)[.!\s]*$/i;
// At or above this (in minor units) a typed "yes" isn't enough: the user taps the button that names the amount.
const BIG_MINOR = 50_000_00;
const uuid = () => crypto.randomUUID();

export const isDeletePlan = run => (run.plan?.steps || []).some(s => s.type === "delete_expense" || s.type === "delete_group");
export const planTotal = run => (run.plan?.steps || []).filter(s => s.type === "create_expense").reduce((n, s) => n + (s.payload.amountMinor || 0), 0);
export const errText = (err) => {
  const code = err.response?.data?.code;
  if (code === "AUTOPILOT_DISABLED") return "Autopilot is switched off on the server right now. Your groups and expenses are unaffected.";
  if (err.response?.status === 429 || code === "RATE_LIMITED") return "You're going a little fast. Give it a few seconds and try again.";
  if (err.code === "ECONNABORTED") return "That took longer than expected. Nothing was changed. Try again in a moment.";
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.status >= 500) return "Something went wrong on our side. Nothing was changed. Try again in a moment.";
  return typeof navigator !== "undefined" && navigator.onLine === false ? "You're offline. Reconnect and try again." : "I couldn't reach the server. Check your connection and try again.";
};

// One capability check per page load, shared by every Autopilot entry point
// (launcher, navbar button, workspace), so none of them shows up on a server
// where Autopilot is off.
let capsPromise = null;
export const loadAutopilotCaps = () => (capsPromise ||= api.get("/agent/capabilities").then(r => r.data).catch(err => { capsPromise = null; throw err; }));

/** Forget the cached answer (sign-out, tests). */
export const resetAutopilotCaps = () => { capsPromise = null; };

/** Whether to show Autopilot entry points: false only when the flag or the server says off. */
export function useAutopilotAvailable() {
  const { token } = useAuth();
  const [off, setOff] = useState(false);
  useEffect(() => {
    if (!AUTOPILOT_ENABLED || !token) return;
    let live = true;
    loadAutopilotCaps().catch(err => { if (live && err.response?.data?.code === "AUTOPILOT_DISABLED") setOff(true); });
    return () => { live = false; };
  }, [token]);
  return AUTOPILOT_ENABLED && !!token && !off;
}

/**
 * @param {{ active: boolean, initialGroupId?: string, onRunSettled?: () => void }} options
 *   active: the conversation is on screen (boots the session on first true).
 */
export function useAutopilotSession({ active, initialGroupId = "", onRunSettled } = {}) {
  const { token, loading: authLoading } = useAuth();
  const [caps, setCaps] = useState(null);
  const [off, setOff] = useState(false);
  const [connection, setConnection] = useState("idle");
  const [connectAttempt, setConnectAttempt] = useState(0);
  const [restored, setRestored] = useState(false);
  const [groups, setGroups] = useState([]);
  const [ctxId, setCtxId] = useState(initialGroupId);
  const [thread, setThread] = useState([]);
  const [runs, setRuns] = useState({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingTick, setPendingTick] = useState(0);
  const [announce, setAnnounce] = useState("");
  const inputEl = useRef(null);
  const bindInput = useCallback(el => { inputEl.current = el; }, []);
  const focusInput = useCallback(() => inputEl.current?.focus(), []);
  const nextId = useRef(1);
  const booted = useRef(false);
  const handled = useRef(new Set()); // completed runs whose follow-ups already ran
  const pendingPrompt = useRef(null);
  const settled = useRef(onRunSettled);
  useEffect(() => { settled.current = onRunSettled; }, [onRunSettled]);

  // Hide entry points if the server says Autopilot is off; network blips still show them.
  useEffect(() => {
    if (!AUTOPILOT_ENABLED || !token) return;
    let live = true;
    loadAutopilotCaps().then(c => { if (live) setCaps(c); }).catch(err => { if (live && err.response?.data?.code === "AUTOPILOT_DISABLED") setOff(true); });
    return () => { live = false; };
  }, [token]);

  useEffect(() => { if (initialGroupId) setCtxId(initialGroupId); }, [initialGroupId]);

  /** A draft, a group, or an auto-sent request handed over from elsewhere in the app. */
  const prefill = useCallback((detail = {}) => {
    if (detail.autoSend && detail.prompt) { pendingPrompt.current = detail.prompt; setThread([]); setRuns({}); setPendingTick(t => t + 1); }
    else if (detail.prompt) setInput(String(detail.prompt).slice(0, 500));
    if (/^[a-f\d]{24}$/i.test(detail.groupId || "")) setCtxId(detail.groupId);
  }, []);

  const loadGroups = useCallback(async () => { const { data } = await api.get("/agent/groups"); setGroups(data); return data; }, []);

  // First time on screen: capabilities, groups, then restore the previous conversation from the server.
  useEffect(() => {
    if (!active || booted.current || !token || !AUTOPILOT_ENABLED) return;
    booted.current = true;
    setConnection("loading");
    (async () => {
      try {
        const [c] = await Promise.all([loadAutopilotCaps(), loadGroups()]);
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
  }, [active, token, loadGroups, connectAttempt]);

  useEffect(() => { if (!restored || !token || connection !== "ready") return; try { sessionStorage.setItem(STORE, JSON.stringify({ thread: thread.slice(-30) })); } catch { /* storage unavailable */ } }, [thread, restored, token, connection]);
  useEffect(() => {
    if (authLoading || token) return;
    setThread([]); setRuns({}); setCaps(null); setRestored(false); setConnection("idle"); booted.current = false;
    resetAutopilotCaps();
    resetPeopleDirectory();
    try { sessionStorage.removeItem(STORE); } catch { /* storage unavailable */ }
  }, [authLoading, Boolean(token)]);

  /** Forget the in-memory copy so the next time it's on screen it reloads the saved conversation. */
  const invalidate = useCallback(() => { booted.current = false; setRestored(false); setConnection("idle"); setThread([]); setRuns({}); }, []);

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
      if (!first) settled.current?.(run);
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
  const latestRun = [...thread].reverse().map(t => t.runId && runs[t.runId]).find(Boolean) || null;
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
      settled.current?.(data);
      // Only when the server really continued that plan (a new, separate request leaves it open).
      if (payload.parentRunId && String(data.parentRunId || "") === String(payload.parentRunId)) setRuns(r => r[payload.parentRunId] ? { ...r, [payload.parentRunId]: { ...r[payload.parentRunId], status: "cancelled", events: [...(r[payload.parentRunId].events || []), { type: "run.superseded" }] } } : r);
    } catch (err) {
      const disabled = err.response?.data?.code === "AUTOPILOT_DISABLED";
      if (disabled) setConnection("disabled");
      push({ role: "agent", text: errText(err), error: true, retry: disabled ? undefined : payload });
    } finally { setBusy(false); }
  }, [busy, ctxId, openRun, caps, connection]);

  // A request handed over with autoSend (e.g. "Let Autopilot set it up"): start a fresh chat and send it.
  useEffect(() => {
    if (!pendingPrompt.current || !caps || busy || connection !== "ready") return;
    const prompt = pendingPrompt.current;
    pendingPrompt.current = null;
    send(prompt, { groupId: null, parentRunId: null });
  }, [pendingTick, caps, busy, connection, send]);

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

  /** Put an earlier request (from history) on screen, replacing the current conversation. */
  const openPastRun = async (runId) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.get(`/agent/runs/${runId}`);
      if (data.status === "completed") handled.current.add(data._id);
      setRuns({ [data._id]: data });
      const a = nextId.current++, b = nextId.current++;
      setThread([{ id: a, role: "user", text: data.message }, { id: b, role: "agent", runId: data._id }]);
      if (data.groupId) setCtxId(String(data.groupId));
    } catch (err) { push({ role: "agent", text: errText(err), error: true }); }
    finally { setBusy(false); }
  };

  const onChip = c => c === "Add an expense"
    ? (setInput("Add  paid by me, split equally"), focusInput())
    : c === "My total balance" ? send("What's my total balance across all groups?", { groupId: null, parentRunId: null }) : send("Who owes whom? Show the simplest settle-up");
  const canSend = !busy && !!caps && connection === "ready" && (input.trim().length >= 3 || (openRun?.status === "waiting_approval" && (APPROVE_WORDS.test(input.trim()) || REJECT_WORDS.test(input.trim()))));
  const placeholder = openRun?.status === "clarification_required" ? "Reply to Autopilot…" : openRun?.status === "waiting_approval" ? "Approve above, or tell me what to change…" : "Tell Autopilot what to do…";

  return {
    token, caps, off, connection, retryConnection: () => setConnectAttempt(n => n + 1),
    groups, ctxId, setCtxId, ctxGroup: groups.find(g => g._id === ctxId),
    thread, runs, input, setInput, bindInput, focusInput, busy, announce,
    openRun, latestRun, supersededIds, canEdit, canSend, placeholder,
    send, submit, decide, resume, cancel, edit, answer, reset, prefill, invalidate, openPastRun, onChip, loadGroups,
  };
}
