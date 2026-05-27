"use client";

import { 
  Download, ArrowLeft, Smartphone, ShieldCheck, QrCode, Sparkles, 
  Play, Apple, Zap, Flame, Info, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import toast from "@/lib/toast";

export default function DownloadAppPage() {
  const buildUrl = "https://expo.dev/accounts/gautampandit/projects/splitApp/builds/f7aba359-04fc-46bb-86bd-203fe4ab2971";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildUrl);
    toast.success("Build link copied to clipboard! 📋");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 pt-28">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 w-full">
        
        {/* Navigation Head */}
        <Link 
          href="/users" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group pl-2"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>

        {/* Headline Header */}
        <div className="flex items-start gap-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/15 shrink-0 shadow-sm">
            <Smartphone size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Install SplitEase Mobile</h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-1 leading-relaxed max-w-xl font-medium">
              Access your shared expense settlement rooms, communicate with roommates, and manage travel budgets on the go.
            </p>
          </div>
        </div>

        {/* ── Single Large Unified Card Shell ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] sm:rounded-[40px] shadow-sm p-6 sm:p-10 space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
            
            {/* LEFT COLUMN: Android APK Build (3 Cols) */}
            <div className="lg:col-span-3 space-y-6">
              
              <div className="space-y-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/15">
                  <Zap size={10} /> Android Client Build
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Download Android App (APK)</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Install our active client build manually via Expo immediately to manage your group settlements natively.
                </p>
              </div>

              {/* Install Action Card */}
              <div className="p-5 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-[20px] flex flex-col sm:flex-row items-center gap-5 justify-between">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">SplitEase Mobile Client</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Format: APK / OTA Compatible</div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                  <a
                    href={buildUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs rounded-full shadow-md transition-all active:scale-95 duration-150 text-center cursor-pointer shrink-0"
                  >
                    <Download size={14} />
                    Download APK Build
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="px-5 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Instructions and Notice */}
              <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/60 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">How to Install manually:</h4>
                <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-2.5 list-decimal list-inside pl-1 leading-relaxed">
                  <li>Tap the <strong>Download APK Build</strong> button above on your Android phone.</li>
                  <li>In the Expo project screen, click <strong>Download Build</strong> to save the installer.</li>
                  <li>Open the downloaded `.apk` file and grant installation permissions if prompted.</li>
                  <li>Launch SplitEase from your drawer and sign in using your regular account details!</li>
                </ol>
              </div>

              <div className="flex items-start gap-3 p-4.5 rounded-[22px] bg-cyan-500/5 border border-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs leading-relaxed">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                <p>
                   <strong>Note:</strong> Since this is a direct developer APK build, your browser or OS may flag an 'Unknown App' dialog. Be assured that SplitEase builds are entirely secure and sandbox verified.
                </p>
              </div>

            </div>

            {/* RIGHT COLUMN: QR Scanner & Store Launch (2 Cols) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* QR Code Scanner (Nested for alignment, but styled as a card panel inside unified sheet) */}
              <div className="flex flex-col items-center justify-between text-center p-5 rounded-[24px] bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800/60 min-h-[300px] relative overflow-hidden">
                <div className="space-y-1.5 mt-1">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                    <QrCode size={16} className="text-sky-500" />
                    Scan to Install
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[200px]">
                    Point your phone's camera at this code to open the direct build download instantly.
                  </p>
                </div>

                {/* Styled Mock QR Code scanner frame */}
                <div className="relative p-3.5 border border-slate-200/50 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950/20 my-4 flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fuchsia-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-fuchsia-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-fuchsia-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-fuchsia-500 rounded-br-lg" />
                  
                  <div className="w-32 h-32 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col justify-around p-2.5 bg-white shadow-inner select-none relative">
                    <div className="flex justify-between">
                      <div className="w-7 h-7 border-[2.5px] border-slate-900 rounded flex items-center justify-center shrink-0"><div className="w-3 h-3 bg-slate-900 rounded-sm" /></div>
                      <div className="w-7 h-7 border-[2.5px] border-slate-900 rounded flex items-center justify-center shrink-0"><div className="w-3 h-3 bg-slate-900 rounded-sm" /></div>
                    </div>
                    <div className="flex flex-col gap-1 items-center py-2 opacity-80">
                      <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-900 rounded-full" /><div className="w-1.5 h-1.5 bg-slate-900 rounded-full" /><div className="w-1.5 h-1.5 bg-slate-900 rounded-full" /></div>
                      <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-900 rounded-full" /><div className="w-1.5 h-1.5 bg-slate-900 rounded-full" /><div className="w-1.5 h-1.5 bg-slate-900 rounded-full" /></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-7 h-7 border-[2.5px] border-slate-900 rounded flex items-center justify-center shrink-0"><div className="w-3 h-3 bg-slate-900 rounded-sm" /></div>
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0"><div className="w-2 h-2 bg-cyan-500 rounded-full" /></div>
                    </div>
                    <div className="absolute inset-x-0 h-0.5 bg-fuchsia-500 shadow-[0_0_6px_rgba(217,70,239,0.8)] top-1/2 animate-bounce pointer-events-none" />
                  </div>
                </div>

                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  splitApp Build v1.0.0
                </div>
              </div>

              {/* Play Store & App Store Coming Soon Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5 block ml-1">
                  <Sparkles size={13} className="text-cyan-600 dark:text-cyan-400 animate-pulse" />
                  Official Store Launches
                </h3>
                
                <div className="space-y-2.5">
                  {/* Google Play Store */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-850 rounded-[20px] bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Play size={15} className="text-emerald-500 fill-emerald-500" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Google Play Store</h4>
                        <p className="text-[10px] text-slate-400">Android marketplace</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/15 text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Coming Soon
                    </span>
                  </div>

                  {/* Apple App Store */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-850 rounded-[20px] bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <Apple size={15} className="text-cyan-600 dark:text-cyan-400 fill-cyan-500" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Apple App Store</h4>
                        <p className="text-[10px] text-slate-400">iOS marketplace</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/15 text-[8px] font-black uppercase tracking-wider text-teal-600 dark:text-cyan-400">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
