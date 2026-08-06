"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Calculator,
  Link2,
  MessageCircleMore,
  ScanLine,
  Trophy,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

/* A proper filled coin-stack (reads clearly as "coins", unlike the thin
   outline icon). Uses currentColor so it inherits the cyan accent. */
function CoinsIcon({ size = 18, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* cylinder body (two stacked coins) */}
      <path d="M5 7 V16 A7 2.6 0 0 0 19 16 V7 Z" fill="currentColor" opacity="0.5" />
      {/* seam between the two coins */}
      <path d="M5 11.5 A7 2.6 0 0 0 19 11.5" fill="none" stroke="#030303" strokeOpacity="0.35" strokeWidth="0.9" />
      {/* top coin face */}
      <ellipse cx="12" cy="7" rx="7" ry="2.6" fill="currentColor" />
      {/* shine */}
      <ellipse cx="9.5" cy="6.3" rx="2.4" ry="0.8" fill="#ffffff" opacity="0.45" />
    </svg>
  );
}

/* "What we offer" page: floating device imagery, the core offering cards,
   a refer-and-earn roadmap (real reward numbers from the referral system),
   Elite Club tiers, and a mockup showcase. Landing theme throughout. */

const OFFERINGS = [
  { icon: Calculator, title: "Smart Split Engine", desc: "Split equally, by percentage, shares, or exact amounts. The math is handled the moment an expense lands." },
  { icon: ScanLine, title: "AI Receipt Scanner", desc: "Attach a photo of any bill to an expense so everyone can see exactly what they're paying for. Automatic item extraction is coming soon.", soon: true },
  { icon: MessageCircleMore, title: "Settle Chat", desc: "Talk and split in the same place. Every expense and payment lives inside the group conversation." },
  { icon: Zap, title: "Minimal Transfers", desc: "Our optimizer nets all balances and routes the fewest possible payments to settle the whole group." },
  { icon: Wallet, title: "Two-Party Settlements", desc: "Claim a payment and the other side confirms it before any balance changes - no one-sided 'mark as paid'. Direct UPI payment integration is coming soon." },
  { icon: Trophy, title: "Elite Club Rewards", desc: "Earn coins by referring friends and unlock badges, custom themes, priority support, and early access." },
];

const REFER_STEPS = [
  { icon: Link2, title: "Share your link", desc: "Your profile has a unique referral code and QR. Share it anywhere." },
  { icon: UserPlus, title: "Friend joins", desc: "They sign up through your link and start splitting with their groups." },
  { icon: Zap, title: "Rewarded instantly", desc: "No waiting, no conditions - coins are credited the moment they join." },
  { icon: CoinsIcon, title: "You both earn", desc: "50 coins land in your wallet, 25 in theirs. Automatically.", reward: true },
];

const TIERS = [
  { name: "Bronze", coins: "100", perk: "Bronze badge + 1 custom theme" },
  { name: "Silver", coins: "300", perk: "Silver badge + all custom themes" },
  { name: "Gold", coins: "750", perk: "Gold badge + priority support + early access" },
  { name: "Elite Club", coins: "1,500", perk: "Elite badge + every future reward", featured: true },
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

export default function WhatWeOfferPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const float = (delay) =>
    reducedMotion
      ? {}
      : { animate: { y: [0, -14, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero with devices floating on both sides */}
      <header className="relative px-6 pb-24 pt-40 text-center sm:pt-52">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />
        <motion.img
          src="/stone-left.webp"
          alt="Splitease on mobile"
          {...float(0)}
          className="pointer-events-none absolute -left-10 top-36 hidden w-44 -rotate-12 opacity-70 lg:block xl:left-16"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />
        <motion.img
          src="/stone-right.webp"
          alt="Splitease on tablet"
          {...float(1.4)}
          className="pointer-events-none absolute -right-14 top-48 hidden w-64 rotate-12 opacity-70 lg:block xl:right-10"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />

        <Eyebrow>What we offer</Eyebrow>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-3xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Everything a group needs, and rewards on top
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-xl text-sm font-medium text-white/50 sm:text-base">
          From the first shared expense to the final settle-up, plus coins for
          bringing your friends along.
        </p>
      </header>

      {/* Core offering cards */}
      <section className="mx-auto max-w-6xl px-6">
        <Eyebrow>The toolkit</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          What you get, free
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERINGS.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: "easeOut" }}
              className="group rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-7 transition-colors duration-300 hover:border-cyan-400/30"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 transition-transform duration-300 group-hover:scale-110">
                  <item.icon size={21} />
                </span>
                {item.soon && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="font-serif-premium mt-5 text-xl font-normal">{item.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Refer & earn roadmap */}
      <section className="mx-auto max-w-6xl px-6 pt-28 sm:pt-36">
        <Eyebrow>Refer &amp; earn</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Invite friends, collect coins
        </h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {REFER_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.12, ease: "easeOut" }}
              className="relative lg:px-6 lg:first:pl-0 lg:last:pr-0"
            >
              {/* Continuous glowing connector to the next stop */}
              {i < REFER_STEPS.length - 1 && (
                <span
                  className="absolute right-[-12%] top-5 hidden h-[2px] w-1/4 rounded-full lg:block"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(34,211,238,0), rgba(34,211,238,0.55) 28%, rgba(34,211,238,0.55) 72%, rgba(34,211,238,0))",
                  }}
                />
              )}
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border font-mono text-xs font-bold ${
                  step.reward
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
                    : "border-cyan-400/40 bg-[#030303] text-cyan-400"
                }`}
              >
                <step.icon size={18} />
              </span>
              <h3 className="mt-4 text-base font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p>
              {step.reward && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                  <CoinsIcon size={13} /> +50 you / +25 friend
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Elite tiers */}
      <section className="mx-auto max-w-6xl px-6 pt-28 sm:pt-36">
        <Eyebrow>Elite Club</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Coins unlock real perks
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              className={`rounded-2xl border p-6 ${
                tier.featured
                  ? "border-cyan-400/40 bg-cyan-500/[0.06] shadow-[0_0_40px_rgba(34,211,238,0.1)]"
                  : "border-white/[0.08] bg-[#0B0B0F]"
              }`}
            >
              <Award size={20} className={tier.featured ? "text-cyan-300" : "text-cyan-400/70"} />
              <h3 className="mt-4 text-lg font-bold">{tier.name}</h3>
              <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-400">
                {tier.coins} coins
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{tier.perk}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mockup showcase band */}
      <section className="relative mx-auto max-w-6xl px-6 pt-28 text-center sm:pt-36">
        <Eyebrow>One app, every screen</Eyebrow>
        <h2 className="font-serif-premium mx-auto max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Built for the whole table
        </h2>
        <motion.img
          src="/laptop.webp"
          alt="Splitease on phone, tablet, and laptop"
          {...fadeUp}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto mt-12 w-full max-w-4xl"
          style={{ maskImage: "radial-gradient(ellipse 78% 80% at center, black 50%, rgba(0,0,0,0.35) 80%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 78% 80% at center, black 50%, rgba(0,0,0,0.35) 80%, transparent 100%)" }}
        />
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 pb-28 pt-10 text-center">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Start splitting, start earning
        </h2>
        <button
          onClick={() => router.push("/register")}
          className="clickable mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
        >
          Get started
          <ArrowRight size={16} />
        </button>
      </section>

      <Footer />
    </div>
  );
}
