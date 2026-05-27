"use client";

import { WifiOff, Bell, Lock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const BUILD_URL = "https://expo.dev/accounts/gautampandit/projects/splitApp/builds/f7aba359-04fc-46bb-86bd-203fe4ab2971";

const FEATURES = [
  {
    icon: <WifiOff size={20} className="text-white" />,
    title: "Works Offline",
    desc: "Track expenses even without internet",
  },
  {
    icon: <Bell size={20} className="text-white" />,
    title: "Push Notifications",
    desc: "Get instant alerts for new expenses",
  },
  {
    icon: <Lock size={20} className="text-white" />,
    title: "Secure & Private",
    desc: "Your data is encrypted and safe",
  },
];

export default function DownloadAppPage() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-6">

        {/* Phone mockup + headline */}
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Phone mockup */}
          <div className="w-56 h-44 bg-card border border-border rounded-xl shadow-sm flex items-end justify-center overflow-hidden px-6 pt-4">
            <div className="w-full">
              {/* fake phone shell */}
              <div className="mx-auto w-28 bg-slate-900 rounded-t-2xl overflow-hidden shadow-xl">
                <div className="h-5 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>
                {/* screen */}
                <div className="bg-white px-2 py-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 w-12 bg-slate-200 rounded" />
                    <div className="h-1.5 w-5 bg-cyan-400 rounded" />
                  </div>
                  {/* donut chart mock */}
                  <div className="flex justify-center py-1">
                    <div className="w-10 h-10 rounded-full border-4 border-cyan-500 border-r-slate-200 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 bg-slate-100 rounded w-full" />
                    <div className="h-1 bg-slate-100 rounded w-4/5" />
                    <div className="h-1 bg-slate-100 rounded w-3/5" />
                  </div>
                  {/* button row */}
                  <div className="flex gap-1 pt-1">
                    <div className="flex-1 h-3 bg-cyan-500 rounded" />
                    <div className="flex-1 h-3 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-foreground">Take SplitEase Everywhere</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Manage your groups and expenses on the go — available on iOS and Android.
            </p>
          </div>

          {/* Store buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            {/* App Store */}
            <a
              href={BUILD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white shrink-0">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left leading-tight">
                <p className="text-[9px] font-medium uppercase tracking-wider opacity-80">Download on the</p>
                <p className="text-sm font-bold">App Store</p>
              </div>
            </a>

            {/* Google Play */}
            <a
              href={BUILD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                <path fill="#4FC3F7" d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z" />
                <path fill="#4DB6AC" d="M3 3.5l8.5 8.5L3 20.5V3.5z" opacity=".6" />
                <path fill="#FFB300" d="M19.5 12l-8 4.5 2-4.5-2-4.5 8 4.5z" />
                <path fill="#F06292" d="M11.5 16.5L3 20.5l8.5-8.5v8.5z" opacity=".8" />
              </svg>
              <div className="text-left leading-tight">
                <p className="text-[9px] font-medium uppercase tracking-wider opacity-80">Get it on</p>
                <p className="text-sm font-bold">Google Play</p>
              </div>
            </a>
          </div>

          <p className="text-xs text-muted-foreground">Available on iOS 14+ and Android 8.0+</p>
        </div>

        {/* QR code card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold text-foreground">Or scan to download</p>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-inner">
            <QRCodeSVG
              value={BUILD_URL}
              size={150}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="text-xs text-muted-foreground">Point your phone camera at the QR code</p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center shadow-md shadow-cyan-600/20">
                {f.icon}
              </div>
              <p className="text-xs font-bold text-foreground leading-snug">{f.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
