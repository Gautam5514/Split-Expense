"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import headingStyles from "./SectionHeading.module.css";
import { ArrowRight, Plus, Receipt, MessageCircle, Bell, Link2, SlidersHorizontal } from "lucide-react";

/* "Who it's for" - an editorial scroll section. On desktop the index on the
   left stays pinned while one card per audience slides up over the last as
   you scroll; the index follows along and clicking it scrolls to that card.
   On mobile the cards simply stack. Toggles in the mock are real SplitEase group
   settings, so nothing here promises a feature we don't have. */

const AUDIENCES = [
  {
    tab: "Students",
    title: "One hostel group for mess, rent and late-night orders",
    desc: "Everyone logs what they paid. SplitEase keeps a running balance, so nobody keeps a notebook or chases a friend at month end.",
    group: "Hostel Block B",
    handle: "Hostel · 4 members",
    avatar: "🎓",
    tint: ["#0891B2", "#164E63", "#0B2A33"],
    bills: [["🍛", "Mess fee"], ["🛒", "Daily orders"], ["📺", "Subscriptions"]],
    rules: [["Ask for a bill photo on every expense", false], ["Approve new members before they join", true]],
  },
  {
    tab: "Roommates",
    title: "Rent, groceries and bills, split the same way every month",
    desc: "Set the split once when you create the group. Every expense after that follows it, and balances update live for everyone.",
    group: "Flat 402",
    handle: "Roommates · 3 members",
    avatar: "🏠",
    tint: ["#0F766E", "#134E4A", "#0A2E2B"],
    bills: [["🏠", "Rent"], ["🥦", "Groceries"], ["⚡", "Electricity"]],
    rules: [["Ask for a bill photo on every expense", true], ["Approve new members before they join", true]],
  },
  {
    tab: "Trips",
    title: "Eighteen bills on a trip, settled in two transfers",
    desc: "Add stays, cabs and food as you go, in any currency. At the end, SplitEase works out the fewest payments to make everyone even.",
    group: "Goa Trip 2026",
    handle: "Trip · 6 members",
    avatar: "✈️",
    tint: ["#22D3EE", "#0E7490", "#0B2A33"],
    bills: [["🏨", "Stays"], ["🚕", "Cabs"], ["🎟️", "Activities"]],
    rules: [["Ask for a bill photo on every expense", false], ["Approve new members before they join", false]],
  },
  {
    tab: "Friends",
    title: "Dinners, parties and gifts without the awkward maths",
    desc: "Snap the receipt, and the group sees who paid and who owes. Chat about it right next to the expense.",
    group: "Friday Gang",
    handle: "Friends · 4 members",
    avatar: "🍕",
    tint: ["#14B8A6", "#115E59", "#0A2E2B"],
    bills: [["🍷", "Dinners"], ["🎁", "Gifts"], ["🎉", "Parties"]],
    rules: [["Ask for a bill photo on every expense", false], ["Approve new members before they join", true]],
  },
  {
    tab: "Anywhere",
    title: "Any group, any currency, one clear balance",
    desc: "Office lunches, a shared car, a family event. If a bill gets shared, SplitEase keeps it fair, on web, Android and inside your AI assistant.",
    group: "Team Offsite",
    handle: "Group · 5 members",
    avatar: "🌍",
    tint: ["#06B6D4", "#155E75", "#0B2A33"],
    bills: [["💱", "Multi-currency"], ["🧾", "Receipts"], ["🤖", "Via AI chat"]],
    rules: [["Ask for a bill photo on every expense", true], ["Approve new members before they join", false]],
  },
];

// Where the pinned index and stacked cards sit below the fixed navbar.
const STICK_TOP = 112;

export default function FeatureMindMap() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const markers = useRef([]);

  // The card whose top marker has passed the pin line is the active one.
  // Markers are plain (non-sticky) divs, so their position is the real
  // scroll position even while the cards themselves are stuck.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = STICK_TOP + window.innerHeight * 0.25;
      let next = 0;
      markers.current.forEach((m, i) => { if (m && m.getBoundingClientRect().top <= line) next = i; });
      setActive(next);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const goTo = (i) => {
    const m = markers.current[i];
    if (!m) return;
    const y = window.scrollY + m.getBoundingClientRect().top - STICK_TOP;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  };

  const onKeyDown = (event) => {
    const n = AUDIENCES.length;
    const next = { ArrowDown: (active + 1) % n, ArrowUp: (active + n - 1) % n, Home: 0, End: n - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    goTo(next);
    event.currentTarget.querySelectorAll("button")[next]?.focus();
  };

  return (
    <section id="who-its-for" className="relative bg-[#030303] py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header: eyebrow + big statement, CTA on the right */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={headingStyles.eyebrow}>{"// Who it’s for"}</p>
            <h2 className="mt-5 max-w-3xl text-[clamp(2.1rem,5.4vw,4.1rem)] font-semibold leading-[1.04] tracking-[-0.035em]">
              Made for every group that shares a bill.
            </h2>
          </div>
          <Link
            href="/register"
            className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-transform duration-200 hover:scale-[1.03]"
          >
            Start a group
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[220px_1fr] lg:gap-14">
          {/* Pinned index (desktop only) */}
          <nav aria-label="Who SplitEase is for" className="hidden lg:block">
            <ul onKeyDown={onKeyDown} className="sticky border-t border-white/10" style={{ top: STICK_TOP }}>
              {AUDIENCES.map((a, i) => {
                const on = i === active;
                return (
                  <li key={a.tab}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => goTo(i)}
                      className={`flex w-full items-center justify-between gap-6 border-b border-white/10 py-6 text-left text-xs font-semibold uppercase tracking-[0.22em] transition-colors duration-300 ${
                        on ? "text-white" : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      {a.tab}
                      <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">
                        {on ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : <Plus size={14} strokeWidth={1.6} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Cards: each one pins and the next slides up over it */}
          <div className="space-y-6 lg:space-y-0">
            {AUDIENCES.map((a, i) => (
              <Fragment key={a.tab}>
                <div ref={(el) => { markers.current[i] = el; }} aria-hidden="true" />
                <AudienceCard a={a} index={i} reduced={reduced} last={i === AUDIENCES.length - 1} />
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceCard({ a, index, reduced, last }) {
  const [c1, c2, c3] = a.tint;
  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-label={a.tab}
      className={`overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0A0A0C] shadow-[0_-30px_60px_-30px_rgba(0,0,0,0.9)] lg:sticky ${last ? "" : "lg:mb-[28vh]"}`}
      style={{ top: STICK_TOP, zIndex: index + 1 }}
    >
      <div className="grid items-center gap-8 p-6 sm:p-10 lg:min-h-[500px] lg:grid-cols-[0.9fr_1.2fr] lg:gap-10 lg:p-12">
        {/* Copy */}
        <div className="lg:self-end lg:pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400/80">{a.tab}</p>
          <h3 className="mt-4 text-[clamp(1.5rem,3vw,2.2rem)] font-semibold leading-[1.12] tracking-[-0.025em]">{a.title}</h3>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">{a.desc}</p>
        </div>

        {/* Mock: group profile on a soft gradient backdrop */}
        <div
          className="relative overflow-hidden rounded-[22px] p-5 sm:p-8"
          style={{
            background: `radial-gradient(120% 90% at 15% 0%, ${c1} 0%, transparent 60%), radial-gradient(100% 80% at 100% 100%, ${c3} 0%, transparent 65%), linear-gradient(160deg, ${c2} 0%, #0B0B0E 100%)`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />

          {/* glass frame */}
          <div className="relative rounded-[20px] border border-white/25 bg-white/10 p-1.5 backdrop-blur-md">
            <div className="rounded-[16px] bg-[#111114]/95 p-4 shadow-2xl sm:p-5">
              {/* identity row */}
              <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.07] text-2xl ring-1 ring-white/10">{a.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tracking-tight">{a.group}</p>
                  <p className="truncate text-xs text-white/45">{a.handle}</p>
                </div>
                <div className="hidden gap-1.5 sm:flex">
                  {[Receipt, MessageCircle, Bell].map((Icon, i) => (
                    <span key={i} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/60">
                      <Icon size={14} />
                    </span>
                  ))}
                </div>
              </div>

              {/* bills */}
              <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <Link2 size={13} className="text-white/45" /> Common bills
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {a.bills.map(([emoji, name]) => (
                  <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/80">
                    <span className="text-sm leading-none">{emoji}</span>{name}
                  </span>
                ))}
              </div>

              {/* rules */}
              <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <SlidersHorizontal size={13} className="text-white/45" /> Group rules
              </p>
              <div className="mt-2.5 space-y-2">
                {a.rules.map(([label, on]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                    <span className="text-[11px] font-medium text-white/75 sm:text-xs">{label}</span>
                    <span className={`relative h-5 w-9 shrink-0 rounded-full ${on ? "bg-cyan-500" : "bg-white/15"}`} aria-hidden="true">
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${on ? "left-[18px]" : "left-0.5"}`} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
