"use client";

import { useNotifications } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { BellRing, Send, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotificationPage() {
  const { token } = useAuth();
  const { 
    oneSignalSubscriptionId, 
    oneSignalPermission, 
    oneSignalError,
    requestOneSignalPermission, 
    disableOneSignalNotifications, 
    sendTestPushNotification 
  } = useNotifications();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 pt-28">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 w-full">
        
        {/* Back Link */}
        <Link 
          href="/users" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group pl-2"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>

        {/* ── Single Large Unified Card ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] sm:rounded-[40px] shadow-sm overflow-hidden transition-all duration-350 p-6 sm:p-10 space-y-8">
          
          {/* Header section inside card */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-slate-100 dark:border-slate-800/60 pb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/15 shrink-0 shadow-inner">
              <BellRing size={26} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Push Notifications</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Receive instant alerts about expenses, groups, and settlements even when offline.
              </p>
            </div>
          </div>

          {/* Status and Action controls inside the single card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-[24px] bg-slate-50 dark:bg-slate-800/30 border border-slate-150 dark:border-slate-800/50">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">Current Status</span>
              <div className="flex items-center gap-2.5">
                <div className={`h-3 w-3 rounded-full ${
                  oneSignalPermission === "granted" && oneSignalSubscriptionId
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse"
                    : oneSignalPermission === "denied"
                    ? "bg-rose-500"
                    : "bg-amber-500"
                }`} />
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {oneSignalPermission === "granted" && oneSignalSubscriptionId
                    ? "Active & Subscribed"
                    : oneSignalPermission === "denied"
                    ? "Blocked / Denied by Browser"
                    : "Not Enabled"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
              {/* Toggle Button */}
              {oneSignalPermission === "granted" && oneSignalSubscriptionId ? (
                <button
                  type="button"
                  onClick={disableOneSignalNotifications}
                  className="w-full sm:w-auto px-6 py-3.5 border border-rose-500/20 text-rose-500 dark:text-rose-400 font-bold rounded-full hover:bg-rose-500/10 transition-all text-xs active:scale-95 duration-200 cursor-pointer"
                >
                  Disable Notifications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={requestOneSignalPermission}
                  disabled={oneSignalPermission === "denied"}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-full hover:opacity-90 transition-all text-xs shadow-lg hover:shadow-violet-500/20 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {oneSignalPermission === "denied" ? "Permission Blocked" : "Enable Push Notifications"}
                </button>
              )}

              {/* Send Test Push Button */}
              <button
                type="button"
                onClick={sendTestPushNotification}
                disabled={!oneSignalSubscriptionId}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full hover:opacity-90 transition-all text-xs shadow-md active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={14} />
                Send Test Push
              </button>
            </div>
          </div>

          {/* Notices inside the single card */}
          {oneSignalError && (
            <div className="flex items-start gap-4 p-5 rounded-[22px] bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950/50 text-amber-750 dark:text-amber-300 text-xs leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-1">
                <p className="font-extrabold text-slate-800 dark:text-amber-200">OneSignal Environment Notice</p>
                <p>
                  OneSignal is configured to run on <strong>https://split-expense-vert.vercel.app</strong>. If you are currently testing on <strong>localhost</strong>, please verify that you have enabled <strong>Local Testing</strong> inside your OneSignal dashboard settings. Push features are bypassed on non-local development servers to avoid browser security origin crashes.
                </p>
              </div>
            </div>
          )}

          {oneSignalPermission === "denied" && (
            <div className="flex items-start gap-4 p-5 rounded-[22px] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 text-rose-700 dark:text-rose-300 text-xs leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="space-y-1">
                <p className="font-extrabold text-rose-800 dark:text-rose-200">Notifications are blocked</p>
                <p>
                  You have blocked notifications for this site. To enable them, click the lock icon next to the URL in your browser address bar and change the notification permission to "Allow".
                </p>
              </div>
            </div>
          )}

          {oneSignalPermission !== "denied" && !oneSignalSubscriptionId && (
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 text-center">
              💡 Setup takes a single click. When prompted, select "Allow" to authorize browser-level push alerts. Works even when the website is closed!
            </p>
          )}

        </div>

      </div>
    </div>
  );
}
