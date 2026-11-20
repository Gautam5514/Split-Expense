"use client";

import AutopilotMark from "@/components/autopilot/AutopilotMark";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Plus, ShieldCheck, Users, X, Receipt, Scale, PiggyBank } from "lucide-react";
import styles from "./AutopilotWidget.module.css";
import { AUTOPILOT_ENABLED, AUTOPILOT_PATH } from "@/lib/autopilotConfig";
import { useAutopilotSession } from "./useAutopilotSession";
import { Composer, ConnectionNotice, GroupPicker, Mark, Thread } from "./parts";
import { launchOnClick } from "./AutopilotLaunch";

// The full-page workspace has its own conversation UI; the floating chat steps aside there.
const HIDDEN = ["/login", "/register", "/reset-password", "/admin", AUTOPILOT_PATH];
const EXAMPLES = [
  { icon: Users, label: "Plan a trip", hint: "Group, people & budget", text: "Create group Goa Trip with Aman and Priya, budget 40000" },
  { icon: Receipt, label: "Split a bill", hint: "Exact shares, no guessing", text: "Dinner 3600 paid by me, split equally, leave out Rahul" },
  { icon: Scale, label: "Who owes whom?", hint: "A simpler settle-up", text: "Who owes whom? Show the simplest settle-up" },
  { icon: PiggyBank, label: "Watch my budget", hint: "Stay on top of spending", text: "Set the budget to 25000 and alert me at 75 and 90" },
];

export default function AutopilotWidget() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const launcherRef = useRef(null);
  const pathGroup = useMemo(() => pathname?.match(/^\/groups\/([a-f\d]{24})/i)?.[1] || "", [pathname]);
  const onWorkspace = pathname === AUTOPILOT_PATH;
  const ap = useAutopilotSession({ active: open && !onWorkspace, initialGroupId: pathGroup });
  const { token, off, connection, caps, thread, busy, openRun, ctxGroup, focusInput, prefill, invalidate } = ap;

  // Open from anywhere: a custom event, or a link carrying ?autopilot=1.
  useEffect(() => {
    const onOpen = e => { if (window.location.pathname === AUTOPILOT_PATH) return; setOpen(true); prefill(e.detail || {}); };
    window.addEventListener("autopilot:open", onOpen);
    const params = new URLSearchParams(window.location.search);
    if (params.get("autopilot") === "1" && window.location.pathname !== AUTOPILOT_PATH) {
      setOpen(true);
      // Links from reminders carry an editable draft; nothing is sent until the user does.
      prefill({ prompt: params.get("prompt") || undefined, groupId: params.get("groupId") || undefined });
    }
    return () => window.removeEventListener("autopilot:open", onOpen);
  }, [prefill]);

  // The workspace may have moved the conversation on: reload it the next time this opens.
  useEffect(() => { if (onWorkspace) { setOpen(false); invalidate(); } }, [onWorkspace, invalidate]);
  useEffect(() => { if (!token) setOpen(false); }, [token]);
  useEffect(() => { if (!open) return; const timer = setTimeout(focusInput, 150); return () => clearTimeout(timer); }, [open, focusInput]);
  useEffect(() => { const k = e => { if (e.key === "Escape") { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); } }; if (open) window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);

  if (!AUTOPILOT_ENABLED || !token || (off && !open) || HIDDEN.some(p => pathname === p || pathname?.startsWith(`${p}/`))) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button ref={launcherRef} initial={reduceMotion ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} onClick={() => setOpen(true)} aria-label="Open Autopilot" aria-expanded={open} aria-controls="autopilot-panel" className={styles.launcher}>
            <span className={styles.launcherIcon} aria-hidden="true"><AutopilotMark size={23} strokeWidth={1.65} /></span>
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
                {thread.length > 0 && <button disabled={busy} onClick={ap.reset} aria-label="New chat" title="New chat" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Plus className="h-4 w-4" /></button>}
                <Link href={AUTOPILOT_PATH} onClick={launchOnClick} aria-label="Open the full Autopilot workspace" title="Open full workspace" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Maximize2 className="h-4 w-4" /></Link>
                <button onClick={() => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); }} aria-label="Close Autopilot" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Working in</span>
                <GroupPicker groups={ap.groups} value={ap.ctxId} onChange={ap.setCtxId} />
              </div>
            </header>

            <Thread ap={ap} className="px-5 py-5">
              <div className={styles.welcome}>
                <span className={styles.eyebrow}><AutopilotMark className="h-3 w-3" /> Less admin. More living.</span>
                <h3 className="mt-4 text-[30px] font-semibold leading-[1.12] tracking-[-0.04em]">Money stuff,<br /><span className="text-muted-foreground">a little easier.</span></h3>
                <p className="mt-3 max-w-[320px] text-[13px] leading-[21px] text-muted-foreground">A trip, a dinner, or the monthly bills. Tell me what you need—in English or Hinglish.</p>
                <div className={styles.shortcuts}>
                  {EXAMPLES.map(({ icon: Icon, label, hint, text }) => (
                    <button key={label} type="button" onClick={() => { ap.setInput(text); focusInput(); }} disabled={busy} className={styles.shortcut}>
                      <span className={styles.shortcutIcon}><Icon className="h-4 w-4" /></span>
                      <span><span className="block text-[13px] font-semibold">{label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{hint}</span></span>
                    </button>
                  ))}
                </div>
                <div className={styles.trust}><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>You review the plan before anything changes.<br />No automatic payments. No surprises.</span></div>
              </div>
            </Thread>

            <p role="status" aria-live="polite" className="sr-only">{busy ? "Autopilot is thinking." : ap.announce}</p>
            <ConnectionNotice ap={ap} className="mx-4 mb-3" />
            <form onSubmit={ap.submit} className={`${styles.composer} shrink-0 border-t border-border px-4 pt-3`}>
              <Composer ap={ap} />
              <p className="mt-2 text-center text-[10px] text-muted-foreground">{busy ? "Preparing your next step…" : "Review first · approve when you’re ready"}</p>
              {ctxGroup && <p className="mt-2 px-1 text-[11px] text-muted-foreground">Changes apply to <span className="font-medium text-foreground">{ctxGroup.name}</span> unless you say otherwise.</p>}
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
