"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

/* ------------------------------------------------------------------ */
/* CONTENT — edit text freely, layout adapts                           */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { num: "01", title: "Group Expense Log", desc: "Create groups with friends and track every shared expense in one clean timeline.", bars: [88, 46, 70, 38, 80, 55] },
  { num: "02", title: "Smart Split Engine", desc: "Split equally, by percentage, shares or exact amounts — settled in one tap.", bars: [60, 90, 42, 76, 50, 84] },
  { num: "03", title: "OCR Receipt Scan", desc: "Scan any receipt and SplitEase auto-fills items, amounts and taxes instantly.", bars: [78, 52, 88, 40, 66, 48] },
  { num: "04", title: "Settle Chat", desc: "Talk and split costs in real time — every payment lives inside the conversation.", bars: [50, 82, 60, 90, 44, 72] },
  { num: "05", title: "Balance Dashboard", desc: "See who owes whom at a glance, with monthly insights and spending trends.", bars: [86, 58, 74, 46, 90, 52] },
  { num: "06", title: "Instant Settle-Up", desc: "Clear all debts with UPI in seconds. No reminders, no mental math.", bars: [64, 88, 48, 78, 56, 84] },
];

/* shared card width — used by the flying cards AND the invisible
   measuring card behind the "+" marks, so they always align */
const CARD_W = "w-[min(78vw,310px)] md:w-[min(23vw,360px)]"; // sized so top "+" marks clear the fixed navbar

/* ------------------------------------------------------------------ */
/* CARD MARKUP — single source of truth.                               */
/* Used (a) inside every flying card and (b) as an INVISIBLE measuring */
/* copy at center so the "+" marks hug the real card corners exactly.  */
/* ------------------------------------------------------------------ */
function CardBody({ feature }) {
  return (
    <div className={`${CARD_W} rounded-md bg-zinc-100 p-4 text-black shadow-[0_30px_90px_-15px_rgba(0,0,0,0.85)] md:p-5`}>
      {/* header: dot-grid + rule */}
      <div className="mb-4 flex items-center gap-3">
        <div className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }).map((_, d) => (
            <span key={d} className="h-[3px] w-[3px] rounded-full bg-black/70" />
          ))}
        </div>
        <div className="h-px flex-1 bg-black/60" />
      </div>

      {/* SQUARE dark panel with skeleton bars */}
      <div className="relative flex aspect-square flex-col justify-center gap-3 rounded-sm bg-zinc-900 p-7 md:p-9">
        {feature.bars.map((w, b) => (
          <div
            key={b}
            className="h-[7px] rounded-full bg-zinc-100/90"
            style={{ width: `${w}%`, marginLeft: b % 2 ? "auto" : 0 }}
          />
        ))}
        <span className="absolute bottom-5 right-6 h-2.5 w-2.5 rounded-full bg-cyan-400" />
      </div>

      <h3 className="mt-4 text-lg font-bold uppercase tracking-tight md:text-xl">
        {feature.num}. {feature.title}
      </h3>
      <p className="mt-1.5 text-[11px] font-medium uppercase leading-relaxed tracking-wide text-black/70 md:text-xs">
        {feature.desc}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ONE FLYING CARD                                                     */
/*                                                                     */
/*  raw = scrollYProgress * (total + 2); LEAD = 1 empty unit at the    */
/*  start → the section opens with ONLY the globe (no cards).          */
/*  Card i centers at raw = i + 0.5 + LEAD. Journey 2.4 vs spacing     */
/*  1.0 → three cards on stage: prev parked left, current sharp at     */
/*  center, next parked right.                                         */
/*                                                                     */
/*  ARC = OVER THE TOP (Axiom): the card appears HIGH on the right,    */
/*  descends along the upper arc into center, then climbs back UP      */
/*  and out to the upper-left — orbiting over the globe's crown.       */
/*  Rotation follows the arc tangent. Last card exits too, closing     */
/*  on a globe-only frame (symmetric with the intro).                  */
/* ------------------------------------------------------------------ */
function FeatureCard({ feature, index, total, progress, reduced }) {
  const LEAD = 1; // globe-only intro
  const p = useTransform(progress, (v) => {
    const raw = v * (total + 2);
    const local = (raw - (index + 0.5 + LEAD)) / 2.4 + 0.5;
    return Math.min(1, Math.max(0, local));
  });

  const x = useTransform(p, [0, 0.45, 0.55, 1], ["46vw", "0vw", "0vw", "-46vw"]);
  // OVER-THE-TOP arc: high at the edges, settles at center
  const y = useTransform(p, [0, 0.45, 0.55, 1], ["-14vh", "0vh", "0vh", "-14vh"]);
  const rotate = useTransform(p, [0, 0.45, 0.55, 1], [-6, 0, 0, 6]); // arc tangent
  // DEPTH: arrives SMALL from far away, grows to full size at center,
  // then recedes smaller as it leaves — 3D orbital feel
  const scale = useTransform(p, [0, 0.45, 0.55, 1], [0.55, 1, 1, 0.7]);
  const blur = useTransform(p, [0, 0.45, 0.55, 1], [14, 0, 0, 13]);
  // neighbours stay ~55% visible while parked at the edges
  const opacity = useTransform(p, [0, 0.08, 0.45, 0.55, 0.92, 1], [0, 0.55, 1, 1, 0.55, 0]);
  const filter = useTransform(blur, (b) => `blur(${b.toFixed(1)}px)`);
  const zIndex = useTransform(p, (v) => Math.round((1 - Math.abs(v - 0.5) * 2) * 20));

  const style = reduced ? { opacity, zIndex } : { x, y, rotate, scale, opacity, filter, zIndex };

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div style={style} className="will-change-transform">
        <CardBody feature={feature} />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN SECTION                                                        */
/* ------------------------------------------------------------------ */
export default function ShowcaseSection() {
  const ref = useRef(null);
  const total = FEATURES.length;
  const reduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // "+" marks should only show while a card is on stage — hidden during
  // the globe-only intro/outro frames (LEAD = 1 unit on each end).
  const LEAD = 1;
  const introEnd = (0.5 + LEAD - 1.2) / (total + 2);
  const introFull = (0.5 + LEAD - 0.12) / (total + 2);
  const outroFull = (total - 1 + 0.5 + LEAD + 0.12) / (total + 2);
  const outroEnd = (total - 1 + 0.5 + LEAD + 1.2) / (total + 2);
  const marksOpacity = useTransform(
    scrollYProgress,
    [introEnd, introFull, outroFull, outroEnd],
    [0, 1, 1, 0]
  );

  return (
    <section
      ref={ref}
      aria-label="SplitEase features showcase"
      className="relative bg-black"
      style={{ height: `${(total + 2) * 100}vh` }} // +1 globe-only intro, +1 outro
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* GLOBE — behind everything */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-60 max-md:opacity-40">
          <Globe scrollProgress={scrollYProgress} />
        </div>

        {/* "+" corner marks — an INVISIBLE real card measures the exact
            centered-card box, so the marks hug its corners pixel-perfectly.
            Do NOT remove the invisible CardBody; it is the measuring element. */}
        <motion.div
          aria-hidden
          style={{ opacity: marksOpacity }}
          className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center md:flex"
        >
          <div className="relative">
            <div className="invisible">
              <CardBody feature={FEATURES[0]} />
            </div>
            {[
              "-left-10 -top-7",
              "-right-10 -top-7",
              "-left-10 -bottom-7",
              "-right-10 -bottom-7",
            ].map((pos) => (
              <span key={pos} className={`absolute ${pos} z-10 select-none text-2xl font-thin leading-none text-zinc-500`}>
                +
              </span>
            ))}
          </div>
        </motion.div>

        {/* FLYING CARDS */}
        <div className="absolute inset-0 z-20">
          {FEATURES.map((f, i) => (
            <FeatureCard
              key={f.num}
              feature={f}
              index={i}
              total={total}
              progress={scrollYProgress}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
