"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Share, SquarePlus, X } from "lucide-react";

/* First-visit "install the app" banner.
   - Chrome/Edge/Android: captures `beforeinstallprompt` and triggers the
     native install dialog from our button (manifest.json drives the rest).
   - iOS Safari: no install API exists, so we show Share → Add to Home Screen
     instructions instead.
   - Shows at most once per page session and never when already installed
     (standalone) or snoozed after a dismissal. Chrome re-fires
     `beforeinstallprompt` on later navigations, so every fire re-checks the
     snooze instead of trusting the value read at mount.
   - No service worker is registered here on purpose: the FCM worker owns the
     "/" scope and a second one would break push. */

const SNOOZE_KEY = "installPromptSnoozedAt";
const SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 2500;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

// Private-mode Safari throws on storage access, so never let it break the app.
const snooze = () => {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {}
};

const isSnoozed = () => {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Boolean(at) && Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return true; // no storage means no way to snooze - stay quiet.
  }
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState(null); // null | "native" | "ios"
  const shownRef = useRef(false); // one banner per page session, whatever happens

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    let timer;
    const show = (next) => {
      if (shownRef.current || isStandalone() || isSnoozed()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isSnoozed()) return;
        shownRef.current = true;
        setMode(next);
      }, SHOW_DELAY_MS);
    };

    const onBeforeInstall = (e) => {
      e.preventDefault(); // keep the mini-infobar away; we show our own UI
      setDeferredPrompt(e);
      show("native");
    };
    const onInstalled = () => {
      shownRef.current = true;
      setMode(null);
      snooze();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt - show manual instructions.
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) show("ios");

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setMode(null);
    snooze();
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setMode(null);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome !== "accepted") snooze();
  };

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-20 z-[70] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px]"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.35)] p-2.5">
            <img
              src="/logo-concept-app.svg"
              alt=""
              className="w-9 h-9 rounded-lg border border-border shrink-0"
            />

            {mode === "native" ? (
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                Install SplitEase
              </p>
            ) : (
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                <Share size={12} className="inline -mt-0.5 text-cyan-600 dark:text-cyan-400" />{" "}
                Share →{" "}
                <SquarePlus size={12} className="inline -mt-0.5 text-cyan-600 dark:text-cyan-400" />{" "}
                <span className="font-semibold text-foreground">Add to Home Screen</span>
              </p>
            )}

            {mode === "native" && (
              <button
                onClick={install}
                className="shrink-0 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold px-3.5 py-2 transition cursor-pointer"
              >
                Install
              </button>
            )}

            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
