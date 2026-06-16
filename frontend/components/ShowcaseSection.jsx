"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

/* ------------------------------------------------------------------ */
/* CONTENT — edit text freely, layout adapts                           */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { num: "01", title: "Group Expense Log", desc: "Create groups with friends and track every shared expense in one clean timeline.", img: "/logs.webp" },
  { num: "02", title: "Smart Split Engine", desc: "Split equally, by percentage, shares or exact amounts — settled in one tap.", img: "/split.webp" },
  { num: "03", title: "OCR Receipt Scan", desc: "Scan any receipt and SplitEase auto-fills items, amounts and taxes instantly.", img: "/ocr.webp" },
  { num: "04", title: "Settle Chat", desc: "Talk and split costs in real time — every payment lives inside the conversation.", img: "/settlechat.webp" },
  { num: "05", title: "Balance Dashboard", desc: "See who owes whom at a glance, with monthly insights and spending trends.", img: "/balancedashboard.webp" },
  { num: "06", title: "Groups At A Glance", desc: "Manage every expense group View members, balances, and activity instantly.", img: "/groupglance.webp" },
];

/* shared card width for every flying card */
const CARD_W = "w-[min(78vw,310px)] md:w-[min(23vw,360px)]"; // sized so top "+" marks clear the fixed navbar

/* ------------------------------------------------------------------ */
/* CARD MARKUP — the visual body of each flying card.                  */
/* ------------------------------------------------------------------ */
function CardBody({ feature, widthClass = CARD_W }) {
  return (
    <div className={`${widthClass} bg-zinc-100 p-4 text-black shadow-[0_30px_90px_-15px_rgba(0,0,0,0.85)] md:p-5`}>
      {/* header: dot-grid + rule */}
      <div className="mb-4 flex items-center gap-3">
        <div className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }).map((_, d) => (
            <span key={d} className="h-[3px] w-[3px] rounded-full bg-black/70" />
          ))}
        </div>
        <div className="h-px flex-1 bg-black/60" />
      </div>

      {/* SQUARE panel — every card shows the same-sized image */}
      <div className="relative aspect-square overflow-hidden rounded-sm bg-zinc-900">
        <Image
          src={feature.img}
          alt={feature.title}
          fill
          sizes="(max-width: 768px) 88vw, 360px"
          className="object-cover"
          draggable={false}
        />
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
  // capped lower than before — large blur() radii are GPU-expensive to composite
  const blur = useTransform(p, [0, 0.45, 0.55, 1], [8, 0, 0, 8]);
  // neighbours stay ~55% visible while parked at the edges
  const opacity = useTransform(p, [0, 0.08, 0.45, 0.55, 0.92, 1], [0, 0.55, 1, 1, 0.55, 0]);
  const filter = useTransform(blur, (b) => `blur(${b.toFixed(1)}px)`);
  const zIndex = useTransform(p, (v) => Math.round((1 - Math.abs(v - 0.5) * 2) * 20));

  const style = reduced ? { opacity, zIndex } : { x, y, rotate, scale, opacity, filter, zIndex };

  // "+" corner marks ride WITH this card — they live inside the same motion
  // wrapper, so they fly, scale and settle together with the card, and only
  // fade in as THIS card lands at center (p ≈ 0.5) and out as it leaves.
  // Only one card is centered at a time, so only one set of marks ever shows.
  const marksOpacity = useTransform(p, [0.34, 0.46, 0.54, 0.66], [0, 1, 1, 0]);
  const CORNERS = ["-left-7 -top-8", "-right-7 -top-8", "-left-7 -bottom-8", "-right-7 -bottom-8"];

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div style={style} className="will-change-transform">
        {/* group + pointer-events-auto so hovering the card can spin the marks */}
        <div className="group relative pointer-events-auto">
          <CardBody feature={feature} />
          {/* corner "+" marks — attached to the card, desktop only.
              On hover each mark makes ONE slow 360° turn in place. */}
          <motion.div
            aria-hidden
            style={{ opacity: marksOpacity }}
            className="pointer-events-none absolute inset-0 hidden md:block"
          >
            {CORNERS.map((pos) => (
              <span
                key={pos}
                className={`absolute ${pos} select-none text-3xl font-thin leading-none text-white transition-transform duration-[900ms] ease-linear group-hover:rotate-[360deg]`}
              >
                +
              </span>
            ))}
          </motion.div>
        </div>
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

  return (
    <>
      {/* DESKTOP / TABLET — animated flying-cards showcase over the globe */}
      <section
        ref={ref}
        aria-label="SplitEase features showcase"
        className="relative hidden bg-black md:block"
        style={{ height: `${(total + 2) * 100}vh` }} // +1 globe-only intro, +1 outro
      >
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          {/* GLOBE — behind everything */}
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-60">
            <Globe scrollProgress={scrollYProgress} />
          </div>

          {/* FLYING CARDS — each card carries its own "+" corner marks, so the
              marks fly in and settle together with the card (see FeatureCard) */}
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

      {/* MOBILE — clean, centered vertical stack with smooth scroll-reveal */}
      <MobileShowcase reduced={reduced} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MOBILE LAYOUT — horizontal carousel: one card at a time, prev/next   */
/* buttons + dots. No heavy globe, no scroll-driven fly-in.             */
/* ------------------------------------------------------------------ */
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

function MobileShowcase({ reduced }) {
  const total = FEATURES.length;
  // [current index, direction of travel] — direction drives the slide
  const [[index, dir], setSlide] = useState([0, 0]);

  const go = (d) =>
    setSlide(([i]) => [(i + d + total) % total, d]);

  const feature = FEATURES[index];

  return (
    <section
      aria-label="SplitEase features showcase"
      className="relative overflow-hidden bg-black md:hidden"
    >
      {/* subtle ambient glow instead of the heavy canvas globe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 55% at 50% 14%, rgba(34,211,238,0.08), transparent 55%)",
        }}
      />

      <div className="relative px-5 py-16">
        {/* card stage — fixed min-height so the arrows never jump */}
        <div
          className="relative flex w-full items-center justify-center"
          style={{ minHeight: "calc(84vw + 168px)" }}
        >
          <AnimatePresence custom={dir} mode="wait" initial={false}>
            <motion.div
              key={feature.num}
              custom={dir}
              variants={reduced ? undefined : slideVariants}
              initial={reduced ? false : "enter"}
              animate={reduced ? { opacity: 1 } : "center"}
              exit={reduced ? { opacity: 0 } : "exit"}
              transition={{ duration: 0.34, ease: "easeOut" }}
              className="flex w-full justify-center"
            >
              <CardBody feature={feature} widthClass="w-[84vw] max-w-[350px]" />
            </motion.div>
          </AnimatePresence>

          {/* arrows sit ON the left & right edges of the card */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous feature"
            className="absolute left-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next feature"
            className="absolute right-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition active:scale-90"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
