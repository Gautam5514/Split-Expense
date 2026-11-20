"use client";

// The Autopilot opening. The first time someone opens Autopilot in a day, the
// screen they were on blurs out, the orb glows for a moment, and the workspace
// comes into focus. No words, nothing to read. It plays at most once per user
// every 24 hours; every other open goes straight to the page.
// While it plays, the user's groups and balances load in the background, so the
// workspace opens already knowing where they stand.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { AUTOPILOT_ENABLED, AUTOPILOT_PATH } from "@/lib/autopilotConfig";
import { loadAutopilotCaps } from "./useAutopilotSession";
import { loadBriefing } from "./briefing";
import AutopilotMark from "./AutopilotMark";
import styles from "./AutopilotLaunch.module.css";

const EVENT = "autopilot:launch";
const SEEN_PREFIX = "autopilot.intro.";
const ONCE_EVERY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 1500; // long enough to register, short enough not to wait on
const MAX_MS = 4000; // a slow page never keeps it up
const LEAVE_MS = 600;

/** True when this user has not seen the opening in the last 24 hours (and marks it seen). */
function claimIntro() {
  const key = SEEN_PREFIX + (auth.currentUser?.uid || "me");
  try {
    const last = Number(localStorage.getItem(key)) || 0;
    if (Date.now() - last < ONCE_EVERY_MS) return false;
    localStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return false; // storage blocked: we can't remember, so never risk replaying it
  }
}

// A launch asked for before this component is listening (a direct visit to
// /autopilot runs the page's effects first) waits here.
let pending = null;
let lastLaunchAt = 0;

/** Open Autopilot with the launch sequence. Safe to call from anywhere on the client. */
export function launchAutopilot(detail = {}) {
  pending = { href: AUTOPILOT_PATH, ...detail };
  window.dispatchEvent(new CustomEvent(EVENT));
}
/** For the workspace: play the sequence on a direct visit, unless one just played. */
export function launchIfCold() {
  if (Date.now() - lastLaunchAt > 4000) launchAutopilot({ stay: true });
}
/** onClick for Autopilot links: plain left clicks get the sequence, everything else stays a normal link. */
export function launchOnClick(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (window.location.pathname === AUTOPILOT_PATH) return;
  e.preventDefault();
  launchAutopilot();
}

function Sequence({ onDone, ready }) {
  const [elapsed, setElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    // Warm up what the workspace needs; failures are fine, it loads them again itself.
    loadAutopilotCaps().catch(() => {});
    loadBriefing({ fresh: true });
    const t = setTimeout(() => setElapsed(true), MIN_MS);
    return () => clearTimeout(t);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    setTimeout(onDone, LEAVE_MS);
  }, [onDone]);

  // Clear once the moment has landed and the page underneath is the workspace.
  useEffect(() => { if (elapsed && ready) finish(); }, [elapsed, ready, finish]);
  useEffect(() => { const t = setTimeout(finish, MAX_MS); return () => clearTimeout(t); }, [finish]);
  useEffect(() => { const k = (e) => { if (e.key === "Escape" || e.key === "Enter") finish(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [finish]);

  return (
    <div className={`${styles.overlay} ${leaving ? styles.leaving : ""}`} role="status" aria-label="Opening Autopilot" onClick={finish}>
      <div className={styles.scrim} />
      <div className={`${styles.glow} ${styles.glowA}`} />
      <div className={`${styles.glow} ${styles.glowB}`} />
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.core}>
          <span className={styles.ripple} /><span className={styles.ripple} /><span className={styles.ripple} />
          <span className={styles.halo} />
          <span className={styles.orb}>
            <AutopilotMark size={46} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Mounted once in the layout; shows the sequence over whatever page the user is on. */
export default function AutopilotLaunch() {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  const [run, setRun] = useState(null); // { id }

  const start = useCallback(() => {
    const req = pending;
    pending = null;
    if (!req || !AUTOPILOT_ENABLED) return;
    const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // No account, or motion turned off: just go there.
    if (!token || still) { if (!req.stay) router.push(req.href); return; }
    // Seen in the last 24 hours: no ceremony, just open it.
    if (!claimIntro()) { if (!req.stay) router.push(req.href); return; }
    lastLaunchAt = Date.now();
    setRun({ id: lastLaunchAt });
    // The page loads underneath while the sequence plays.
    if (!req.stay) router.push(req.href);
  }, [router, token]);

  useEffect(() => {
    window.addEventListener(EVENT, start);
    if (pending) start();
    return () => window.removeEventListener(EVENT, start);
  }, [start]);

  const done = useCallback(() => setRun(null), []);
  if (!run) return null;
  return <Sequence key={run.id} ready={pathname === AUTOPILOT_PATH} onDone={done} />;
}
