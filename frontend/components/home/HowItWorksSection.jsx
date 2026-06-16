"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

// Single bright accent (AXIOM-style chartreuse) used sparingly.
const ACCENT = "#c9e265";

// Surface colors are applied as INLINE styles (not Tailwind classes) so the
// card, image stage, and borders always paint with a clear contrast against
// the black section - independent of any Tailwind JIT/cache state.
const CARD_BG = "linear-gradient(180deg, #16181c 0%, #101216 100%)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.10)";
const CARD_SHADOW = "0 24px 60px -24px rgba(0,0,0,0.9)";
const STAGE_BG = "#070809"; // thin-black image stage, recessed inside the card
const STAGE_BORDER = "1px solid rgba(255,255,255,0.08)";

const STEPS = [
  {
    index: "01",
    phase: "Setup",
    title: "Create & Invite",
    image: "/create_invite.png",
    desc: "Start a group in seconds for any trip or budget. Invite friends instantly via QR code, link, or email.",
    cta: "Start group",
    href: "/how-it-works#create-group",
  },
  {
    index: "02",
    phase: "Scan",
    title: "Log Expenses",
    image: "/logs.png",
    desc: "Snap any bill and our AI scanner reads every item, splitting costs by share, percentage, or exact amount.",
    cta: "Try scanner",
    href: "/how-it-works#add-expenses",
  },
  {
    index: "03",
    phase: "Clear",
    title: "Settle Smart",
    image: "/settle.png",
    desc: "Our algorithm finds the fewest transactions to clear every debt and zero all balances in a single tap.",
    cta: "Settle up",
    href: "/how-it-works#settle-up",
  },
];

// 3x3 dot matrix used in each card header (AXIOM motif).
function DotGrid() {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{ width: 3, height: 3, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.4)" }}
        />
      ))}
    </div>
  );
}

// A thin `+` crosshair marker (AXIOM blueprint motif). The 16px icon sits in
// a 16px box offset by -8px (-top-2 etc.), so its center lands exactly on the
// card corner - symmetric on all four corners.
function Crosshair({ className = "" }) {
  return (
    <span className={`axiom-cross absolute z-20 flex items-center justify-center w-4 h-4 pointer-events-none ${className}`}>
      <Plus size={30} strokeWidth={2.75} style={{ color: "rgba(255,255,255,0.55)" }} />
    </span>
  );
}

export default function HowItWorksSection() {
  const router = useRouter();

  return (
    <section
      id="how-it-works"
      className="relative py-20 sm:py-28 bg-[#030303] text-white overflow-hidden"
    >
      <style>{`
        @keyframes axiom-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        /* Hovering a card spins its four corner crosshairs a full turn,
           in place - AXIOM blueprint behaviour. */
        .axiom-cross { transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .axiom-card:hover .axiom-cross { transform: rotate(360deg); }
        @media (prefers-reduced-motion: reduce) {
          .axiom-float { animation: none !important; }
          .axiom-cross { transition: none !important; }
        }
      `}</style>

      {/* Warm olive glows - tint the black field toward AXIOM. */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: "rgba(150,168,60,0.06)" }} />
        <div className="absolute bottom-1/4 right-1/5 w-[500px] h-[500px] rounded-full blur-[140px]" style={{ background: "rgba(120,140,50,0.05)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        {/* Technical top bar */}
        <div className="flex items-center gap-4 mb-8">
          <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] whitespace-nowrap" style={{ color: ACCENT }}>
            {"// Workflow · 01 / 03"}
          </span>
          <span className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
            <Plus size={12} style={{ color: "rgba(255,255,255,0.4)" }} />
          </span>
        </div>

        {/* Heading */}
        <div className="mb-14 sm:mb-20 max-w-2xl">
          <h2 className="font-mono font-bold uppercase text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05]" style={{ color: "#ffffff" }}>
            From trip to settle
            <br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>in three steps</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            No spreadsheets, no awkward math, no reminders.
          </p>
        </div>

        {/* Cards grid - wider gaps leave room for the offset corner crosshairs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16 lg:gap-x-16">
          {STEPS.map((step, i) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
              className="group axiom-card relative flex flex-col rounded p-4 sm:p-5"
              style={{ background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_SHADOW }}
            >
              {/* Four corner crosshairs, set just outside each corner with a
                  small gap (12 total) - AXIOM blueprint spacing */}
              <Crosshair className="-top-5 -left-5" />
              <Crosshair className="-top-5 -right-5" />
              <Crosshair className="-bottom-5 -left-5" />
              <Crosshair className="-bottom-5 -right-5" />

              {/* Card header: dot matrix + hairline */}
              <div className="flex items-center gap-3.5 px-1 pt-1 pb-4">
                <DotGrid />
                <span className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
                <span className="font-mono text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{step.index}</span>
              </div>

              {/* Image stage - thin black, recessed within the card */}
              <div
                className="relative aspect-video rounded-sm overflow-hidden"
                style={{ background: STAGE_BG, border: STAGE_BORDER }}
              >
                {/* Faint top light so the transparent diagram has depth */}
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.05), transparent 60%)" }} />
                <div
                  className="axiom-float absolute inset-0 flex items-center justify-center"
                  style={{ animation: `axiom-float 6.5s ease-in-out ${i * 0.7}s infinite` }}
                >
                  <img
                    src={step.image}
                    alt={step.title}
                    loading="lazy"
                    className="w-full h-full object-contain p-2.5 sm:p-3 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                {/* Phase tag */}
                <span
                  className="absolute top-3 left-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm px-2 py-1 rounded-sm"
                  style={{ color: "rgba(255,255,255,0.85)", backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {step.phase}
                </span>
              </div>

              {/* Text block */}
              <div className="flex flex-col flex-1 px-1 pt-6">
                <h3 className="font-mono font-bold uppercase text-xl sm:text-2xl tracking-tight" style={{ color: "#ffffff" }}>
                  {step.title}
                </h3>
                <p className="mt-3 font-mono text-[11px] sm:text-xs leading-[1.75] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {step.desc}
                </p>

                {/* Compact CTA with corner arrow */}
                <button
                  onClick={() => router.push(step.href)}
                  className="mt-7 inline-flex items-center gap-2 self-start rounded-full pl-4 pr-2.5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer"
                  style={{ color: "#ffffff", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {step.cta}
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <ArrowUpRight className="w-3 h-3" strokeWidth={3} style={{ color: "#16180e" }} />
                  </span>
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
