"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";

/* First-visit "install the app" banner.
   - Chrome/Edge/Android: captures `beforeinstallprompt` and triggers the
     native install dialog from our button (manifest.json drives the rest).
   - iOS Safari: no install API exists, so we show Share → Add to Home Screen
     instructions instead.
   - Never shows when already installed (standalone) and snoozes after
     dismissal. No service worker is registered here on purpose: the FCM
     worker owns the "/" scope and a second one would break push. */

const SNOOZE_KEY = "installPromptSnoozedAt";
const SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 2500;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isSnoozed = () => {
  const at = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  return at && Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState(null); // null | "native" | "ios"

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    let timer;
    const onBeforeInstall = (e) => {
      e.preventDefault(); // keep the mini-infobar away; we show our own UI
      setDeferredPrompt(e);
      timer = setTimeout(() => setMode("native"), SHOW_DELAY_MS);
    };
    const onInstalled = () => {
      setMode(null);
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt - show manual instructions.
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) timer = setTimeout(() => setMode("ios"), SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setMode(null);
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setMode(null);
    if (outcome !== "accepted") localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-20 z-[70] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
        >
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.35)] p-4">
            <div className="flex items-start gap-3">
              <img
                src="/icons/icon-192x192.png"
                alt="SplitEase"
                className="w-11 h-11 rounded-xl border border-border shadow-sm shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-foreground">Install SplitEase</p>
                {mode === "native" ? (
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Add it to your home screen for instant, full-screen access. Free, no app store needed.
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Tap <Share size={12} className="inline -mt-0.5 text-cyan-600 dark:text-cyan-400" />{" "}
                    <span className="font-semibold text-foreground">Share</span>, then{" "}
                    <SquarePlus size={12} className="inline -mt-0.5 text-cyan-600 dark:text-cyan-400" />{" "}
                    <span className="font-semibold text-foreground">Add to Home Screen</span>.
                  </p>
                )}
              </div>
              <button
                onClick={dismiss}
                aria-label="Dismiss install prompt"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              {mode === "native" && (
                <button
                  onClick={install}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold py-2.5 transition cursor-pointer"
                >
                  <Download size={13} /> Install app
                </button>
              )}
              <button
                onClick={dismiss}
                className={`${mode === "native" ? "" : "flex-1"} rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold px-4 py-2.5 transition cursor-pointer`}
              >
                {mode === "native" ? "Not now" : "Got it"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
