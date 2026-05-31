"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Laptop, Tablet, Smartphone, Sparkles, AlertCircle } from "lucide-react";

const DEVICES = [
  {
    id: "desktop",
    icon: Laptop,
    badge: "Desktop Command Center",
    title: "Desktop: The 'Pretend to Work' Portal 🖥️",
    desc: "Create groups, add trip members, and watch gorgeous spending trajectories on a high-res widescreen dashboard.",
    funny: "Optimized for looking incredibly busy at your corporate desk job while secretly planning a weekend getaway you'll probably cancel anyway.",
    imageSrc: "/screen-desktop-dash.png",
    color: "from-cyan-500/20 to-teal-500/20",
    border: "border-cyan-500/30 dark:border-cyan-400/20",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-400/10",
    beacon: { top: "23%", left: "90%", label: "Group Creator", icon: "+", text: "Type a group name and click '+ Add Trip' to launch a workspace!", italic: "Felix is still 'calculating' his ₹15 share of the auto-rickshaw." }
  },
  {
    id: "tablet",
    icon: Tablet,
    badge: "Tablet Lounge Mode",
    title: "Tablet: The Bunk-Bed lounge 📟",
    desc: "Review spending allocations and settle up balances comfortably in full-screen on a hammock or bed.",
    funny: "Specifically designed to wave aggressively in front of your roommate's eyes to prove they still owe you ₹1,500 for last night's drinks.",
    imageSrc: "/screen-desktop-room.png",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30 dark:border-emerald-400/20",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/10",
    beacon: { top: "55%", left: "78%", label: "Group Balances", icon: "₹", text: "Manage balances, add shared trip expenses, and invite members!", italic: "Spending is 'steady' because we haven't logged last night yet." }
  },
  {
    id: "mobile",
    icon: Smartphone,
    badge: "On-The-Go Mobile",
    title: "Mobile: The Taco-Stall Savior 📱",
    desc: "Scan bills, log quick expenses, and split them in 3 seconds directly at the cash register.",
    funny: "Log that quick street taco or emergency gelato before you forget and start accusing everyone else of secretly stealing your money.",
    imageSrc: "/screen-mobile-dash.png",
    color: "from-pink-500/20 to-violet-500/20",
    border: "border-pink-500/30 dark:border-pink-400/20",
    badgeColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 dark:border-pink-400/10",
    beacon: { bottom: "3.5%", left: "50%", label: "Quick Add", icon: "⚡", text: "Tap the floating Groups tab to quick-log street meals and tickets!", italic: "Optimized for one-handed use while holding a heavy suitcase." }
  }
];

export default function InteractiveMockupSection() {
  const [activeDevice, setActiveDevice] = useState("desktop");

  return (
    <section id="mockups" className="py-16 sm:py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Soft background ambient blurs */}
      <div className="absolute w-[400px] h-[400px] -top-20 -left-20 bg-cyan-500/5 dark:bg-cyan-500/2 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute w-[400px] h-[400px] bottom-0 right-0 bg-pink-500/5 dark:bg-pink-500/2 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 md:mb-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-400/10 mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Responsive Command Centers
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.08] mb-4">
            One app, all your devices.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400">
              Even the ones you drop in the pool.
            </span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed font-medium">
            Whether you are on a high-res desktop monitor, lounging with a tablet, or standing in a chaotic street food line with your phone — SplitEase is perfectly sync'd.
          </p>
        </div>

        {/* ── DESKTOP VIEWPORT: Side-by-Side Interactive Tabs & High-tech Mockup ── */}
        <div className="hidden lg:grid grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Witty explanations and interactive selectors */}
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
              Select device to highlight
            </p>

            <div className="flex flex-col gap-3">
              {DEVICES.map((dev) => {
                const isSelected = activeDevice === dev.id;
                const Icon = dev.icon;

                return (
                  <motion.div
                    key={dev.id}
                    onClick={() => setActiveDevice(dev.id)}
                    whileHover={{ x: isSelected ? 0 : 5 }}
                    className={`p-5 rounded-[24px] border transition-all cursor-pointer select-none text-left relative overflow-hidden ${
                      isSelected
                        ? `bg-gradient-to-r ${dev.color} ${dev.border} shadow-[0_15px_30px_rgba(8,145,178,0.06)]`
                        : "bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/10"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeStrip"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 dark:bg-cyan-400"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                        isSelected 
                          ? "bg-white/80 dark:bg-slate-900/60 border-white/50 dark:border-white/10 text-cyan-500 dark:text-cyan-400" 
                          : "bg-muted/50 border-border text-muted-foreground"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${dev.badgeColor}`}>
                          {dev.badge}
                        </span>
                        <h3 className="text-base font-black text-foreground leading-snug">
                          {dev.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                          {dev.desc}
                        </p>
                        
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="pt-2 border-t border-white/20 dark:border-white/5 mt-2 text-xs text-cyan-600 dark:text-cyan-400 font-extrabold flex gap-1.5 items-start bg-cyan-500/5 dark:bg-cyan-400/5 p-2.5 rounded-2xl border border-cyan-500/10"
                          >
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-500" />
                            <span>
                              <strong>Reality Check:</strong> {dev.funny}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Multi-device mockup with pulsing hotspots */}
          <div className="lg:col-span-7 flex justify-center items-center relative min-h-[480px]">
            <AnimatePresence mode="wait">
              {activeDevice === "desktop" && (
                <motion.div
                  key="desktop"
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="w-full"
                >
                  <DesktopMockup dev={DEVICES[0]} />
                </motion.div>
              )}

              {activeDevice === "tablet" && (
                <motion.div
                  key="tablet"
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="w-full"
                >
                  <TabletMockup dev={DEVICES[1]} />
                </motion.div>
              )}

              {activeDevice === "mobile" && (
                <motion.div
                  key="mobile"
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="w-full max-w-[280px]"
                >
                  <MobileMockup dev={DEVICES[2]} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* ── MOBILE & TABLET VIEWPORT: Sequential Storytelling (lg:hidden) ── */}
        <div className="flex flex-col gap-14 lg:hidden">
          {DEVICES.map((dev, idx) => {
            const Icon = dev.icon;

            return (
              <div key={dev.id} className="space-y-6">
                
                {/* 1. Fully Expanded Feature Card */}
                <div className={`p-5 sm:p-6 rounded-[28px] border bg-gradient-to-r ${dev.color} ${dev.border} shadow-md text-left relative overflow-hidden`}>
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl border bg-white/80 dark:bg-slate-900/60 border-white/50 dark:border-white/10 text-cyan-500 dark:text-cyan-400 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${dev.badgeColor}`}>
                        {dev.badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
                        {dev.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-semibold">
                        {dev.desc}
                      </p>
                      
                      <div className="pt-2 border-t border-white/20 dark:border-white/5 mt-2 text-xs text-cyan-600 dark:text-cyan-400 font-extrabold flex gap-1.5 items-start bg-cyan-500/5 dark:bg-cyan-400/5 p-2.5 rounded-2xl border border-cyan-500/10">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-500" />
                        <span>
                          <strong>Reality Check:</strong> {dev.funny}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Mockup Screen framing your actual screenshot */}
                <div className="flex justify-center items-center">
                  <div className="w-full flex justify-center">
                    {dev.id === "desktop" && <DesktopMockup dev={dev} isMobileFlow={true} />}
                    {dev.id === "tablet" && <TabletMockup dev={dev} isMobileFlow={true} />}
                    {dev.id === "mobile" && <MobileMockup dev={dev} isMobileFlow={true} />}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* ── PREMIUM REACT CSS DEVICE CHASSIS COMPONENTS ── */
/* ──────────────────────────────────────────────────────────────────────── */

// 🖥️ 1. Premium Widescreen Browser Mockup (Desktop dashboard)
function DesktopMockup({ dev, isMobileFlow }) {
  const pos = dev.beacon;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-slate-950 relative select-none">
      {/* Browser top chrome */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-white/5">
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex-1 max-w-[240px] sm:max-w-xs mx-auto py-0.5 rounded-md text-[9px] text-white/30 font-bold bg-slate-950 border border-white/5 text-center truncate">
          splitease.app/dashboard
        </div>
      </div>
      
      {/* Actual uncropped desktop screenshot */}
      <div className="relative w-full overflow-hidden bg-slate-900">
        <img 
          src={dev.imageSrc} 
          className="w-full h-auto block" 
          alt="SplitEase Desktop Dashboard Screenshot" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />

        {/* Pulsing hot-spot beacon over Add Trip input area */}
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
          <span className="absolute inline-flex h-6 w-6 rounded-full bg-cyan-400 opacity-80 animate-ping" />
          <span className="relative inline-flex rounded-full h-6 w-6 bg-cyan-500 border border-white shadow-lg flex items-center justify-center text-[10px] font-black text-white hover:scale-125 transition-transform">
            {pos.icon}
          </span>
        </div>
      </div>

      {/* Floating Caption Panel inside Desktop Mockup */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 dark:bg-slate-955/85 backdrop-blur-md border border-white/40 dark:border-white/5 p-3 rounded-2xl shadow-lg flex flex-col text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <p className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
            {pos.label} Spotlight
          </p>
        </div>
        <p className="text-[10px] font-black text-foreground leading-normal">
          {pos.text}
        </p>
        <p className="text-[9px] text-muted-foreground font-extrabold italic mt-0.5 leading-snug border-t border-muted/30 dark:border-white/5 pt-0.5">
          "{pos.italic}"
        </p>
      </div>
    </div>
  );
}

// 📟 2. Premium Tablet Mockup (Tablet/iPad expense details)
function TabletMockup({ dev, isMobileFlow }) {
  const pos = dev.beacon;

  return (
    <div className="relative mx-auto rounded-[28px] border-[10px] border-slate-900 bg-slate-950 shadow-[0_25px_60px_rgba(0,0,0,0.2)] w-full overflow-hidden select-none">
      {/* Front camera notch */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-800 z-20" />
      
      {/* Actual uncropped tablet/group page screenshot */}
      <div className="relative w-full overflow-hidden bg-slate-900">
        <img 
          src={dev.imageSrc} 
          className="w-full h-auto block" 
          alt="SplitEase Tablet Widescreen Room Screenshot" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />

        {/* Pulsing hot-spot beacon over Group Balances list area */}
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
          <span className="absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-80 animate-ping" />
          <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 border border-white shadow-lg flex items-center justify-center text-[10px] font-black text-white hover:scale-125 transition-transform">
            {pos.icon}
          </span>
        </div>
      </div>

      {/* Floating Caption Panel inside Tablet Mockup */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 dark:bg-slate-955/85 backdrop-blur-md border border-white/40 dark:border-white/5 p-3 rounded-2xl shadow-lg flex flex-col text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            {pos.label} Spotlight
          </p>
        </div>
        <p className="text-[10px] font-black text-foreground leading-normal">
          {pos.text}
        </p>
        <p className="text-[9px] text-muted-foreground font-extrabold italic mt-0.5 leading-snug border-t border-muted/30 dark:border-white/5 pt-0.5">
          "{pos.italic}"
        </p>
      </div>
    </div>
  );
}

// 📱 3. Premium Smartphone Mockup (Mobile dashboard SplitEase)
function MobileMockup({ dev, isMobileFlow }) {
  const pos = dev.beacon;

  return (
    <div className="relative mx-auto rounded-[36px] border-[10px] border-slate-900 bg-slate-950 shadow-[0_25px_50px_rgba(0,0,0,0.22)] w-full max-w-[270px] overflow-hidden select-none">
      {/* Dynamic Island bar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-900 rounded-full z-20" />
      
      {/* Actual uncropped mobile page screenshot */}
      <div className="relative w-full overflow-hidden bg-slate-900">
        <img 
          src={dev.imageSrc} 
          className="w-full h-auto block" 
          alt="SplitEase Mobile Dashboard Screenshot" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />

        {/* Pulsing hot-spot beacon over Groups bottom nav button */}
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
          <span className="absolute inline-flex h-6 w-6 rounded-full bg-pink-400 opacity-80 animate-ping" />
          <span className="relative inline-flex rounded-full h-6 w-6 bg-pink-500 border border-white shadow-lg flex items-center justify-center text-[10px] font-black text-white hover:scale-125 transition-transform">
            {pos.icon}
          </span>
        </div>
      </div>

      {/* Floating Caption Panel inside Mobile Mockup */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 dark:bg-slate-955/85 backdrop-blur-md border border-white/40 dark:border-white/5 p-2 rounded-2xl shadow-lg flex flex-col text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
          <p className="text-[9px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">
            {pos.label} Spotlight
          </p>
        </div>
        <p className="text-[10px] font-black text-foreground leading-normal">
          {pos.text}
        </p>
        <p className="text-[9px] text-muted-foreground font-extrabold italic mt-0.5 leading-snug border-t border-muted/30 dark:border-white/5 pt-0.5">
          "{pos.italic}"
        </p>
      </div>
    </div>
  );
}
