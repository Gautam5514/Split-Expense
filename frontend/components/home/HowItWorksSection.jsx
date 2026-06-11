"use client";

import { motion } from "framer-motion";
import { QrCode, ScanLine, ArrowRight, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HowItWorksSection() {
  const router = useRouter();

  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 bg-[#030303] text-white overflow-hidden">
      
      {/* Dynamic inline styles for animations */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 8%; opacity: 0.8; }
          50% { top: 88%; opacity: 0.8; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.6; }
          100% { transform: scale(0.9); opacity: 0.3; }
        }
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-900/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3">
            Simple by design
          </p>
          <h2 className="font-serif-premium font-normal text-white text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] mb-4">
            From trip to settle in 3 steps
          </h2>
          <p className="text-white/50 text-sm sm:text-base md:text-lg max-w-xl mx-auto font-medium">
            No spreadsheets, no awkward math, no reminders.
          </p>
        </div>

        {/* 3 Step Premium Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Step 1: Create & Invite */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="group flex flex-col justify-between bg-[#0B0B0F] border border-white/[0.08] hover:border-white/15 rounded-2xl overflow-hidden transition duration-300 shadow-2xl relative"
          >
            {/* Visual Header */}
            <div className="h-[230px] w-full bg-gradient-to-br from-cyan-950/20 via-slate-950 to-slate-900 flex items-center justify-center relative overflow-hidden border-b border-white/5">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Floating QR Card */}
              <div 
                className="w-56 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 relative z-10"
                style={{ animation: "subtle-float 6s ease-in-out infinite" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">🏖️ Goa Trip 2026</h4>
                    <p className="text-[9px] text-white/30">Group Invite Active</p>
                  </div>
                  <span className="text-[9px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-md">Step 01</span>
                </div>
                
                {/* SVG QR Code Mock */}
                <div className="w-20 h-20 mx-auto bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-2 relative">
                  <svg className="w-full h-full text-white/70" viewBox="0 0 100 100" fill="currentColor">
                    {/* Corners */}
                    <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="12" y="12" width="11" height="11" />
                    <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="77" y="12" width="11" height="11" />
                    <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="12" y="77" width="11" height="11" />
                    {/* Random matrix blocks */}
                    <rect x="40" y="15" width="8" height="15" />
                    <rect x="55" y="5" width="8" height="8" />
                    <rect x="40" y="40" width="20" height="8" />
                    <rect x="15" y="40" width="15" height="8" />
                    <rect x="75" y="40" width="15" height="15" />
                    <rect x="45" y="60" width="15" height="8" />
                    <rect x="70" y="70" width="8" height="20" />
                    <rect x="85" y="75" width="10" height="10" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-md bg-[#0B0B0F] border border-cyan-500/30 flex items-center justify-center shadow-md">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  </div>
                </div>

                <div className="flex -space-x-1.5 justify-center items-center">
                  {["Felix", "Priya", "Alex", "Lily"].map((n, idx) => (
                    <img
                      key={n}
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${n}`}
                      className="w-5.5 h-5.5 rounded-full border border-zinc-950 bg-teal-900 object-cover"
                      alt=""
                    />
                  ))}
                  <span className="text-[8px] text-white/40 ml-2 font-bold font-mono">+ 1 joined</span>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 sm:p-7 text-left flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 block mb-2 font-mono">
                  01 // Setup
                </span>
                <h3 className="font-serif-premium font-normal text-white text-2xl mb-3">
                  Create & Invite
                </h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                  Start a group in seconds for any trip or monthly budget. Invite friends instantly via a custom QR code, link, or email - no complicated onboarding needed.
                </p>
              </div>
              
              <div>
                <button
                  onClick={() => router.push("/register")}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
                >
                  Start Group
                  <ArrowRight className="w-3 h-3 text-white/55" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Step 2: Log Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="group flex flex-col justify-between bg-[#0B0B0F] border border-white/[0.08] hover:border-white/15 rounded-2xl overflow-hidden transition duration-300 shadow-2xl relative"
          >
            {/* Visual Header */}
            <div className="h-[230px] w-full bg-gradient-to-br from-emerald-950/20 via-slate-950 to-slate-900 flex items-center justify-center relative overflow-hidden border-b border-white/5">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Floating Scanner Receipt Card */}
              <div 
                className="w-56 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 relative z-10 overflow-hidden"
                style={{ animation: "subtle-float 6.5s ease-in-out infinite" }}
              >
                {/* Laser scan line anim */}
                <div 
                  className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34D399] z-10" 
                  style={{ animation: "scan 3s ease-in-out infinite" }}
                />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[8.5px] font-bold text-emerald-400 uppercase tracking-wider">AI Receipt Scanner</span>
                  </div>
                  <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md">Step 02</span>
                </div>

                <div className="space-y-2.5 mt-1 border-t border-dashed border-white/10 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/50">🏨 Hotel advance</span>
                    <span className="text-[9.5px] font-bold text-white">₹8,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/50">🍽️ Dinner at Thalassa</span>
                    <span className="text-[9.5px] font-bold text-white">₹2,400</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/50">🚕 Airport Taxi</span>
                    <span className="text-[9.5px] font-bold text-white">₹1,200</span>
                  </div>
                </div>

                <div className="mt-1.5 pt-2 border-t border-white/10 flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5">
                  <span className="text-[9px] font-bold text-white/40">Total Scanned</span>
                  <span className="text-xs font-black text-emerald-400">₹11,600</span>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 sm:p-7 text-left flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-2 font-mono">
                  02 // Scanning
                </span>
                <h3 className="font-serif-premium font-normal text-white text-2xl mb-3">
                  Log Expenses
                </h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                  Add cost items on the go. Snap a photo of any bill to let our smart AI scanner read items instantly via OCR, splitting costs by share, percentage, or custom sums.
                </p>
              </div>
              
              <div>
                <button
                  onClick={() => router.push("/register")}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
                >
                  Try Scanner
                  <ArrowRight className="w-3 h-3 text-white/55" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Step 3: Settle Smart */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="group flex flex-col justify-between bg-[#0B0B0F] border border-white/[0.08] hover:border-white/15 rounded-2xl overflow-hidden transition duration-300 shadow-2xl relative"
          >
            {/* Visual Header */}
            <div className="h-[230px] w-full bg-gradient-to-br from-pink-950/20 via-slate-950 to-slate-900 flex items-center justify-center relative overflow-hidden border-b border-white/5">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Floating Settle Card */}
              <div 
                className="w-56 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3.5 relative z-10"
                style={{ animation: "subtle-float 7s ease-in-out infinite" }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] font-bold text-pink-400 uppercase tracking-wider">Settlement Route</span>
                  <span className="text-[9px] font-bold bg-pink-500/10 border border-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-md">Step 03</span>
                </div>

                {/* Settle Arrow Animation mock */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5 relative">
                  
                  {/* Pulsing ring anim */}
                  <div 
                    className="absolute -inset-0.5 rounded-xl bg-pink-500/10 pointer-events-none" 
                    style={{ animation: "pulse-ring 2.5s ease-in-out infinite" }}
                  />

                  <div className="flex items-center gap-1.5 z-10">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Priya" className="w-6.5 h-6.5 rounded-full bg-pink-900" alt="" />
                    <div className="text-[8px]">
                      <p className="font-bold text-white leading-tight">Priya</p>
                      <p className="text-white/40">Owes Felix</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5 z-10">
                    <span className="text-[9.5px] font-black text-pink-400">₹1,200</span>
                    <ArrowRight className="w-3.5 h-3 text-pink-400 animate-pulse" />
                  </div>

                  <div className="flex items-center gap-1.5 z-10">
                    <div className="text-[8px] text-right">
                      <p className="font-bold text-white leading-tight">Felix</p>
                      <p className="text-emerald-400 font-bold">Receiver</p>
                    </div>
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" className="w-6.5 h-6.5 rounded-full bg-cyan-900" alt="" />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[9.5px] font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Settle Up Recorded</span>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 sm:p-7 text-left flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400 block mb-2 font-mono">
                  03 // Clearing
                </span>
                <h3 className="font-serif-premium font-normal text-white text-2xl mb-3">
                  Settle Smart
                </h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                  Let AI handle the settlements. Our optimization algorithm parses your groups to calculate the minimum transactions required to settle all debts and zeroes balances in one tap.
                </p>
              </div>
              
              <div>
                <button
                  onClick={() => router.push("/register")}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
                >
                  Settle Up
                  <ArrowRight className="w-3 h-3 text-white/55" />
                </button>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
