"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Briefcase, Home, Plane } from "lucide-react";
import { PlayStoreButton } from "@/components/PlayStoreLink";

export default function SearchIntentSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#030303] px-5 py-24 text-white sm:px-8 sm:py-32"
      aria-labelledby="expense-use-cases"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 h-[450px] w-[450px] rounded-full bg-cyan-500/[0.035] blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/6 h-[450px] w-[450px] rounded-full bg-purple-500/[0.035] blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-emerald-500/[0.025] blur-[150px]" />
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
          className="mx-auto mb-16 max-w-3xl text-center sm:mb-20"
        >
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Built for real shared spending
          </div>
          <h2
            id="expense-use-cases"
            className="font-serif-premium text-3xl font-normal leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.4rem]"
          >
            Designed for trips with <span className="italic text-cyan-400 font-serif-premium">friends</span>, flats with{" "}
            <span className="italic text-emerald-400 font-serif-premium">roommates</span>, and everyday moments.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#8A93A6] sm:text-base">
            SplitEase replaces awkward mental math, scattered notes, and chaotic WhatsApp groups with a clear record of every payment, share, and balance.
          </p>
        </motion.div>

        {/* The Three Scenario Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {/* Card 1: Trips & Vacations */}
          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="group relative flex flex-col justify-between rounded-[26px] border border-white/[0.08] bg-[#0A0A0F]/70 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/35 hover:bg-[#0E0E16]/90 hover:shadow-[0_16px_45px_-15px_rgba(34,211,238,0.2)]"
          >
            <div>
              {/* Card Header & Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  01 // Trips & Travel
                </span>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 transition-colors group-hover:bg-cyan-400/20">
                  <Plane className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <h3 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Trip expense manager
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">
                Fly together, stay together, never argue over who booked the Airbnb. Split flights, fuel, food, and activities with automatic multi-currency support.
              </p>

              <ScenarioImage
                src="/onboarding-trips.webp"
                alt="Four friends taking a selfie in the sea at a Goa beach sunset"
                accent="cyan"
                badge="🌴 Goa Retreat · 6 friends"
                status="Active"
                amountLabel="Trip total"
                amount="₹64,800"
                footLeft="18 bills simplified"
                footRight="Just 2 transfers"
              />
            </div>

            {/* Feature Tags */}
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/5 pt-4 font-mono text-[10px] text-white/45">
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Multi-Currency</span>
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Offline Logs</span>
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">QR Invite</span>
            </div>
          </motion.article>

          {/* Card 2: Flats & Roommates */}
          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="group relative flex flex-col justify-between rounded-[26px] border border-white/[0.08] bg-[#0A0A0F]/70 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/35 hover:bg-[#0E0E16]/90 hover:shadow-[0_16px_45px_-15px_rgba(52,211,153,0.2)]"
          >
            <div>
              {/* Card Header & Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  02 // Living & Rent
                </span>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 transition-colors group-hover:bg-emerald-400/20">
                  <Home className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <h3 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Flat and roommate expenses
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">
                Keep home life peaceful. Manage rent, Wi-Fi, electricity, maid/cook, and grocery runs in one shared transparent ledger with custom ratios.
              </p>

              <ScenarioImage
                src="/onboarding-roommates.webp"
                alt="Flatmates relaxing together at home"
                accent="emerald"
                badge="🏢 Flat 402 · 3 flatmates"
                status="Due 1st"
                amountLabel="Rent + bills"
                amount="₹12,249"
                footLeft="3-way equal"
                footRight="₹4,083 / person"
              />
            </div>

            {/* Feature Tags */}
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/5 pt-4 font-mono text-[10px] text-white/45">
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Recurring Bills</span>
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Custom Shares</span>
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Zero Reminders</span>
            </div>
          </motion.article>

          {/* Card 3: Work & Business */}
          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.19 }}
            className="group relative flex flex-col justify-between rounded-[26px] border border-white/[0.08] bg-[#0A0A0F]/70 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/35 hover:bg-[#0E0E16]/90 hover:shadow-[0_16px_45px_-15px_rgba(168,85,247,0.2)]"
          >
            <div>
              {/* Card Header & Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                  03 // Work & Business
                </span>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-purple-400/25 bg-purple-400/10 text-purple-300 transition-colors group-hover:bg-purple-400/20">
                  <Briefcase className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <h3 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Business and team expenses
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">
                Client visits, offsites and shared project costs. Snap every receipt, split between partners, and keep clean reports ready for accounts.
              </p>

              <ScenarioImage
                src="/onboarding-business.webp"
                alt="Colleagues reviewing shared expenses on a tablet at a conference"
                accent="purple"
                badge="💼 Delhi Client Visit · 4"
                status="Receipts ✓"
                amountLabel="Team spend"
                amount="₹38,500"
                footLeft="Report ready"
                footRight="Export PDF"
              />
            </div>

            {/* Feature Tags */}
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/5 pt-4 font-mono text-[10px] text-white/45">
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Receipt Proof</span>
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">Clean Reports</span>
              <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">AI OCR Scanner</span>
            </div>
          </motion.article>
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
  cyan: { ring: "border-cyan-500/25", chip: "border-cyan-300/40 bg-cyan-400/20 text-cyan-100", dot: "bg-cyan-400", glow: "from-cyan-950/70" },
  emerald: { ring: "border-emerald-500/25", chip: "border-emerald-300/40 bg-emerald-400/20 text-emerald-100", dot: "bg-emerald-400", glow: "from-emerald-950/70" },
  purple: { ring: "border-purple-500/25", chip: "border-purple-300/40 bg-purple-400/20 text-purple-100", dot: "bg-purple-400", glow: "from-purple-950/70" },
};

/* Scenario photo with small glassy labels laid over it: the group name and
   status up top, the running total and a one-line result along the bottom.
   The photos are portrait, so we crop to the upper part where the people are. */
function ScenarioImage({ src, alt, accent, badge, status, amountLabel, amount, footLeft, footRight }) {
  const a = ACCENTS[accent];
  return (
    <div className={`relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl border ${a.ring}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 30vw, 90vw"
        className="object-cover object-[50%_30%] transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      {/* Shade top and bottom so the labels stay readable on any photo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85" />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t ${a.glow} to-transparent opacity-60`} />

      {/* Top labels */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 font-mono text-[10px] font-bold text-white/95 backdrop-blur-md">
          {badge}
        </span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${a.chip}`}>
          {status}
        </span>
      </div>

      {/* Bottom labels */}
      <div className="absolute inset-x-3 bottom-3 space-y-2">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">{amountLabel}</p>
          <p className="text-xl font-bold tracking-tight text-white drop-shadow">{amount}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/45 px-2.5 py-1.5 font-mono text-[10px] backdrop-blur-md">
          <span className="flex items-center gap-1.5 text-white/75">
            <span className={`h-1.5 w-1.5 rounded-full ${a.dot} animate-pulse`} />
            {footLeft}
          </span>
          <span className="font-bold text-white">{footRight}</span>
        </div>
      </div>
    </div>
  );
}
