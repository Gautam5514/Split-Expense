"use client";

// The pieces of an Autopilot conversation, shared by the floating chat and the
// full-page workspace.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUp, Check, Trash2, ChevronDown, Layers, Loader2, Mail, RotateCcw, PiggyBank } from "lucide-react";
import AutopilotMark from "./AutopilotMark";
import PlanSteps from "./PlanSteps";
import PersonAvatar from "./PersonAvatar";
import styles from "./AutopilotWidget.module.css";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { PEOPLE_COLORS, STATUS, STAGES, initials, stageFor, money, READ_STEPS } from "./format";
import { isDeletePlan, planTotal } from "./useAutopilotSession";

const STALLED_MS = 2 * 60_000;

// Shared Autopilot identity for assistant messages and workspace headers.
export function Mark({ size = 36, className = "" }) {
  return <span style={{ width: size, height: size }} className={`${styles.mark} ${className}`} aria-hidden="true">
    <AutopilotMark size={size * 0.74} />
  </span>;
}

// Group avatar: its own photo when it has one, otherwise the same glossy type tile as the New group popup.
export function GroupAvatar({ group, size = 28 }) {
  if (!group) return <span style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-[30%] bg-muted text-muted-foreground"><Layers style={{ width: size * 0.5, height: size * 0.5 }} /></span>;
  if (group.photo?.url) return <img src={group.photo.url} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-[30%] object-cover" />;
  return <GroupTypeIcon type={group.groupType} size={size} />;
}

export function GroupPicker({ groups, value, onChange, up = false }) {
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
          <motion.ul role="listbox" initial={{ opacity: 0, y: up ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: up ? 4 : -4 }} transition={{ duration: 0.12 }} className={`absolute left-0 z-20 ${up ? "bottom-full mb-2" : "top-full mt-1.5"} max-h-60 w-64 overflow-y-auto rounded-2xl border border-border bg-[var(--menu-solid)] p-1.5 shadow-xl`}>
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

export function MiniStages({ status }) {
  const { at, tone } = stageFor(status);
  const color = { active: "bg-primary", done: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" }[tone];
  return (
    <div className="flex items-center gap-1.5" aria-label={`Stage ${Math.min(at + 1, 5)} of 5: ${STAGES[Math.min(at, 4)]}`}>
      {STAGES.map((s, i) => <span key={s} title={s} className={`h-1 flex-1 rounded-full ${i < at ? (tone === "done" ? "bg-emerald-500" : "bg-primary") : i === at ? `${color} ${tone === "active" ? "animate-pulse" : ""}` : "bg-muted"}`} />)}
    </div>
  );
}

export function Bubble({ children, mine, className = "" }) {
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

export function Question({ q, disabled, onPick, onEmail }) {
  const [emailMode, setEmailMode] = useState(false);
  return (
    <div>
      <p className="text-[14px] leading-[22px] text-foreground/90">{q.text}</p>
      {q.options.length > 0 && !emailMode && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {q.options.map((o, i) => (
            <button key={o.value} disabled={disabled} onClick={() => onPick(q, o)} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:border-foreground/40 disabled:opacity-50">
              {q.kind === "person" && <PersonAvatar id={o.value} name={o.label} index={i} />}
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

export function RunMessage({ run, nameOf, superseded, busy, onDecide, onAnswer, onResume, onCancel, onChip, onRetry, onEdit }) {
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
  // A question that only reads the ledger gets an answer, without the plan pipeline around it.
  const answerOnly = plan?.steps?.length > 0 && plan.steps.every(st => READ_STEPS.includes(st.type));
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
          {!answerOnly && <MiniStages status={status} />}
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
          {!answerOnly && <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Done, and verified against your ledger.</p>}
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


/** The conversation log: messages, plans, questions and their actions. */
export function Thread({ ap, className = "", children }) {
  const reduceMotion = useReducedMotion();
  const scroller = useRef(null);
  const { thread, runs, busy, groups } = ap;
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduceMotion ? "instant" : "smooth" }); }, [thread, runs, busy, reduceMotion]);
  return (
    <div ref={scroller} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${className}`} role="log" aria-label="Autopilot conversation" aria-live="off">
      {thread.length === 0 && children}
      <div className="space-y-5">
        {thread.map(item => (
          <div key={item.id}>
            {item.role === "user" && <Bubble mine>{item.text}</Bubble>}
            {item.role === "agent" && item.text && (
              <div className="space-y-2">
                <Bubble className={item.error ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : ""}>{item.error && <AlertTriangle className="-mt-0.5 mr-1.5 inline h-3.5 w-3.5" />}{item.text}</Bubble>
                {item.retry && <button disabled={busy} onClick={() => ap.send(item.retry.message, { requestKey: item.retry.requestKey, parentRunId: item.retry.parentRunId, groupId: item.retry.groupId, answers: item.retry.answers, reuse: item.retry.reuse, silent: true })} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"><RotateCcw className="h-3 w-3" /> Try again</button>}
              </div>
            )}
            {item.role === "agent" && item.runId && runs[item.runId] && <RunMessage run={runs[item.runId]} nameOf={id => groups.find(g => g._id === id)?.name || runs[item.runId].plan?.steps?.find(s => s.type === "create_group")?.payload.name || "Group"} superseded={ap.supersededIds.has(item.runId)} busy={busy} onDecide={ap.decide} onAnswer={ap.answer} onResume={ap.resume} onCancel={ap.cancel} onChip={ap.onChip} onEdit={ap.canEdit ? ap.edit : undefined} onRetry={r => ap.send(r.message)} />}
          </div>
        ))}
        {busy && thread.at(-1)?.role === "user" && <Bubble><span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</span></Bubble>}
      </div>
    </div>
  );
}

/** Connection problems, shown just above the composer. */
export function ConnectionNotice({ ap, className = "" }) {
  if (ap.connection === "disabled") return <div role="alert" className={`rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 ${className}`}>Autopilot is switched off on this server right now. Your groups and expenses are unaffected.</div>;
  if (ap.connection === "error") return <div role="alert" className={`flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs ${className}`}><span className="flex-1">Couldn’t connect. Your draft is still here.</span><button onClick={ap.retryConnection} className="font-semibold underline">Retry connection</button></div>;
  return null;
}

/**
 * The message box. `before` renders left of the send button (e.g. a mic).
 * With `toolbar`, the field is stacked: text on top, then one row with the
 * toolbar on the left and the buttons on the right.
 */
export function Composer({ ap, rows = 1, before = null, toolbar = null, className = "", onKeyDown }) {
  const { bindInput, input, setInput, placeholder, canSend, busy, submit } = ap;
  const field = (
    <textarea ref={bindInput} rows={rows} value={input} maxLength={1500} onChange={e => setInput(e.target.value)}
      onKeyDown={e => { onKeyDown?.(e); if (e.defaultPrevented) return; if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
      placeholder={placeholder} aria-label="Message Autopilot" className={`max-h-40 min-h-[36px] flex-1 resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-muted-foreground/70 ${toolbar ? "w-full px-2 pb-1 pt-2 text-[15px] leading-6" : "py-2"}`} />
  );
  const send = <button disabled={!canSend} aria-label="Send" className={`${styles.send} inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition active:scale-90`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button>;
  if (toolbar) {
    return (
      <div className={className}>
        {field}
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">{toolbar}</div>
          {before}
          {send}
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.input} flex items-end gap-2 rounded-2xl border border-border bg-card py-1.5 pl-3.5 pr-1.5 transition ${className}`}>
      {field}
      {before}
      {send}
    </div>
  );
}
