"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Laptop, Tablet, Smartphone } from "lucide-react";

const DEVICES = [
  {
    id: "desktop",
    icon: Laptop,
    label: "Desktop",
    tag: "Command Center",
    title: "Full dashboard, full picture",
    desc: "Create groups, track spending trajectories, and manage members on a high-res widescreen layout built for serious multitaskers.",
    imageSrc: "/screen-desktop-dash.png",
    accent: "bg-cyan-500",
    accentText: "text-cyan-600 dark:text-cyan-400",
    accentBg: "bg-cyan-50 dark:bg-cyan-500/10",
    beacon: { top: "23%", left: "90%", label: "Group Creator", icon: "+", text: "Type a group name and click '+ Add Trip' to launch a workspace!", italic: "Felix is still 'calculating' his ₹15 share of the auto-rickshaw." }
  },
  {
    id: "tablet",
    icon: Tablet,
    label: "Tablet",
    tag: "Lounge Mode",
    title: "Balances, big and clear",
    desc: "Review expense allocations and settle up in full-screen comfort - from a hammock, a couch, or wherever you do your best relaxed finance work.",
    imageSrc: "/screen-desktop-room.png",
    accent: "bg-emerald-500",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-500/10",
    beacon: { top: "55%", left: "78%", label: "Group Balances", icon: "₹", text: "Manage balances, add shared trip expenses, and invite members!", italic: "Spending is 'steady' because we haven't logged last night yet." }
  },
  {
    id: "mobile",
    icon: Smartphone,
    label: "Mobile",
    tag: "On the Go",
    title: "Log it before you forget",
    desc: "Scan bills, split expenses in 3 seconds, and stay synced - even while holding a heavy suitcase at the airport.",
    imageSrc: "/screen-mobile-dash.png",
    accent: "bg-violet-500",
    accentText: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-50 dark:bg-violet-500/10",
    beacon: { bottom: "3.5%", left: "50%", label: "Quick Add", icon: "⚡", text: "Tap the floating Groups tab to quick-log street meals and tickets!", italic: "Optimized for one-handed use while holding a heavy suitcase." }
  }
];

export default function InteractiveMockupSection() {
  const [activeDevice, setActiveDevice] = useState("desktop");
  const active = DEVICES.find(d => d.id === activeDevice);

  return (
    <section id="mockups" className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.06),transparent)] pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6">

        {/* Section Header */}
        <div className="max-w-2xl mb-16 md:mb-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Works everywhere
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.1] mb-4">
            One app.{" "}
            <span className="text-muted-foreground font-normal">Every screen.</span>
          </h2>

          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Whether you&apos;re at a desk, on a couch, or in a chaotic street food line - SplitEase adapts perfectly.
          </p>
        </div>

        {/* Desktop: Side-by-side */}
        <div className="hidden lg:grid grid-cols-12 gap-12 items-start">

          {/* Left: Tab Switcher */}
          <div className="lg:col-span-4 space-y-1">
            {DEVICES.map((dev) => {
              const isSelected = activeDevice === dev.id;
              const Icon = dev.icon;

              return (
                <button
                  key={dev.id}
                  onClick={() => setActiveDevice(dev.id)}
                  className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-200 group relative ${
                    isSelected
                      ? "bg-foreground/[0.04] dark:bg-white/[0.05]"
                      : "hover:bg-foreground/[0.02] dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeBar"
                      className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${dev.accent}`}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}

                  <div className="flex items-start gap-3 pl-3">
                    <div className={`mt-0.5 p-2 rounded-lg transition-colors ${
                      isSelected
                        ? `${dev.accentBg} ${dev.accentText}`
                        : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold transition-colors ${
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {dev.label}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors ${
                          isSelected
                            ? `${dev.accentBg} ${dev.accentText}`
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {dev.tag}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed transition-colors ${
                        isSelected ? "text-foreground/70" : "text-muted-foreground/60"
                      }`}>
                        {dev.title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Description below tabs */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDevice}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="pt-4 px-4"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {active.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Mockup */}
          <div className="lg:col-span-8 flex justify-center items-start">
            <AnimatePresence mode="wait">
              {activeDevice === "desktop" && (
                <motion.div key="desktop" {...mockupAnim} className="w-full">
                  <DesktopMockup dev={DEVICES[0]} />
                </motion.div>
              )}
              {activeDevice === "tablet" && (
                <motion.div key="tablet" {...mockupAnim} className="w-full">
                  <TabletMockup dev={DEVICES[1]} />
                </motion.div>
              )}
              {activeDevice === "mobile" && (
                <motion.div key="mobile" {...mockupAnim} className="w-full max-w-[260px] mx-auto">
                  <MobileMockup dev={DEVICES[2]} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: Stacked */}
        <div className="flex flex-col gap-16 lg:hidden">
          {DEVICES.map((dev) => {
            const Icon = dev.icon;
            return (
              <div key={dev.id} className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${dev.accentBg} ${dev.accentText} flex-shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{dev.label}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${dev.accentBg} ${dev.accentText}`}>
                        {dev.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{dev.desc}</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  {dev.id === "desktop" && <DesktopMockup dev={dev} />}
                  {dev.id === "tablet" && <TabletMockup dev={dev} />}
                  {dev.id === "mobile" && (
                    <div className="w-full max-w-[240px]">
                      <MobileMockup dev={dev} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

const mockupAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3 }
};

function Beacon({ pos, color }) {
  return (
    <div
      className="absolute z-20"
      style={{
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        right: pos.right,
        transform: "translate(-50%, -50%)"
      }}
    >
      <span className={`absolute inline-flex h-5 w-5 rounded-full ${color} opacity-50 animate-ping`} />
      <span className={`relative inline-flex rounded-full h-5 w-5 ${color} border border-white/80 shadow items-center justify-center text-[9px] font-bold text-white`}>
        {pos.icon}
      </span>
    </div>
  );
}

function Caption({ pos, accentText }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-black/[0.06] dark:border-white/10 px-3 py-2.5 rounded-xl shadow-sm">
      <p className={`text-[9px] font-semibold uppercase tracking-wider ${accentText} mb-1`}>
        {pos.label}
      </p>
      <p className="text-[10px] text-foreground leading-normal font-medium">
        {pos.text}
      </p>
      <p className="text-[9px] text-muted-foreground italic mt-1">
        &ldquo;{pos.italic}&rdquo;
      </p>
    </div>
  );
}

function DesktopMockup({ dev }) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/10 shadow-2xl bg-slate-950 relative select-none">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#1c1c1e] border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 max-w-[220px] mx-auto h-5 rounded-md bg-white/[0.06] border border-white/[0.04] flex items-center justify-center">
          <span className="text-[9px] text-white/30 font-medium">splitease.app/dashboard</span>
        </div>
      </div>
      <div className="relative w-full bg-slate-900">
        <img src={dev.imageSrc} className="w-full h-auto block" alt="SplitEase Desktop" />
        <Beacon pos={dev.beacon} color="bg-cyan-500" />
        <Caption pos={dev.beacon} accentText={dev.accentText} />
      </div>
    </div>
  );
}

function TabletMockup({ dev }) {
  return (
    <div className="relative mx-auto rounded-[22px] border-[8px] border-[#1c1c1e] bg-slate-950 shadow-2xl w-full overflow-hidden select-none">
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-700 z-20" />
      <div className="relative w-full bg-slate-900">
        <img src={dev.imageSrc} className="w-full h-auto block" alt="SplitEase Tablet" />
        <Beacon pos={dev.beacon} color="bg-emerald-500" />
        <Caption pos={dev.beacon} accentText={dev.accentText} />
      </div>
    </div>
  );
}

function MobileMockup({ dev }) {
  return (
    <div className="relative mx-auto rounded-[32px] border-[8px] border-[#1c1c1e] bg-slate-950 shadow-2xl w-full overflow-hidden select-none">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-[#1c1c1e] rounded-full z-20" />
      <div className="relative w-full bg-slate-900">
        <img src={dev.imageSrc} className="w-full h-auto block" alt="SplitEase Mobile" />
        <Beacon pos={dev.beacon} color="bg-violet-500" />
        <Caption pos={dev.beacon} accentText={dev.accentText} />
      </div>
    </div>
  );
}
