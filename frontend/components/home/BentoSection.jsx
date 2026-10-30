"use client";

import SectionHeading from "./SectionHeading";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* Bento showcase: seven tiles on a 4x3 grid (3 small up top, one big 2x2 tile,
   two small + one wide below). Everything is plain markup / SVG so it stays
   crisp and light, and each tile plays its own small looping demo of real
   SplitEase data. Tiles are always dark, regardless of the site theme. */

const SETTLEMENTS = [
  { emoji: "🧑🏻", amount: "2,400", text: "Riya settled up Goa trip" },
  { emoji: "👩🏽", amount: "850", text: "Aman paid you for dinner" },
  { emoji: "🧔🏻", amount: "1,275", text: "Karan cleared the flat rent" },
];

const tile =
  "group relative overflow-hidden border border-white/[0.06] bg-[#0e0e0e]";

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
});

function useCountUp(to, active, duration = 1.8) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: (x) => setV(x) });
    return () => c.stop();
  }, [to, active, duration]);
  return v;
}

/* 1 — payment received */
function ReceivedTile() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % SETTLEMENTS.length), 3200);
    return () => clearInterval(id);
  }, []);
  const s = SETTLEMENTS[i];
  return (
    <div
      className="flex h-full flex-col items-center justify-between px-[7%] py-[11%] text-center"
      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "12px 12px" }}
    >
      <p className="text-[clamp(11px,1.15cqw,15px)] leading-snug text-white/90">
        Settled instantly
        <br />
        while you sleep.
      </p>
      <div className="relative w-full">
        <div className="absolute inset-x-3 -bottom-1.5 h-4 rounded-b-xl border border-white/5 bg-white/[0.03]" />
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
            className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-[#171717] p-2.5 text-left shadow-xl"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-lg sm:h-11 sm:w-11 sm:text-xl">
              {s.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[clamp(13px,1.5cqw,19px)] font-medium tabular-nums text-white">
                <span className="text-[#2d5df6]">+</span> ₹{s.amount}
              </p>
              <p className="truncate text-[clamp(9px,0.9cqw,12px)] text-white/50">{s.text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <Link href="/login" aria-label="Log in to SplitEase" className="grid h-9 w-11 place-items-center rounded-lg border border-white/10 bg-[#171717] text-white">
        <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          <ArrowRight className="h-4 w-4" />
        </motion.span>
      </Link>
    </div>
  );
}

/* 2 — works everywhere: App · Web · MCP */
const PhoneArt = () => (
  <svg viewBox="0 0 64 100" className="h-[66%] drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]" aria-hidden="true">
    <defs>
      <linearGradient id="phBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d9d4c7" />
      </linearGradient>
      <linearGradient id="phGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1b1b22" />
        <stop offset="1" stopColor="#050507" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="96" rx="14" fill="url(#phBody)" />
    <rect x="9" y="15" width="46" height="17" rx="8.5" fill="url(#phGlass)" />
    <circle cx="20" cy="23.5" r="4.6" fill="#2a2a38" />
    <circle cx="31" cy="23.5" r="4.6" fill="#2a2a38" />
    <circle cx="20" cy="23.5" r="1.6" fill="#6b7cff" opacity=".7" />
    <circle cx="44" cy="21" r="2.4" fill="#e8e1cf" />
    <circle cx="44" cy="27" r="2" fill="#9a968a" />
    <text x="32" y="64" textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" fill="#b9b5a8">G</text>
  </svg>
);

const WebArt = () => (
  <svg viewBox="0 0 100 100" className="h-[62%] drop-shadow-[0_6px_14px_rgba(77,123,255,0.45)]" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="46" cy="48" r="36" />
    <ellipse cx="46" cy="48" rx="15" ry="36" />
    <path d="M10 48h72M17 28q29 9 58 0M17 68q29-9 58 0M46 12v72" />
    <path d="M62 56l30 12-13 5-5 14z" fill="#fff" stroke="#0d0d0f" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const McpArt = () => (
  <svg viewBox="0 0 195 195" className="h-[62%] drop-shadow-[0_6px_14px_rgba(77,123,255,0.45)]" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 103L92 29a17 17 0 0 1 24 24L58 111" />
    <path d="M60 109L121 48a17 17 0 0 1 24 24L83 134a6 6 0 0 0 9 9l54-54" />
  </svg>
);

function PlatformsTile() {
  // App · Web · MCP, fanned like a hand of cards; the centre card sits on top.
  const cards = [
    { label: "App", Art: PhoneArt, rot: -14, x: "-74%", y: "16%", z: 1, delay: 0.4 },
    { label: "Web", Art: WebArt, rot: 0, x: "0%", y: "-10%", z: 3, delay: 0 },
    { label: "MCP", Art: McpArt, rot: 14, x: "74%", y: "16%", z: 2, delay: 0.8 },
  ];
  return (
    <motion.div
      className="relative flex h-full flex-col items-center justify-between overflow-hidden py-[12%]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 45% at 85% 0%, rgba(255,255,255,0.09), transparent 70%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 15% 15%, 15% 15%",
      }}
    >
      {/* soft blue light under the fan */}
      <div className="pointer-events-none absolute left-1/2 top-[48%] h-[40%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f5bff]/25 blur-3xl" />
      <span />
      <div className="relative h-[34%] w-full">
        {cards.map(({ label, Art, rot, x, y, z, delay }) => (
          <motion.div
            key={label}
            initial={false}
            animate={{ x, y, rotate: rot }}
            className="absolute left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[26%] bg-gradient-to-br from-white/35 via-white/5 to-white/20 p-px shadow-[0_22px_36px_-10px_rgba(0,0,0,0.95),0_0_0_1px_rgba(0,0,0,0.6)]"
            style={{ zIndex: z }}
          >
            <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-[inherit] bg-gradient-to-b from-[#2b2b31] via-[#17171b] to-[#0a0a0c] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              {/* glossy sheen */}
              <div className="pointer-events-none absolute -left-1/4 -top-1/2 h-full w-[150%] rotate-[-18deg] bg-gradient-to-b from-white/[0.10] to-transparent" />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut", delay }}
                className="relative flex h-full w-full items-center justify-center"
              >
                <Art />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="relative text-[clamp(10px,1cqw,13px)] tracking-wide text-white/90">App · Web · MCP</p>
    </motion.div>
  );
}

/* 3 — map (wide) */
function MapTile() {
  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_at_20%_80%,rgba(45,93,246,0.4),transparent_60%)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,#0e0e0e)]" />
      <h3 className="absolute left-[4.5%] top-[9%] z-10 max-w-[55%] text-[clamp(20px,3.2cqw,44px)] font-bold leading-[0.98] tracking-tight text-white">
        Expanding horizons. Splitting everywhere.
      </h3>
      <p className="absolute bottom-[9%] left-[4.5%] z-10 text-[clamp(10px,1.2cqw,16px)] leading-snug text-white/45">
        Top Trip Destination:
        <br />
        Goa leads the way.
      </p>
      <div className="absolute inset-y-[3%] right-[4%] aspect-[200/220]">
        <svg viewBox="0 0 200 220" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id="bentoGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            d="M92 8 L104 6 L114 16 L112 28 L124 34 L136 32 L142 44 L158 48 L172 52 L186 58 L184 66 L170 66 L160 72 L150 70 L142 64 L138 74 L126 78 L124 90 L118 98 L112 112 L108 130 L104 150 L98 166 L92 182 L86 190 L80 176 L74 156 L68 138 L56 124 L48 110 L36 100 L22 94 L30 86 L40 80 L46 68 L58 62 L66 48 L78 40 L84 28 L90 18 Z"
            fill="rgba(45,93,246,0.14)"
            stroke="#2d5df6"
            strokeWidth="2.2"
            strokeLinejoin="round"
            filter="url(#bentoGlow)"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
          <circle cx="54" cy="126" r="3.5" fill="#fff" />
          <circle cx="54" cy="126" r="3.5" fill="none" stroke="#6d93ff" strokeWidth="1.5">
            <animate attributeName="r" values="3.5;16" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span className="absolute left-[8%] top-[68%] -translate-x-[110%] rounded-full border border-white/20 bg-[#0e0e0e]/80 px-[clamp(10px,1.6cqw,24px)] py-[clamp(3px,0.5cqw,8px)] text-[clamp(10px,1.3cqw,18px)] text-white shadow-[0_0_0_4px_rgba(255,255,255,0.05)] backdrop-blur">
          Goa
        </span>
      </div>
    </div>
  );
}

/* 4 — big 2x2: the 88% */
function TrustTile() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const n = useCountUp(88, inView, 2);
  return (
    <div
      ref={ref}
      className="relative h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 95% 70% at 50% 0%, #2d5df6 0%, #244ce3 30%, #162d98 55%, #03040a 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <p className="absolute inset-x-0 top-[11%] z-10 px-6 text-center text-[clamp(11px,1.15cqw,15px)] leading-snug text-white/90">
        Trust built on consistent results.
        <br />
        Balances that actually get settled.
      </p>

      <div className="absolute inset-x-0 top-[34%] z-0 text-center font-extrabold leading-none tracking-tighter text-[clamp(110px,19cqw,270px)]">
        <span className="bg-gradient-to-b from-[#0b0b10] to-[#101835] bg-clip-text text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.12)]">
          {Math.round(n)}%
        </span>
      </div>

      {/* folder + split mark */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={inView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-[16%] right-[16%] top-[55%] z-10"
      >
        <div className="absolute left-0 top-0 h-[16%] w-[42%] rounded-t-2xl bg-[#17171b]" />
        <div className="absolute inset-x-0 top-[7%] bottom-0 rounded-t-3xl border border-white/10 bg-gradient-to-b from-[#202024] to-[#0c0c0e] shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
          <div className="absolute left-1/2 top-[32%] flex -translate-x-1/2 items-center">
            <motion.span
              animate={{ x: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="h-[clamp(44px,8cqw,110px)] w-[clamp(44px,8cqw,110px)] rounded-full bg-gradient-to-br from-[#6b6b70] to-[#2a2a2e] shadow-inner"
            />
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="-ml-[clamp(14px,2.8cqw,40px)] h-[clamp(44px,8cqw,110px)] w-[clamp(44px,8cqw,110px)] rounded-full border-2 border-white/15"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* 5 — new standard */
function StandardTile() {
  return (
    <div
      className="relative flex h-full flex-col items-center justify-between py-[10%] text-center"
      style={{
        background:
          "radial-gradient(ellipse 85% 42% at 50% 112%, #2d5df6 0%, #244ce3 38%, rgba(36,76,227,0) 78%), linear-gradient(90deg, rgba(36,76,227,0.85) 0%, rgba(36,76,227,0) 30%, rgba(36,76,227,0) 70%, rgba(36,76,227,0.85) 100%), linear-gradient(180deg, rgba(22,45,152,0.7) 0%, rgba(22,45,152,0) 22%), #03040a",
      }}
    >
      {/* static mark: solid disc overlapping an outlined ring */}
      <span className="flex items-center" aria-hidden="true">
        <span className="h-[clamp(22px,3.4cqw,40px)] w-[clamp(22px,3.4cqw,40px)] rounded-full bg-[#e4e9ff] shadow-[0_0_18px_rgba(160,185,255,0.45)]" />
        <span className="-ml-[clamp(7px,1.1cqw,13px)] h-[clamp(22px,3.4cqw,40px)] w-[clamp(22px,3.4cqw,40px)] rounded-full border-2 border-white/80" />
      </span>
      <h3 className="px-3 text-[clamp(18px,2.6cqw,36px)] font-bold leading-[1.02] tracking-tight text-white">
        Settle Up.
        <br />
        Stay Friends.
      </h3>
      <p className="text-[clamp(10px,1cqw,13px)] text-white/85">Split Snapshot</p>
    </div>
  );
}

/* 6 — counter */
function CounterTile() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const n = useCountUp(128, inView, 1.6);
  return (
    <div ref={ref} className="flex h-full flex-col items-center justify-between py-[11%] text-center">
      <p className="text-[clamp(11px,1.15cqw,15px)] text-white">Expenses Split Today</p>
      <div className="relative">
        <div className="absolute -left-[22%] top-[10%] h-[80%] w-[22%] rounded-l-xl bg-white/[0.03]" />
        <div className="absolute -right-[22%] top-[10%] h-[80%] w-[22%] rounded-r-xl bg-white/[0.03]" />
        <div className="relative grid h-[clamp(70px,10cqw,140px)] min-w-[clamp(70px,10cqw,140px)] place-items-center rounded-[22px] border border-white/10 bg-gradient-to-b from-[#1b1b1f] to-[#0c0c0e] px-4 shadow-2xl">
          <span className="text-[clamp(34px,5.4cqw,76px)] font-semibold tabular-nums leading-none text-[#2d5df6]">
            {Math.round(n)}
          </span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
        </div>
      </div>
      <p className="text-[clamp(10px,1cqw,13px)] leading-snug text-white/70">
        Constant motion
        <br />
        in your groups.
      </p>
    </div>
  );
}

/* 7 — growth chart (wide) */
function GrowthTile() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const n = useCountUp(80.5, inView, 2);
  const line = "M0 98 C 40 104, 80 112, 120 108 C 160 104, 190 70, 215 52 C 240 38, 262 42, 300 46";
  return (
    <div
      ref={ref}
      className="relative flex h-full items-end bg-[radial-gradient(ellipse_at_90%_0%,rgba(45,93,246,0.28),transparent_55%)] p-[4.5%]"
    >
      <span className="absolute left-[4.5%] top-[9%] text-[clamp(34px,5cqw,70px)] font-light leading-none text-white">✻</span>
      <p className="max-w-[40%] text-[clamp(14px,2.1cqw,30px)] leading-tight text-white/90">
        Balances that stay in sync, everywhere.
      </p>

      <div className="absolute inset-y-[7%] right-[5%] w-[44%] overflow-hidden rounded-2xl border border-[#2d5df6]/40 bg-gradient-to-b from-[#2d5df6] to-[#162d98]">
        <p className="absolute left-[7%] top-[9%] text-[clamp(10px,1.1cqw,15px)] text-white/85">Total Settled</p>
        <svg viewBox="0 0 300 130" preserveAspectRatio="none" className="absolute inset-x-0 top-[18%] h-[48%] w-full" aria-hidden="true">
          <defs>
            <linearGradient id="bentoArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4d7bff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#4d7bff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="215" y1="0" x2="215" y2="130" stroke="rgba(255,255,255,0.35)" strokeDasharray="3 4" />
          <path d={`${line} L300 130 L0 130 Z`} fill="url(#bentoArea)" opacity={inView || reduce ? 1 : 0} style={{ transition: "opacity 1.6s ease 0.6s" }} />
          <motion.path
            d={line}
            fill="none"
            stroke="#5f86ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </svg>
        <span className="absolute left-[71.6%] top-[34%] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-[#162d98]" />
        <p className="absolute bottom-[8%] left-[7%] text-[clamp(26px,4cqw,58px)] font-semibold leading-none tabular-nums tracking-tight text-[#2d5df6]">
          +₹{n.toFixed(1)}L
        </p>
      </div>
    </div>
  );
}

export default function BentoSection() {
  return (
    <section className="relative bg-[#050505] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-[1120px]">
        <motion.div {...fadeUp()}>
<SectionHeading eyebrow="SplitEase at a glance" title="Numbers that" secondary="speak for themselves." />
</motion.div>

        {/* 2 cols on mobile, exact 4x3 bento (4:3) from md up */}
        <div className="grid auto-rows-[minmax(190px,44vw)] grid-cols-2 gap-3 [container-type:inline-size] md:aspect-[4/3] md:auto-rows-auto md:grid-cols-4 md:grid-rows-3 md:gap-4">
          <motion.div {...fadeUp(0)} className={tile}><ReceivedTile /></motion.div>
          <motion.div {...fadeUp(1)} className={`${tile}`}><PlatformsTile /></motion.div>
          <motion.div {...fadeUp(2)} className={`${tile} col-span-2`}><MapTile /></motion.div>
          <motion.div {...fadeUp(3)} className={`${tile} col-span-2 row-span-2 md:row-span-2`}><TrustTile /></motion.div>
          <motion.div {...fadeUp(4)} className={tile}><StandardTile /></motion.div>
          <motion.div {...fadeUp(5)} className={tile}><CounterTile /></motion.div>
          <motion.div {...fadeUp(6)} className={`${tile} col-span-2`}><GrowthTile /></motion.div>
        </div>
      </div>
    </section>
  );
}
