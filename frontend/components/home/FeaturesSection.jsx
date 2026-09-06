"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, useSpring } from "framer-motion";
import { Check } from "lucide-react";

const FEATURE_COUNT = 6;

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

function TrackTrainIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 34 112" className="h-[104px] w-8 overflow-visible">
      <path
        d="M17 2C9 2 5 8 5 16v76c0 10 5 17 12 18 7-1 12-8 12-18V16C29 8 25 2 17 2Z"
        fill="#041115"
        stroke="#a5f3fc"
        strokeWidth="1.25"
      />
      <path d="M6 38h22M6 68h22" stroke="#22d3ee" strokeOpacity=".55" />
      <rect x="9" y="10" width="16" height="20" rx="6" fill="#0b2931" stroke="#67e8f9" strokeOpacity=".65" />
      <rect x="9" y="42" width="16" height="20" rx="5" fill="#082129" stroke="#67e8f9" strokeOpacity=".48" />
      <rect x="9" y="72" width="16" height="20" rx="5" fill="#082129" stroke="#67e8f9" strokeOpacity=".48" />
      <circle cx="14" cy="49" r="2" fill="#cffafe" />
      <circle cx="20" cy="49" r="2" fill="#cffafe" />
      <circle cx="14" cy="79" r="2" fill="#cffafe" />
      <circle cx="20" cy="79" r="2" fill="#cffafe" />
      <path d="M9 96c2.5 7 13.5 7 16 0v5c-3 8-13 8-16 0Z" fill="#cffafe" />
      <path d="M12 16h10v8H12z" fill="#67e8f9" fillOpacity=".35" />
      <circle cx="17" cy="106" r="1.8" fill="#fff" className="drop-shadow-[0_0_5px_#22d3ee]" />
    </svg>
  );
}

export default function FeaturesSection() {
  const containerRef = useRef(null);
  const previousScrollRef = useRef(0);
  const [trainDirection, setTrainDirection] = useState("down");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001
  });

  // Point the engine in the direction in which the visitor is travelling.
  // A small threshold prevents trackpad noise from rapidly flipping the train.
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const previous = previousScrollRef.current;
    const delta = latest - previous;

    if (Math.abs(delta) > 0.00015) {
      setTrainDirection(delta > 0 ? "down" : "up");
      previousScrollRef.current = latest;
    }
  });

  // The stations sit at the centre of six equally-sized timeline rows. Scroll
  // progress, however, starts at the container edge. Remap it to the actual
  // first/last station so the train and glowing track share one coordinate
  // system instead of drifting apart as the page gets taller.
  const firstStationProgress = 1 / (FEATURE_COUNT * 2);
  const lastStationProgress = 1 - firstStationProgress;
  const routeProgress = useTransform(
    smoothProgress,
    [firstStationProgress, lastStationProgress],
    [0, 1],
    { clamp: true }
  );

  const scaleProgress = useTransform(routeProgress, [0, 1], ["0%", "100%"]);

  // Give every feature dot a "station" dwell zone, then ease the train onward.
  const trainProgress = useTransform(routeProgress, (value) => {
    const lastStation = FEATURE_COUNT - 1;
    const scaled = Math.min(value * lastStation, lastStation - 0.0001);
    const station = Math.floor(scaled);
    const local = scaled - station;

    if (local <= 0.14) return station / lastStation;
    if (local >= 0.86) return (station + 1) / lastStation;

    const travel = (local - 0.14) / 0.72;
    const eased = travel * travel * (3 - 2 * travel);
    return (station + eased) / lastStation;
  });
  const trainY = useTransform(trainProgress, [0, 1], ["0%", "100%"]);

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
          <div
            className="hidden md:block absolute left-1/2 -translate-x-1/2 w-7 z-0 pointer-events-none"
            style={{
              top: `calc(100% / ${FEATURE_COUNT * 2})`,
              bottom: `calc(100% / ${FEATURE_COUNT * 2})`,
            }}
          >

            {/* Inactive railway — twin rails with evenly spaced sleepers. */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                <pattern id="railway-sleepers" width="28" height="15" patternUnits="userSpaceOnUse">
                  <line x1="3" y1="7.5" x2="25" y2="7.5" stroke="rgba(255,255,255,.2)" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="5" y1="9.5" x2="23" y2="9.5" stroke="rgba(0,0,0,.7)" strokeWidth="1" strokeLinecap="round" />
                </pattern>
              </defs>
              <rect width="28" height="100%" fill="url(#railway-sleepers)" />
              <line x1="8" y1="0" x2="8" y2="100%" stroke="rgba(207,250,254,.35)" strokeWidth="2" />
              <line x1="20" y1="0" x2="20" y2="100%" stroke="rgba(207,250,254,.35)" strokeWidth="2" />
              <line x1="9.5" y1="0" x2="9.5" y2="100%" stroke="rgba(0,0,0,.75)" strokeWidth="1" />
              <line x1="18.5" y1="0" x2="18.5" y2="100%" stroke="rgba(0,0,0,.75)" strokeWidth="1" />
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
                  <pattern id="active-railway-sleepers" width="28" height="15" patternUnits="userSpaceOnUse">
                    <line x1="3" y1="7.5" x2="25" y2="7.5" stroke="#67e8f9" strokeOpacity=".75" strokeWidth="2.2" strokeLinecap="round" />
                  </pattern>
                </defs>
                <rect width="28" height="100%" fill="url(#active-railway-sleepers)" opacity=".75" />
                <g style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,.8))" }}>
                  <line x1="8" y1="0" x2="8" y2="100%" stroke="url(#timeline-gradient)" strokeWidth="2.5" />
                  <line x1="20" y1="0" x2="20" y2="100%" stroke="url(#timeline-gradient)" strokeWidth="2.5" />
                </g>
              </svg>
            </motion.div>

            {/* Scroll follower — a tiny train that pauses at every feature station. */}
            <motion.div
              className="absolute left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ top: trainY }}
            >
              <span className="absolute bottom-2 h-12 w-12 animate-pulse rounded-full bg-cyan-400/15 blur-lg" />
              <motion.span
                className="absolute bottom-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                animate={{ rotate: trainDirection === "down" ? 0 : 180 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                style={{ transformOrigin: "50% 100%" }}
              >
                <TrackTrainIcon />
              </motion.span>
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
                  scrollYProgress={routeProgress}
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
