"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Zap, ScanLine, Bot, MessageSquare, QrCode, ShieldCheck, Check, Sparkles } from "lucide-react";

// Interactive scroll-linked timeline dot component
function TimelineDot({ scrollYProgress, index, total, color }) {
  const targetProgress = index / (total - 1);
  
  const startReveal = Math.max(0, targetProgress - 0.12);
  
  const scale = useTransform(scrollYProgress, [startReveal, targetProgress], [0.4, 1]);
  const glowOpacity = useTransform(scrollYProgress, [startReveal, targetProgress], [0, 1]);
  const innerDotOpacity = useTransform(scrollYProgress, [startReveal, targetProgress], [0, 1]);
  
  const dotColor = color.includes('cyan') ? '#22d3ee' :
                   color.includes('emerald') ? '#34d399' :
                   color.includes('pink') ? '#f472b6' :
                   color.includes('violet') ? '#a78bfa' :
                   color.includes('amber') ? '#fbbf24' : '#34d399';

  return (
    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none items-center justify-center">
      {/* Outer glowing ring */}
      <motion.div
        style={{
          scale,
          opacity: glowOpacity,
          borderColor: dotColor,
          boxShadow: `0 0 12px 2px ${dotColor}55, 0 0 4px ${dotColor}`,
        }}
        className="absolute inset-0 rounded-full border bg-[#030303]"
      />
      {/* Inner filled dot */}
      <motion.div
        style={{
          opacity: innerDotOpacity,
          backgroundColor: dotColor,
          scale,
        }}
        className="w-1.5 h-1.5 rounded-full relative z-10"
      />
    </div>
  );
}



export default function FeaturesSection() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001
  });

  const scaleProgress = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      tag: "REAL-TIME BALANCES",
      title: "Live Balance Tracking",
      desc: "Every expense updates balances instantly for all group members. No manual refreshes or calculations needed - the split state updates in real-time.",
      color: "text-cyan-400",
      glowBg: "bg-cyan-500/5",
      borderColor: "hover:border-cyan-500/20",
      points: ["Real-time synchronization across devices", "Instant net-debt calculations", "Automatic multi-currency support"],
      mockup: (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 relative">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Group Balances</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          
          <div className="space-y-2.5 my-auto">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Priya" className="w-6 h-6 rounded-full bg-pink-900" alt="" />
                <span className="text-[9.5px] font-bold">Priya</span>
              </div>
              <span className="text-[10px] font-black text-rose-400">- ₹1,200</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" className="w-6 h-6 rounded-full bg-cyan-900" alt="" />
                <span className="text-[9.5px] font-bold">Felix</span>
              </div>
              <span className="text-[10px] font-black text-emerald-400">+ ₹3,400</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex" className="w-6 h-6 rounded-full bg-yellow-900" alt="" />
                <span className="text-[9.5px] font-bold">Alex</span>
              </div>
              <span className="text-[10px] font-black text-rose-400">- ₹2,200</span>
            </div>
          </div>
          
          <div className="text-[7.5px] text-white/30 font-mono text-right border-t border-white/5 pt-2">
            Status: Fully Settled & Synced
          </div>
        </div>
      ),
    },
    {
      icon: <ScanLine className="w-5 h-5 text-emerald-400" />,
      tag: "AI OCR PARSER",
      title: "OCR Receipt Scanning",
      desc: "Point your camera at any bill or import a PDF. Our smart AI scanner reads the total, tax, items, and tax ratios instantly without manual typing.",
      color: "text-emerald-400",
      glowBg: "bg-emerald-500/5",
      borderColor: "hover:border-emerald-500/20",
      points: ["Item-by-item split allocation", "Smart total and tax identification", "Automatic item categorization"],
      mockup: (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 relative overflow-hidden">
          {/* Sweeping laser line */}
          <div 
            className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34D399] z-20 pointer-events-none"
            style={{ animation: "laser-sweep 2.8s ease-in-out infinite" }}
          />
          
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">AI Scanner Active</span>
            <div className="flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>
          
          {/* Bill simulation */}
          <div className="space-y-2 font-mono text-[9px] text-white/60 my-auto px-1">
            <div className="flex justify-between items-center border-b border-dashed border-white/10 pb-1">
              <span>🍔 Double Cheese Burger</span>
              <span className="text-white">₹380.00</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-white/10 pb-1">
              <span>🍟 Large Fries</span>
              <span className="text-white">₹150.00</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-white/10 pb-1">
              <span>🥤 Cold Drink Extra Large</span>
              <span className="text-white">₹120.00</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 font-bold text-emerald-400">
              <span>TOTAL PARSED VALUE</span>
              <span>₹650.00</span>
            </div>
          </div>
          
          <div className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center py-1 rounded-md font-bold">
            ✓ Auto-Mapped to 3 Members
          </div>
        </div>
      ),
    },
    {
      icon: <Bot className="w-5 h-5 text-pink-400" />,
      tag: "LLM INSIGHTS",
      title: "AI Expense Assistant",
      desc: "Ask our embedded LLM assistant anything about your spend. Get spending breakdowns, net-debt summaries, and tap-to-clear settlements instantly.",
      color: "text-pink-400",
      glowBg: "bg-pink-500/5",
      borderColor: "hover:border-pink-500/20",
      points: ["Ask custom spending queries", "Generates visual debt charts", "Automatic payment suggestions"],
      mockup: (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 relative">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span className="text-[9.5px] font-bold text-white">SplitEase Assistant</span>
            </div>
            <span className="text-[8px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1 rounded-md font-bold">GPT-4o</span>
          </div>

          <div className="my-auto space-y-3">
            {/* User Bubble */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[7px] text-white/30 uppercase tracking-widest mr-1 font-mono">You</span>
              <div className="bg-white/5 border border-white/10 text-white text-[9.5px] px-2.5 py-1.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                Who spent the most on hotel advance?
              </div>
            </div>
            
            {/* AI Response Bubble */}
            <div className="flex flex-col items-start gap-1">
              <span className="text-[7px] text-pink-400 uppercase tracking-widest ml-1 font-mono">AI ASSISTANT</span>
              <div className="bg-pink-500/5 border border-pink-500/20 text-white text-[9px] px-2.5 py-1.5 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed">
                <Sparkles className="w-2.5 h-2.5 text-pink-400 inline mr-1 mb-0.5" />
                Felix paid <strong className="text-pink-400">₹8,000</strong> for the Hotel advance. To balance the group, Priya should settle ₹1,200 to Felix.
              </div>
            </div>
          </div>

          <div className="h-6 w-full rounded-md border border-white/5 bg-white/[0.01] px-2 flex items-center justify-between text-white/30 text-[8.5px]">
            <span>Type a message...</span>
            <Sparkles className="w-3 h-3 text-pink-400/50" />
          </div>
        </div>
      ),
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-violet-400" />,
      tag: "GROUP CHAT",
      title: "Group & Direct Chat",
      desc: "Discuss finances inside every group chat room. Share receipt attachments, agree on ratios, and log settlements directly inside the messaging thread.",
      color: "text-violet-400",
      glowBg: "bg-violet-500/5",
      borderColor: "hover:border-violet-500/20",
      points: ["Expense attachments in chat", "Direct message settled alerts", "Live notification hubs"],
      mockup: (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 relative">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[9.5px] font-bold text-white">💬 Chat Room: Goa 🏖️</span>
            <span className="text-[8px] text-white/40">4 members active</span>
          </div>

          <div className="my-auto space-y-2.5">
            {/* Chat message with attachment */}
            <div className="flex items-start gap-2 max-w-[90%]">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex" className="w-5.5 h-5.5 rounded-full bg-yellow-900 mt-0.5" alt="" />
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[7.5px] text-white/40 font-bold">Alex // 2:40 PM</span>
                <div className="bg-white/5 border border-white/10 text-white text-[9px] p-2 rounded-xl rounded-tl-sm flex flex-col gap-2">
                  <span>Hey Priya, here is the taxi bill:</span>
                  <div className="bg-black/35 rounded-lg p-2 border border-white/5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[8.5px] font-bold text-white">🚕 Airport Cab</p>
                      <p className="text-[7.5px] text-white/40">Paid by Alex • ₹1,200</p>
                    </div>
                    <span className="text-[8px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Split</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-6 w-full rounded-md border border-white/5 bg-white/[0.01] px-2 flex items-center justify-between text-white/30 text-[8.5px]">
            <span>Message group...</span>
            <MessageSquare className="w-3 h-3 text-white/30" />
          </div>
        </div>
      ),
    },
    {
      icon: <QrCode className="w-5 h-5 text-amber-400" />,
      tag: "EASY INVITATIONS",
      title: "QR & Link Invites",
      desc: "Generate custom group QR codes or invite links. Guests scan or tap to join instantly without complicated onboarding sheets.",
      color: "text-amber-400",
      glowBg: "bg-amber-500/5",
      borderColor: "hover:border-amber-500/20",
      points: ["One-click join invite links", "Detailed QR code scanners", "Auto group landing page redirection"],
      mockup: (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 relative">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Invite Panel</span>
            <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold">Share</span>
          </div>

          <div className="my-auto flex flex-col items-center gap-3">
            {/* Invite link bubble */}
            <div className="w-full flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-[8.5px] text-white/50 truncate font-mono">splitease.app/join/goa-2026</span>
              <span className="text-[8.5px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md hover:bg-amber-500/25 transition cursor-pointer select-none">Copy</span>
            </div>

            {/* Glowing Invite QR */}
            <div className="w-16 h-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-1.5 relative shadow-inner">
              <svg className="w-full h-full text-white/70" viewBox="0 0 100 100" fill="currentColor">
                <rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="11" y="11" width="10" height="10" />
                <rect x="73" y="5" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="79" y="11" width="10" height="10" />
                <rect x="5" y="73" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="11" y="79" width="10" height="10" />
                <rect x="42" y="20" width="8" height="15" />
                <rect x="55" y="5" width="8" height="8" />
                <rect x="42" y="42" width="18" height="8" />
                <rect x="78" y="42" width="15" height="15" />
                <rect x="73" y="73" width="8" height="22" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5.5 h-5.5 rounded-md bg-[#0B0B0F] border border-amber-500/30 flex items-center justify-center shadow-md">
                  <QrCode className="w-2.5 h-2.5 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[7.5px] text-white/30 text-center font-mono border-t border-white/5 pt-2">
            Scan QR or tap Copy to invite new members
          </div>
        </div>
      ),
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      tag: "OTP CHECKER",
      title: "Secure OTP Login",
      desc: "Every authentication is secured. Login is verified with a one-time passcode generated and dispatched to your email for security.",
      color: "text-emerald-500",
      glowBg: "bg-emerald-500/5",
      borderColor: "hover:border-emerald-500/20",
      points: ["Instant email code dispatch", "Robust protection rules", "Zero password requirement fallback"],
      mockup: (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 relative">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Secure Verification</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="my-auto flex flex-col items-center gap-3">
            <p className="text-[8.5px] text-white/40 text-center">Enter 6-digit Code sent to your inbox</p>
            
            {/* OTP Boxes code digits */}
            <div className="flex gap-2">
              {["5", "2", "9", "8", "_", "_"].map((digit, idx) => (
                <div
                  key={idx}
                  className={`w-7 h-8 rounded-lg bg-white/5 border flex items-center justify-center text-xs font-black select-none ${
                    digit === "_"
                      ? "border-white/10 text-white/20"
                      : "border-emerald-500/40 text-emerald-400"
                  }`}
                  style={digit !== "_" && idx === 3 ? { animation: "pulse-ring 1s infinite" } : {}}
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[7.5px] text-emerald-400/70 text-center font-bold font-mono">
            Sending OTP verification email...
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-[#030303] text-white overflow-hidden z-20">
      {styleBlock}
      
      {/* Background glow graphics */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-900/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-12">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-20 sm:mb-28 text-left">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400 mb-3 font-mono">
            Built for real trips
          </p>
          <h2 className="font-serif-premium font-normal text-white text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] mb-5">
            Every feature your group needs
          </h2>
          <p className="text-white/50 text-sm sm:text-base md:text-lg leading-relaxed font-medium">
            Built from real travel pain points - from scanning receipts to settling cross-group debts with AI.
          </p>
        </div>

        {/* Alternating Split Rows */}
        <div ref={containerRef} className="relative space-y-0">
          
          {/* Central Scroll-Linked Timeline Progress Line */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[120px] bottom-[120px] w-4 h-[calc(100%-240px)] z-0 pointer-events-none">

            {/* Inactive Track — ultra-fine barely-visible dotted line */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <line
                x1="8"
                y1="0"
                x2="8"
                y2="100%"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
                strokeDasharray="2 6"
                strokeLinecap="round"
              />
            </svg>

            {/* Active Glowing Gradient Line — revealed from top as scroll progresses */}
            <motion.div
              className="absolute top-0 left-0 w-full overflow-hidden"
              style={{ height: scaleProgress }}
            >
              <svg
                className="absolute top-0 left-0 w-full"
                style={{ height: "100%", overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="timeline-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="25%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#f472b6" />
                    <stop offset="75%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>

                {/* Wide blurred glow underlay */}
                <line
                  x1="8"
                  y1="0"
                  x2="8"
                  y2="100%"
                  stroke="url(#timeline-gradient)"
                  strokeWidth="6"
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                  opacity="0.25"
                  style={{ filter: "blur(4px)" }}
                />
                {/* Medium glow mid-layer */}
                <line
                  x1="8"
                  y1="0"
                  x2="8"
                  y2="100%"
                  stroke="url(#timeline-gradient)"
                  strokeWidth="3"
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                  opacity="0.5"
                  style={{ filter: "blur(1px)" }}
                />
                {/* Crisp thin top layer */}
                <line
                  x1="8"
                  y1="0"
                  x2="8"
                  y2="100%"
                  stroke="url(#timeline-gradient)"
                  strokeWidth="1.5"
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>

          </div>

          {features.map((feature, index) => {
            const isOdd = index % 2 === 1;

            return (
              <div
                key={feature.title}
                className={`flex flex-col items-center justify-between gap-12 md:gap-20 py-20 md:py-28 border-b border-white/5 last:border-0 relative ${
                  isOdd ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                
                {/* Glowing Dot on the Center Line (Desktop only) */}
                <TimelineDot
                  scrollYProgress={smoothProgress}
                  index={index}
                  total={features.length}
                  color={feature.color}
                />

                {/* Text Block */}
                <motion.div
                  initial={{ opacity: 0, x: isOdd ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="w-full md:w-[45%] flex flex-col gap-4 text-left"
                >
                  <span className={`text-[9.5px] font-extrabold uppercase tracking-widest font-mono ${feature.color}`}>
                    {feature.tag}
                  </span>
                  
                  <h3 className="font-serif-premium font-normal text-white text-2xl sm:text-3xl tracking-tight leading-tight">
                    {feature.title}
                  </h3>
                  
                  <p className="text-white/50 text-xs sm:text-sm leading-relaxed font-medium">
                    {feature.desc}
                  </p>

                  {/* Feature Bullets Checklist */}
                  <ul className="mt-4 space-y-2.5">
                    {feature.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-xs text-white/70 font-medium">
                        <span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-white/60" />
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Premium Visual Mockup Card Block */}
                <motion.div
                  initial={{ opacity: 0, x: isOdd ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="w-full md:w-[48%] flex justify-center"
                >
                  {/* Glassmorphic Mockup Container */}
                  <div
                    className={`w-full max-w-[380px] aspect-[4/3] rounded-2xl bg-[#09090d]/30 backdrop-blur-md border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center group ${feature.borderColor} transition-all duration-500`}
                  >
                    {/* Glowing highlight base behind mock */}
                    <div className={`absolute w-48 h-48 rounded-full ${feature.glowBg} blur-3xl pointer-events-none group-hover:scale-120 transition-transform duration-700`} />
                    
                    {/* Inner Mockup UI Render */}
                    <div className="w-[90%] h-[90%] rounded-xl border border-white/5 overflow-hidden bg-zinc-950/80 shadow-2xl z-10 flex flex-col">
                      {feature.mockup}
                    </div>

                    {/* Reflection diagonal glass shine overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.03] pointer-events-none z-20" />
                  </div>
                </motion.div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

// Global inline css animations
const styleBlock = (
  <style>{`
    @keyframes laser-sweep {
      0%, 100% { top: 6%; opacity: 0.85; }
      50% { top: 94%; opacity: 0.85; }
    }
  `}</style>
);
