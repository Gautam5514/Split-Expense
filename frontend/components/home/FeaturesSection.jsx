"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Check } from "lucide-react";

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
      tag: "REAL-TIME BALANCES",
      title: "Live Balance Tracking",
      desc: "Every expense updates balances instantly for all group members. No manual refreshes or calculations needed - the split state updates in real-time.",
      color: "text-cyan-400",
      glowBg: "bg-cyan-500/10",
      borderColor: "hover:border-cyan-500/25",
      points: ["Real-time synchronization across devices", "Instant net-debt calculations", "Automatic multi-currency support"],
      image: "/live_balance_tracking.webp",
    },
    {
      tag: "AI OCR PARSER",
      title: "OCR Receipt Scanning",
      desc: "Point your camera at any bill or import a PDF. Our smart AI scanner reads the total, tax, items, and tax ratios instantly without manual typing.",
      color: "text-emerald-400",
      glowBg: "bg-emerald-500/10",
      borderColor: "hover:border-emerald-500/25",
      points: ["Item-by-item split allocation", "Smart total and tax identification", "Automatic item categorization"],
      image: "/ocr_recept.webp",
    },
    {
      tag: "LLM INSIGHTS",
      title: "AI Expense Assistant",
      desc: "Ask our embedded LLM assistant anything about your spend. Get spending breakdowns, net-debt summaries, and tap-to-clear settlements instantly.",
      color: "text-pink-400",
      glowBg: "bg-pink-500/10",
      borderColor: "hover:border-pink-500/25",
      points: ["Ask custom spending queries", "Generates visual debt charts", "Automatic payment suggestions"],
      image: "/ai_expense.webp",
    },
    {
      tag: "GROUP CHAT",
      title: "Group & Direct Chat",
      desc: "Discuss finances inside every group chat room. Share receipt attachments, agree on ratios, and log settlements directly inside the messaging thread.",
      color: "text-violet-400",
      glowBg: "bg-violet-500/10",
      borderColor: "hover:border-violet-500/25",
      points: ["Expense attachments in chat", "Direct message settled alerts", "Live notification hubs"],
      image: "/groupchat.webp",
    },
    {
      tag: "EASY INVITATIONS",
      title: "QR & Link Invites",
      desc: "Generate custom group QR codes or invite links. Guests scan or tap to join instantly without complicated onboarding sheets.",
      color: "text-amber-400",
      glowBg: "bg-amber-500/10",
      borderColor: "hover:border-amber-500/25",
      points: ["One-click join invite links", "Detailed QR code scanners", "Auto group landing page redirection"],
      image: "/qrlink.webp",
    },
    {
      tag: "OTP CHECKER",
      title: "Secure OTP Login",
      desc: "Every authentication is secured. Login is verified with a one-time passcode generated and dispatched to your email for security.",
      color: "text-emerald-500",
      glowBg: "bg-emerald-500/10",
      borderColor: "hover:border-emerald-500/25",
      points: ["Instant email code dispatch", "Robust protection rules", "Zero password requirement fallback"],
      image: "/secure_otp.webp",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-[#030303] text-white overflow-hidden z-20">

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

                {/* Premium Visual - real feature render */}
                <motion.div
                  initial={{ opacity: 0, x: isOdd ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="w-full md:w-[48%] flex justify-center"
                >
                  {/* Image stage - black bg lets the render's own backdrop blend seamlessly */}
                  <div
                    className={`group w-full max-w-[420px] aspect-[5/4] rounded-2xl bg-[#050506] border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center transition-colors duration-500 ${feature.borderColor}`}
                  >
                    {/* Glowing accent behind the render */}
                    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full ${feature.glowBg} blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700`} />

                    <img
                      src={feature.image}
                      alt={feature.title}
                      loading="lazy"
                      className="relative z-10 w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />

                    {/* Diagonal glass shine */}
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
