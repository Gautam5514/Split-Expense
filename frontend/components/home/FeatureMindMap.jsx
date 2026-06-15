"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";

const ACCENT = "#c9e265"; // section accent (matches the rest of the landing)

// Single source of truth. Add an audience or item = one array entry.
const AUDIENCES = [
  { id: "hostel", label: "Hostel Students", color: "#34d399", items: ["Mess & rent", "Daily orders"] },
  { id: "roommates", label: "Roommates", color: "#38bdf8", items: ["Rent & bills", "Groceries"] },
  { id: "flatmates", label: "Flatmates", color: "#a78bfa", items: ["Shared rent", "Utilities"] },
  { id: "trips", label: "Trip Explorers", color: "#fb7185", items: ["Stays & cabs", "Food & fun"] },
  { id: "friends", label: "Friend Groups", color: "#fbbf24", items: ["Dinners out", "Parties & gifts"] },
  { id: "anywhere", label: "Anywhere You Split", color: "#2dd4bf", items: ["Any group", "Any currency"] },
];

const ROW_H = 40;

/** A smooth horizontal cubic between two points. */
function curve(px, py, cx, cy) {
  const dx = cx - px;
  return `M ${px} ${py} C ${px + dx * 0.5} ${py}, ${cx - dx * 0.5} ${cy}, ${cx} ${cy}`;
}

/** Track container width so the tree is responsive. */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Compute the whole tree (positions + cascading animation delays). */
function buildTree(width, rootRightX) {
  const x1 = Math.max(330, width * 0.32);
  const x2 = Math.max(610, width * 0.62);

  const totalRows = AUDIENCES.reduce((n, a) => n + Math.max(1, a.items.length), 0);
  const gapRows = (AUDIENCES.length - 1) * 0.55;
  const padding = 24;
  const H = (totalRows + gapRows) * ROW_H + padding * 2;
  const cyRoot = H / 2;

  const nodes = [];
  const edges = [];
  let cursor = padding;

  AUDIENCES.forEach((a, ai) => {
    const rows = Math.max(1, a.items.length);
    const blockH = rows * ROW_H;
    const ay = cursor + blockH / 2;
    cursor += blockH + 0.55 * ROW_H;

    const d1 = 0.12 + ai * 0.1; // level-1 stagger

    nodes.push({ id: a.id, level: 1, x: x1, y: ay, color: a.color, label: a.label, delay: d1 + 0.45 });
    edges.push({ id: `e-root-${a.id}`, color: a.color, w: 2, d: curve(rootRightX, cyRoot, x1, ay), delay: d1 });

    a.items.forEach((it, ii) => {
      const iy = ay + (ii - (a.items.length - 1) / 2) * ROW_H;
      const id = `${a.id}-${ii}`;
      const d2 = 0.7 + ai * 0.1 + ii * 0.07; // level-2 stagger (after level-1)
      nodes.push({ id, level: 2, x: x2, y: iy, color: a.color, label: it, delay: d2 + 0.4 });
      edges.push({ id: `e-${id}`, color: a.color, w: 1.4, d: curve(x1, ay, x2, iy), delay: d2 });
    });
  });

  return { nodes, edges, H, cyRoot };
}

export default function FeatureMindMap() {
  const reduce = useReducedMotion();
  const [ref, width] = useWidth();
  const compact = width > 0 && width < 760;

  const viewRef = useRef(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const play = inView || reduce;

  return (
    <section id="who-its-for" className="relative py-14 sm:py-20 bg-[#030303] text-white overflow-hidden">
      {/* Soft glow to lift the black field a touch. */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/3 w-[640px] h-[640px] -translate-y-1/2 rounded-full blur-[170px]" style={{ background: "rgba(150,168,60,0.05)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        {/* Technical eyebrow */}
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] whitespace-nowrap" style={{ color: ACCENT }}>
            {"// Who it's for · 02 / 03"}
          </span>
          <span className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
            <Plus size={12} style={{ color: "rgba(255,255,255,0.4)" }} />
          </span>
        </div>

        {/* Heading */}
        <div className="mb-8 sm:mb-10 max-w-2xl">
          <h2 className="font-mono font-bold uppercase text-2xl sm:text-3xl md:text-4xl tracking-tight leading-[1.05]">
            Built for anyone
            <br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>who splits money</span>
          </h2>
          <p className="mt-4 text-sm text-white/55 max-w-lg">
            From a hostel room to a week-long trip, anywhere a bill gets shared,
            SplitEase branches out to fit.
          </p>
        </div>

        {/* The mind map */}
        <div ref={viewRef}>
          <div ref={ref} className="relative w-full">
            {compact ? (
              <CompactTree play={play} reduce={reduce} />
            ) : (
              width > 0 && <OrganicTree width={width} play={play} reduce={reduce} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Desktop: thin left-rooted tree that draws itself in ────────── */
function OrganicTree({ width, play, reduce }) {
  const pillRef = useRef(null);
  const pillLeft = 4;
  const [pillW, setPillW] = useState(190);
  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => setPillW(el.offsetWidth); // full border-box width
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // Converge the branches *under* the pill so they always emerge from its right
  // edge — tucked 16px inside, hidden by the opaque pill, never leaving a gap.
  const rootRightX = pillLeft + pillW - 16;
  const { nodes, edges, H, cyRoot } = buildTree(width, rootRightX);

  return (
    <div className="relative" style={{ height: H }}>
      <svg width={width} height={H} className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
        {edges.map((e) => (
          <motion.path
            key={e.id}
            d={e.d}
            fill="none"
            stroke={e.color}
            strokeWidth={e.w}
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0.55 : 0 }}
            animate={play ? { pathLength: 1, opacity: 0.55 } : {}}
            transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : e.delay, ease: "easeInOut" }}
          />
        ))}
      </svg>

      {/* Root pill — static wrapper keeps the vertical centering; inner motion
          element owns the entrance animation so the two transforms don't clash. */}
      <div className="absolute z-20" style={{ left: pillLeft, top: cyRoot, transform: "translateY(-50%)" }}>
        <motion.div
          className="inline-block"
          initial={{ opacity: 0, x: reduce ? 0 : -8 }}
          animate={play ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: reduce ? 0 : 0.4 }}
        >
          <div
            ref={pillRef}
            className="flex items-center gap-2.5 rounded-full px-5 py-2.5"
            style={{ background: "#080a0d", border: `1px solid ${ACCENT}66`, boxShadow: `0 0 22px ${ACCENT}2e` }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACCENT, boxShadow: `0 0 7px ${ACCENT}` }} />
            <span className="font-mono text-sm font-bold uppercase tracking-wide text-white whitespace-nowrap">SplitEase</span>
          </div>
        </motion.div>
      </div>

      {/* Nodes + labels — wrapper centers on the line endpoint (and pulls left by
          the dot's radius so the dot's centre, not its edge, sits on the line). */}
      {nodes.map((n) => {
        const r = n.level === 1 ? 4.5 : 3;
        return (
          <div
            key={n.id}
            className="absolute z-10"
            style={{ left: n.x - r, top: n.y, transform: "translateY(-50%)" }}
          >
            <motion.div
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: reduce ? 0 : -6 }}
              animate={play ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : n.delay }}
            >
              <span
                className="rounded-full shrink-0"
                style={{
                  width: r * 2,
                  height: r * 2,
                  background: n.color,
                  boxShadow: `0 0 6px ${n.color}aa`,
                }}
              />
              <span
                className={
                  n.level === 1
                    ? "text-[13px] font-semibold uppercase tracking-[0.08em] text-white/90 whitespace-nowrap"
                    : "text-[13px] font-normal text-white/55 whitespace-nowrap"
                }
              >
                {n.label}
              </span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Mobile: root on top, audiences as a clean indented list ────── */
function CompactTree({ play, reduce }) {
  return (
    <div className="flex flex-col gap-5">
      <div
        className="self-start flex items-center gap-2.5 rounded-full px-5 py-2.5"
        style={{ background: "rgba(9,11,14,0.9)", border: `1px solid ${ACCENT}66`, boxShadow: `0 0 18px ${ACCENT}2a` }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
        <span className="font-mono text-sm font-bold uppercase tracking-wide text-white">SplitEase</span>
      </div>

      <motion.div
        className="flex flex-col gap-5 pl-5 ml-2"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}
        initial="hidden"
        animate={play ? "show" : "hidden"}
        variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } }}
      >
        {AUDIENCES.map((a) => (
          <motion.div
            key={a.id}
            variants={{ hidden: { opacity: 0, x: reduce ? 0 : -10 }, show: { opacity: 1, x: 0 } }}
            transition={{ duration: reduce ? 0 : 0.3 }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color, boxShadow: `0 0 7px ${a.color}aa` }} />
              <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/90">{a.label}</span>
            </div>
            <div className="mt-1.5 ml-5 flex flex-wrap gap-x-4 gap-y-1">
              {a.items.map((it) => (
                <span key={it} className="text-[12px] text-white/45">{it}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
