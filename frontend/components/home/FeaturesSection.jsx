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
                   color.includes('emerald') ? '#22d3ee' :
                   color.includes('pink') ? '#22d3ee' :
                   color.includes('violet') ? '#22d3ee' :
                   color.includes('amber') ? '#22d3ee' : '#22d3ee';

  return (
    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-4 z-10 pointer-events-none items-center justify-center">
      {/* Station platform indicator cross-tie on both sides (dono side) */}
      <motion.div
        style={{
          scaleX: scale,
          opacity: glowOpacity,
        }}
        className="absolute left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      />
      {/* Outer glowing ring */}
      <motion.div
        style={{
          scale,
          opacity: glowOpacity,
          borderColor: dotColor,
          boxShadow: `0 0 12px 2px ${dotColor}55, 0 0 4px ${dotColor}`,
        }}
        className="w-4 h-4 rounded-full border bg-[#030303] relative z-10 flex items-center justify-center"
      >
        {/* Inner filled dot */}
        <motion.div
          style={{
            opacity: innerDotOpacity,
            backgroundColor: dotColor,
            scale,
          }}
          className="w-1.5 h-1.5 rounded-full"
        />
      </motion.div>
    </div>
  );
}

function TrackTrainIcon({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 34 112" className="h-[104px] w-8 overflow-visible">
      <path
        d="M17 2C9 3 5 9 5 18v76c0 9 4 15 12 16 8-1 12-7 12-16V18C29 9 25 3 17 2Z"
        fill="#041115"
        stroke="#a5f3fc"
        strokeWidth="1.25"
      />
      <path d="M6 38h22M6 74h22" stroke="#22d3ee" strokeOpacity=".55" />

      {/* A driving cab at both ends means the train never needs to flip. */}
      <rect x="9" y="10" width="16" height="21" rx="6" fill="#0b2931" stroke="#67e8f9" strokeOpacity=".65" />
      <rect x="9" y="81" width="16" height="21" rx="6" fill="#0b2931" stroke="#67e8f9" strokeOpacity=".65" />
      <path d="M12 16h10v8H12zM12 88h10v8H12z" fill="#67e8f9" fillOpacity=".35" />

      {/* Shared passenger compartment. */}
      <rect x="9" y="45" width="16" height="22" rx="5" fill="#082129" stroke="#67e8f9" strokeOpacity=".48" />
      <circle cx="14" cy="52" r="2" fill="#cffafe" />
      <circle cx="20" cy="52" r="2" fill="#cffafe" />

      {/* Symmetrical noses; only the leading headlight shines at full power. */}
      <path d="M9 13C11.5 6 22.5 6 25 13V9C22 2 12 2 9 9Z" fill="#cffafe" fillOpacity=".9" />
      <path d="M9 99c2.5 7 13.5 7 16 0v4c-3 7-13 7-16 0Z" fill="#cffafe" fillOpacity=".9" />
      <circle
        cx="17"
        cy="5"
        r="1.9"
        fill="#fff"
        opacity={direction === "up" ? 1 : 0.35}
        className={direction === "up" ? "drop-shadow-[0_0_6px_#22d3ee]" : ""}
      />
      <circle
        cx="17"
        cy="107"
        r="1.9"
        fill="#fff"
        opacity={direction === "down" ? 1 : 0.35}
        className={direction === "down" ? "drop-shadow-[0_0_6px_#22d3ee]" : ""}
      />
    </svg>
  );
}

function RailwayBufferStop({ position = "bottom" }) {
  const isTop = position === "top";

  return (
    <div
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-10 w-16 overflow-visible ${
        isTop ? "-top-[160px]" : "-bottom-[96px]"
      }`}
    >
      <svg
        viewBox="0 0 64 68"
        className="w-16 h-[68px] overflow-visible drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
        style={{
          transform: isTop ? "scaleY(-1)" : undefined,
          transformOrigin: "center center",
        }}
      >
        <defs>
          {/* 45-degree classic railway hazard safety stripes */}
          <pattern
            id={`hazard-stripes-${position}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="#09090b" />
            <rect x="0" y="0" width="4" height="8" fill="#f59e0b" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#fde047" strokeWidth="0.6" />
          </pattern>

          {/* Metallic hydraulic cylinder gradient */}
          <linearGradient id={`steel-cylinder-${position}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="35%" stopColor="#64748b" />
            <stop offset="65%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Luminous Red Danger Lamp Glow filter */}
          <filter id={`red-beacon-glow-${position}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- TRACK EXTENSION & BASE SLEEPERS --- */}
        {/* Sleeper 1 (approach tie) */}
        <rect x="16" y="8" width="32" height="4.5" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.7" />
        {/* Sleeper 2 (under buffer impact zone) */}
        <rect x="14" y="20" width="36" height="5" rx="1.2" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
        {/* Sleeper 3 (terminal ground tie) */}
        <rect x="10" y="54" width="44" height="6" rx="1.5" fill="#18181b" stroke="#52525b" strokeWidth="0.8" />

        {/* Extended Steel Rails (Gauge: Left=26, Right=38 matching timeline track gauge) */}
        <line x1="26" y1="0" x2="26" y2="54" stroke="rgba(207,250,254,0.4)" strokeWidth="2.5" strokeLinecap="square" />
        <line x1="38" y1="0" x2="38" y2="54" stroke="rgba(207,250,254,0.4)" strokeWidth="2.5" strokeLinecap="square" />
        <line x1="26" y1="0" x2="26" y2="54" stroke="#000" strokeWidth="0.9" opacity="0.8" />
        <line x1="38" y1="0" x2="38" y2="54" stroke="#000" strokeWidth="0.9" opacity="0.8" />

        {/* --- WHEEL CHOCKS (FRICTION RAIL STOPS) --- */}
        {/* Left rail chock */}
        <g>
          <rect x="23" y="7" width="6" height="7" rx="1.2" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
          <path d="M23 7 L29 11 L29 14 L23 14 Z" fill="#1e293b" opacity="0.6" />
          <circle cx="26" cy="9" r="0.85" fill="#f8fafc" />
          <circle cx="26" cy="12" r="0.85" fill="#f8fafc" />
        </g>
        {/* Right rail chock */}
        <g>
          <rect x="35" y="7" width="6" height="7" rx="1.2" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
          <path d="M35 7 L41 11 L41 14 L35 14 Z" fill="#1e293b" opacity="0.6" />
          <circle cx="38" cy="9" r="0.85" fill="#f8fafc" />
          <circle cx="38" cy="12" r="0.85" fill="#f8fafc" />
        </g>

        {/* --- HEAVY STEEL A-FRAME BRACING TRUSS --- */}
        {/* Outer diagonal heavy support girders */}
        <path
          d="M17 35 L25 54 M47 35 L39 54"
          stroke="#334155"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M17 35 L25 54 M47 35 L39 54"
          stroke="#64748b"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Inner diagonal cross-lattice bracing ('X' brace) */}
        <line x1="20" y1="36" x2="44" y2="52" stroke="#475569" strokeWidth="1.6" />
        <line x1="44" y1="36" x2="20" y2="52" stroke="#475569" strokeWidth="1.6" />
        {/* Center Gusset Plate with Rivets */}
        <rect
          x="28.5"
          y="40.5"
          width="7"
          height="7"
          rx="1"
          transform="rotate(45 32 44)"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="0.8"
        />
        <circle cx="32" cy="44" r="1.1" fill="#e2e8f0" />

        {/* Anchor Baseplates bolted to rail terminations */}
        <rect x="22" y="52" width="8" height="4.5" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        <circle cx="24" cy="54" r="0.75" fill="#e2e8f0" />
        <circle cx="28" cy="54" r="0.75" fill="#e2e8f0" />
        <rect x="34" y="52" width="8" height="4.5" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        <circle cx="36" cy="54" r="0.75" fill="#e2e8f0" />
        <circle cx="40" cy="54" r="0.75" fill="#e2e8f0" />

        {/* Rail End Safety Horns (curled terminal tips) */}
        <path d="M26 54 C26 57 24 59 21 59" stroke="rgba(207,250,254,0.45)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M38 54 C38 57 40 59 43 59" stroke="rgba(207,250,254,0.45)" strokeWidth="2.2" fill="none" strokeLinecap="round" />

        {/* --- DUAL HYDRAULIC BUFFER CYLINDERS (DONO SIDE) --- */}
        {/* Left hydraulic piston shaft */}
        <rect
          x="23.5"
          y="16"
          width="5"
          height="9"
          rx="1.2"
          fill={`url(#steel-cylinder-${position})`}
          stroke="#475569"
          strokeWidth="0.6"
        />
        {/* Right hydraulic piston shaft */}
        <rect
          x="35.5"
          y="16"
          width="5"
          height="9"
          rx="1.2"
          fill={`url(#steel-cylinder-${position})`}
          stroke="#475569"
          strokeWidth="0.6"
        />

        {/* Left Impact Buffer Head (facing train) */}
        <g filter="drop-shadow(0 0 6px rgba(34,211,238,0.3))">
          <ellipse cx="26" cy="16" rx="7" ry="3.8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
          <ellipse cx="26" cy="16" rx="4.8" ry="2.2" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
          <circle cx="26" cy="16" r="1.2" fill="#f8fafc" />
        </g>

        {/* Right Impact Buffer Head (facing train) */}
        <g filter="drop-shadow(0 0 6px rgba(34,211,238,0.3))">
          <ellipse cx="38" cy="16" rx="7" ry="3.8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
          <ellipse cx="38" cy="16" rx="4.8" ry="2.2" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
          <circle cx="38" cy="16" r="1.2" fill="#f8fafc" />
        </g>

        {/* --- HEAVY BUFFER BEAM (HEADSTOCK) --- */}
        {/* Shadow under beam */}
        <rect x="7" y="24" width="50" height="12" rx="2.5" fill="#000" opacity="0.6" />
        {/* Main steel beam body */}
        <rect
          x="8"
          y="23"
          width="48"
          height="12"
          rx="2"
          fill="#0f172a"
          stroke="#64748b"
          strokeWidth="1"
        />
        {/* Hazard safety stripes face plate */}
        <rect
          x="9.5"
          y="24.5"
          width="45"
          height="9"
          rx="1"
          fill={`url(#hazard-stripes-${position})`}
          stroke="#18181b"
          strokeWidth="0.5"
        />
        {/* Steel beam edge rim highlight */}
        <line x1="9" y1="23.5" x2="55" y2="23.5" stroke="#94a3b8" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="9" y1="34.5" x2="55" y2="34.5" stroke="#334155" strokeWidth="0.8" strokeLinecap="round" />

        {/* Left End-cap & Rivets */}
        <rect x="8" y="23" width="3.5" height="12" rx="1" fill="#334155" stroke="#475569" strokeWidth="0.6" />
        <circle cx="9.8" cy="25.5" r="0.65" fill="#e2e8f0" />
        <circle cx="9.8" cy="32.5" r="0.65" fill="#e2e8f0" />
        {/* Right End-cap & Rivets */}
        <rect x="52.5" y="23" width="3.5" height="12" rx="1" fill="#334155" stroke="#475569" strokeWidth="0.6" />
        <circle cx="54.2" cy="25.5" r="0.65" fill="#e2e8f0" />
        <circle cx="54.2" cy="32.5" r="0.65" fill="#e2e8f0" />

        {/* --- CENTRAL RED DANGER STOP SIGNAL LANTERN --- */}
        {/* Outer dark bezel & reflective silver ring */}
        <circle cx="32" cy="29" r="6" fill="#030712" stroke="#e2e8f0" strokeWidth="0.9" />
        {/* Red beacon glow backdrop */}
        <circle cx="32" cy="29" r="9" fill="#ef4444" opacity="0.35" filter="blur(3px)" />
        {/* Red lens core with luminous beacon filter */}
        <circle
          cx="32"
          cy="29"
          r="4.2"
          fill="#ef4444"
          filter={`url(#red-beacon-glow-${position})`}
        />
        {/* Center bright core */}
        <circle cx="32" cy="29" r="2.2" fill="#ff6b6b" />
        {/* Specular highlight glint */}
        <ellipse cx="30.8" cy="27.8" rx="1.2" ry="0.7" fill="#ffffff" opacity="0.95" />
      </svg>
    </div>
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
      color: "text-cyan-400",
      glowBg: "bg-cyan-500/10",
      borderColor: "hover:border-cyan-500/25",
      points: ["Item-by-item split allocation", "Smart total and tax identification", "Automatic item categorization"],
      image: "/ocr_recept.webp",
    },
    {
      tag: "LLM INSIGHTS",
      title: "AI Expense Assistant",
      desc: "Ask our embedded LLM assistant anything about your spend. Get spending breakdowns, net-debt summaries, and tap-to-clear settlements instantly.",
      color: "text-cyan-400",
      glowBg: "bg-cyan-500/10",
      borderColor: "hover:border-cyan-500/25",
      points: ["Ask custom spending queries", "Generates visual debt charts", "Automatic payment suggestions"],
      image: "/ai_expense.webp",
    },
    {
      tag: "GROUP CHAT",
      title: "Group & Direct Chat",
      desc: "Discuss finances inside every group chat room. Share receipt attachments, agree on ratios, and log settlements directly inside the messaging thread.",
      color: "text-cyan-400",
      glowBg: "bg-cyan-500/10",
      borderColor: "hover:border-cyan-500/25",
      points: ["Expense attachments in chat", "Direct message settled alerts", "Live notification hubs"],
      image: "/groupchat.webp",
    },
    {
      tag: "EASY INVITATIONS",
      title: "QR & Link Invites",
      desc: "Generate custom group QR codes or invite links. Guests scan or tap to join instantly without complicated onboarding sheets.",
      color: "text-cyan-400",
      glowBg: "bg-cyan-500/10",
      borderColor: "hover:border-cyan-500/25",
      points: ["One-click join invite links", "Detailed QR code scanners", "Auto group landing page redirection"],
      image: "/qrlink.webp",
    },
    {
      tag: "OTP CHECKER",
      title: "Secure OTP Login",
      desc: "Every authentication is secured. Login is verified with a one-time passcode generated and dispatched to your email for security.",
      color: "text-cyan-500",
      glowBg: "bg-cyan-500/10",
      borderColor: "hover:border-cyan-500/25",
      points: ["Instant email code dispatch", "Robust protection rules", "Zero password requirement fallback"],
      image: "/secure_otp.webp",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-[#030303] text-white overflow-hidden z-20">

      {/* Background glow graphics */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-900/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[500px] bg-cyan-900/5 rounded-full blur-[140px]" />
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

            {/* Authentic Railway Buffer Stops on both ends (dono side) */}
            <RailwayBufferStop position="top" />
            <RailwayBufferStop position="bottom" />

            {/* Inactive railway — twin rails with evenly spaced sleepers extending continuously through entire route */}
            <div className="absolute -top-[160px] -bottom-[96px] left-0 w-full overflow-visible">
              <svg className="w-full h-full overflow-visible">
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
            </div>

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
                    <stop offset="25%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="75%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#22d3ee" />
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
              <span className="absolute bottom-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                <TrackTrainIcon direction={trainDirection} />
              </span>
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
