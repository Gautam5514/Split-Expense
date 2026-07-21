"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Coffee, HeartHandshake, PiggyBank, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

/* About page: same dark landing theme as What We Offer / Pricing, with the
   stone imagery flanking the hero on both sides. Kept short on purpose -
   this is the "who we are" page, not a feature dump. */

const VALUES = [
  {
    icon: PiggyBank,
    title: "We split bills, not friendships",
    desc: "No more 'send me later' that never comes. SplitEase does the math so nobody has to be the group's unofficial accountant.",
  },
  {
    icon: Coffee,
    title: "Built by people who forgot their wallet",
    desc: "Every feature exists because one of us, at some dinner, said 'ugh, who owes what again?' We just kept fixing that.",
  },
  {
    icon: HeartHandshake,
    title: "Friendly on purpose",
    desc: "No jargon, no spreadsheets, no 47-step signup. If your grandparents can order food online, they can split a bill here.",
  },
  {
    icon: ShieldCheck,
    title: "Your money talk stays private",
    desc: "Your groups, balances, and chats are yours. We're in the business of easy splitting, not selling your data.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
};

function Eyebrow({ children }) {
  return (
    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
      {children}
    </p>
  );
}

export default function AboutPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const float = (delay) =>
    reducedMotion
      ? {}
      : { animate: { y: [0, -14, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero with the mountain/stone imagery flanking both sides, same as every other page */}
      <header className="relative px-6 pb-24 pt-40 text-center sm:pt-52">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />
        <motion.img
          src="/stone-left.webp"
          alt=""
          {...float(0)}
          className="pointer-events-none absolute -left-10 top-36 hidden w-44 -rotate-12 opacity-70 lg:block xl:left-16"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />
        <motion.img
          src="/stone-right.webp"
          alt=""
          {...float(1.4)}
          className="pointer-events-none absolute -right-14 top-48 hidden w-64 rotate-12 opacity-70 lg:block xl:right-10"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />

        <Eyebrow>About us</Eyebrow>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-3xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          The app that ends &ldquo;I&apos;ll Venmo you later&rdquo;
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-xl text-sm font-medium text-white/50 sm:text-base">
          SplitEase started as a napkin full of bad math after a group trip
          nobody could settle. Now it&apos;s the easiest way for friends,
          roommates, and travel groups to split anything without the
          awkward part.
        </p>
      </header>

      {/* The very brief origin story - two short lines, no fluff */}
      <section className="mx-auto max-w-3xl px-6 text-center">
        <Eyebrow>Our story, short version</Eyebrow>
        <h2 className="font-serif-premium text-2xl font-normal tracking-tight sm:text-3xl">
          Six friends, one trip, zero idea who owed what
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
          One of us paid for the cabs. Another covered dinner. Someone
          &ldquo;definitely&rdquo; paid for snacks but had no proof. Three
          group chats and a very messy spreadsheet later, we built the tool
          we wished we&apos;d had - so we finished it, split it equally
          (fittingly), and now anyone can use it. That&apos;s the whole
          story. We told you it was short.
        </p>
      </section>

      {/* Personality / values, kept to four quick cards */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <Eyebrow>What we actually care about</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Not another finance app pretending to be fun
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {VALUES.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: (i % 2) * 0.1, ease: "easeOut" }}
              className="group rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-7 transition-colors duration-300 hover:border-cyan-400/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 transition-transform duration-300 group-hover:scale-110">
                <item.icon size={21} />
              </span>
              <h3 className="font-serif-premium mt-5 text-xl font-normal">{item.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 pb-28 pt-28 text-center sm:pt-36">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Come split bills with us
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-white/50 sm:text-base">
          Free to join, free to use, and free of that one friend who never pays you back.
        </p>
        <button
          onClick={() => router.push("/register")}
          className="clickable mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
        >
          Get started for free
          <ArrowRight size={16} />
        </button>
      </section>

      <Footer />
    </div>
  );
}
