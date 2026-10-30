"use client";

import SectionHeading from "./SectionHeading";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { GraduationCap, House, Building2, Plane, Users, Globe2, ArrowUpRight } from "lucide-react";

const AUDIENCES = [
  {
    label: "Hostel Students",
    icon: GraduationCap,
    tagline: "Mess, rent and daily orders made simple.",
    group: "Hostel Block B",
    members: ["🧑🏻", "👩🏽", "🧔🏻", "👩🏻"],
    expenses: [["🍛", "Mess fee", "Aman", 4200], ["🛒", "Daily orders", "Riya", 860], ["📺", "Subscriptions", "Karan", 399]],
    result: "4 people · settled in 2 transfers",
  },
  {
    label: "Roommates",
    icon: House,
    tagline: "Split rent, groceries and house expenses easily.",
    group: "Flat 402",
    members: ["🧑🏽", "👩🏻", "🧔🏽"],
    expenses: [["🏠", "Rent & bills", "Neha", 24000], ["🥦", "Groceries", "Rohit", 3150], ["⚡", "Utilities", "Neha", 1850]],
    result: "3 people · ₹9,667 each",
  },
  {
    label: "Flatmates",
    icon: Building2,
    tagline: "Shared living, simplified.",
    group: "Koramangala Crew",
    members: ["👩🏽", "🧑🏻", "👩🏻", "🧔🏻", "🧑🏽"],
    expenses: [["🏢", "Shared rent", "Aditi", 42000], ["📶", "Wi-Fi", "Karan", 1200], ["🛋️", "Household purchases", "Neha", 6400]],
    result: "5 people · auto-reminders on",
  },
  {
    label: "Trip Explorers",
    icon: Plane,
    tagline: "Keep your trips fun, not complicated.",
    group: "Goa Trip 2026",
    members: ["🧑🏻", "👩🏽", "🧔🏻", "👩🏻", "🧑🏽", "👩🏼"],
    expenses: [["🏨", "Stays & cabs", "Rohit", 28400], ["🍤", "Food & fun", "Aditi", 9600], ["🎟️", "Activities & tickets", "Karan", 6800]],
    result: "6 friends · 18 bills → 2 transfers",
  },
  {
    label: "Friend Groups",
    icon: Users,
    tagline: "From dinners out to parties and gifts.",
    group: "Friday Gang",
    members: ["🧑🏽", "👩🏻", "🧔🏽", "👩🏽"],
    expenses: [["🍷", "Dinners out", "Neha", 5400], ["🎁", "Parties & gifts", "Aman", 2300], ["📅", "Events", "Riya", 1800]],
    result: "4 friends · everyone even",
  },
  {
    label: "Anywhere You Split",
    icon: Globe2,
    tagline: "Any group, any currency, any use case.",
    group: "Remote Team",
    members: ["🧑🏻", "👩🏽", "🧔🏻"],
    expenses: [["👥", "Any group", "Sam", 120], ["💱", "Any currency", "Aditi", 85], ["🧩", "Any custom expense", "Karan", 40]],
    currency: "$",
    result: "3 people · 3 currencies · one balance",
  },
];

const INTERVAL = 4500;
const fmt = (n, c = "₹") => c + n.toLocaleString("en-IN");

export default function FeatureMindMap() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { amount: .08 });

  useEffect(() => {
    if (paused || reduced || !inView) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % AUDIENCES.length), INTERVAL);
    return () => clearTimeout(id);
  }, [active, paused, reduced, inView]);

  const cur = AUDIENCES[active];
  const cc = cur.currency || "₹";
  const total = cur.expenses.reduce((s, e) => s + e[3], 0);

  return (
    <section ref={sectionRef} id="who-its-for" className="relative overflow-hidden bg-[#030303] py-20 text-white sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/[0.06] blur-[140px]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Who it’s for" title="Built for anyone" secondary="who splits money" description="From a hostel room to a week-long trip, anywhere a bill gets shared, SplitEase fits right in." />

        <div
          className="grid items-stretch gap-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => { if (!sectionRef.current?.contains(document.activeElement)) setPaused(false); }}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        >
          {/* Persona selector: big type, no images */}
          <ul role="tablist" aria-label="Who SplitEase is for" aria-orientation="vertical" onKeyDown={(event) => {
            const next = { ArrowDown: (active + 1) % AUDIENCES.length, ArrowUp: (active + AUDIENCES.length - 1) % AUDIENCES.length, Home: 0, End: AUDIENCES.length - 1 }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            setActive(next);
            event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
          }} className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {AUDIENCES.map((a, i) => {
              const on = i === active;
              const Icon = a.icon;
              return (
                <li key={a.label}>
                  <button
                    role="tab"
                    type="button"
                    id={`persona-${i}`}
                    aria-controls="persona-preview"
                    tabIndex={on ? 0 : -1}
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    className="group relative flex w-full items-center gap-2 overflow-hidden py-4 text-left sm:gap-6 sm:py-5"
                  >
                    <span className={`w-5 shrink-0 font-mono text-xs sm:w-7 transition-colors ${on ? "text-cyan-400" : "text-white/25"}`}>0{i + 1}</span>
                    <span className={`min-w-0 flex-1 font-sans text-[clamp(15px,4.6vw,20px)] font-extrabold uppercase tracking-tight transition-all duration-300 sm:text-3xl lg:text-[2.1rem] ${on ? "sm:translate-x-2 text-white" : "text-white/30 group-hover:text-white/60"}`}>
                      {a.label}
                    </span>
                    <Icon className={`ml-auto h-5 w-5 shrink-0 transition-all duration-300 ${on ? "text-cyan-400" : "text-white/20"}`} aria-hidden="true" />
                    <ArrowUpRight className={`h-5 w-5 shrink-0 transition-all duration-300 ${on ? "translate-x-0 text-cyan-400 opacity-100" : "-translate-x-2 opacity-0"}`} aria-hidden="true" />
                    {on && !reduced && !paused && (
                      <motion.span
                        key={`bar-${active}`}
                        className="absolute bottom-0 left-0 h-px bg-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: INTERVAL / 1000, ease: "linear" }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Live ledger for the active persona */}
          <div className="relative min-w-0" role="tabpanel" id="persona-preview" aria-labelledby={`persona-${active}`} tabIndex={0}>
            <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-cyan-400/40 via-cyan-400/5 to-transparent" aria-hidden="true" />
            <div className="relative h-full rounded-[28px] bg-[#071218] p-6 sm:p-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={cur.label}
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Live group</p>
                      <h3 className="mt-1.5 text-xl font-bold tracking-tight">{cur.group}</h3>
                      <p className="mt-1 text-xs text-white/50">{cur.tagline}</p>
                    </div>
                    <div className="flex -space-x-1.5">
                      {cur.members.map((m, i) => (
                        <span key={i} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#071218] bg-[#16262e] text-base">{m}</span>
                      ))}
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {cur.expenses.map(([emoji, name, who, amt], i) => (
                      <motion.li
                        key={name}
                        initial={reduced ? false : { opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * i + 0.1, duration: 0.35 }}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-lg">{emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{name}</p>
                          <p className="text-[11px] text-white/45">paid by {who}</p>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-bold tabular-nums sm:text-sm">{fmt(amt, cc)}</span>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Group total</p>
                      <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">{fmt(total, cc)}</p>
                    </div>
                    <span className="max-w-full rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200">
                      {cur.result}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
