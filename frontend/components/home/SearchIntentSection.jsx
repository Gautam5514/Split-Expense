"use client";

import SectionHeading from "./SectionHeading";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Briefcase, Home, Plane } from "lucide-react";
import { PlayStoreButton } from "@/components/PlayStoreLink";

const CARDS = [
  {
    accent: "cyan",
    label: "Trips",
    Icon: Plane,
    title: "Going on a trip?",
    desc: "Flights, fuel, food and activities all go in one place. Add expenses as the trip happens, switch currencies when you travel, and settle once when you're back.",
    src: "/onboarding-trips.webp",
    alt: "Four friends taking a selfie in the sea at a Goa beach sunset",
    tags: ["Multi-Currency", "Offline Logs", "QR Invite"],
  },
  {
    accent: "cyan",
    label: "Home",
    Icon: Home,
    title: "Sharing a flat?",
    desc: "Rent, wifi, electricity, the cook and the grocery runs. Split them equally or by custom share, and everyone in the flat sees the same numbers every month.",
    src: "/onboarding-roommates.webp",
    alt: "Flatmates relaxing together at home",
    tags: ["Recurring Bills", "Custom Shares", "Zero Reminders"],
  },
  {
    accent: "purple",
    label: "Work",
    Icon: Briefcase,
    title: "Out with the team?",
    desc: "Client visits, offsites and shared project costs. Snap the receipt, split it between partners, and hand over a clean PDF report to your accounts team.",
    src: "/onboarding-business.webp",
    alt: "Colleagues reviewing shared expenses on a tablet at a conference",
    tags: ["Receipt Proof", "Clean Reports", "AI OCR Scanner"],
  },
];

export default function SearchIntentSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#030303] px-5 py-24 text-white sm:px-8 sm:py-32"
      aria-labelledby="expense-use-cases"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 h-[450px] w-[450px] rounded-full bg-cyan-500/[0.035] blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/6 h-[450px] w-[450px] rounded-full bg-cyan-500/[0.035] blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-cyan-500/[0.025] blur-[150px]" />
      </div>

      {/* Subtle top divider hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          >
<SectionHeading eyebrow="Made for sharing" title="Split the bill." secondary="Keep the friends." description="Goa trips, flat rent, team lunches. SplitEase keeps one clear record of who paid, who owes, and what's left to settle, so nobody has to chase anyone." id="expense-use-cases" />
</motion.div>

        {/* The Three Scenario Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {CARDS.map((card, i) => (
            <ScenarioCard key={card.label} card={card} index={i} />
          ))}
        </div>

        {/* Bottom CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3.5 sm:mt-16"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:scale-[1.03] hover:bg-cyan-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
          >
            Start splitting for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <PlayStoreButton />
        </motion.div>
      </div>
    </section>
  );
}

const ACCENTS = {
  cyan: { ring: "border-cyan-500/25", chip: "border-cyan-300/40 bg-cyan-400/20 text-cyan-100", dot: "bg-cyan-400", glow: "from-cyan-950/70", text: "text-cyan-400", iconBox: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300", spot: "rgba(34,211,238,0.14)", bar: "from-cyan-400 to-cyan-200", tagHover: "hover:border-cyan-400/40 hover:text-cyan-200", hover: "hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-15px_rgba(34,211,238,0.3)]" },
  emerald: { ring: "border-cyan-500/25", chip: "border-cyan-300/40 bg-cyan-400/20 text-cyan-100", dot: "bg-cyan-400", glow: "from-cyan-950/70", text: "text-cyan-400", iconBox: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300", spot: "rgba(34,211,238,0.14)", bar: "from-cyan-400 to-cyan-200", tagHover: "hover:border-cyan-400/40 hover:text-cyan-200", hover: "hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-15px_rgba(34,211,238,0.3)]" },
  purple: { ring: "border-cyan-500/25", chip: "border-cyan-300/40 bg-cyan-400/20 text-cyan-100", dot: "bg-cyan-400", glow: "from-cyan-950/70", text: "text-cyan-400", iconBox: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300", spot: "rgba(168,85,247,0.16)", bar: "from-cyan-400 to-cyan-200", tagHover: "hover:border-cyan-400/40 hover:text-cyan-200", hover: "hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.3)]" },
};


/* One use-case card: cursor spotlight, lift + glow on hover, slow-zoom photo
   with a shimmer sweep. */
function ScenarioCard({ card, index }) {
  const a = ACCENTS[card.accent];
  const { Icon } = card;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMove}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0A0A0F]/70 p-6 transition-all duration-500 hover:-translate-y-2 hover:bg-[#0E0E16]/90 sm:p-7 ${a.hover}`}
    >
      {/* cursor-following spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), ${a.spot}, transparent 60%)` }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${a.text}`}>{card.label}</span>
          <div className={`grid h-10 w-10 place-items-center rounded-xl border transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${a.iconBox}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <h3 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">{card.title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">{card.desc}</p>

        <ScenarioImage card={card} a={a} />
      </div>

      <div className="relative mt-6 flex flex-wrap gap-1.5 border-t border-white/5 pt-4 font-mono text-[10px] text-white/45">
        {card.tags.map((t) => (
          <span
            key={t}
            className={`rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 transition-all duration-300 hover:-translate-y-0.5 ${a.tagHover}`}
          >
            {t}
          </span>
        ))}
      </div>
    </motion.article>
  );
}

/* Scenario photo, cropped to the upper part where the people are. */
function ScenarioImage({ card, a }) {
  return (
    <div className="mt-6">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border ${a.ring}`}>
        <Image
          src={card.src}
          alt={card.alt}
          fill
          sizes="(min-width: 768px) 30vw, 90vw"
          className="object-cover object-[50%_30%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.08]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-black/25" />
        {/* shimmer sweep on hover */}
        <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:animate-[shimmer-sweep_1.1s_ease-out] group-hover:opacity-100" />
      </div>
    </div>
  );
}
