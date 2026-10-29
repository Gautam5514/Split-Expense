"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Link2,
  MessageCircleMore,
  ScanLine,
  Trophy,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";
import PageHeroShell from "@/components/PageHeroShell";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { PlayStoreButton } from "@/components/PlayStoreLink";

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

/* "What we offer" page: a shared hero backdrop, the core offering cards,
   a refer-and-earn roadmap (real reward numbers from the referral system),
   Elite Club tiers, and a mockup showcase. Landing theme throughout. */

// Chamfered (cut) top-right and bottom-left corners; used on both the border and the card.
const CHAMFER = "polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 26px 100%, 0 calc(100% - 26px))";
const plus = (color) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><path d='M14 10v8M10 14h8' stroke='${color}' stroke-width='1' fill='none'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

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

/* Referral journey. Desktop: a winding road with the stops on its bends,
   alternating above/below. Mobile: a simple vertical route. Static, no motion. */
const ROAD = "M 0 200 C 60 200 60 90 125 90 C 250 90 250 310 375 310 C 500 310 500 90 625 90 C 750 90 750 310 875 310 C 940 310 940 200 1000 200";
// Fades both ends out so the road has no visible start or finish cap.
const ROAD_FADE = "linear-gradient(90deg, transparent 0%, black 14%, black 86%, transparent 100%)";
const STOPS = [[125, 90], [375, 310], [625, 90], [875, 310]];

function StepText({ step, index, className = "" }) {
  return (
    <div className={className}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">{step.reward ? "Finish" : `Step 0${index + 1}`}</p>
      <h3 className="mt-1.5 text-base font-bold">{step.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{step.desc}</p>
      {step.reward && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">
          <CoinsIcon size={13} /> +50 you / +25 friend
        </p>
      )}
    </div>
  );
}

const nodeClass = "flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-300 bg-[#06222b] text-cyan-200 shadow-[0_0_26px_rgba(34,211,238,0.45)]";

function ReferJourney() {
  return (
    <>
      {/* mobile */}
      <ol className="relative mt-12 space-y-10 lg:hidden">
        <span className="absolute bottom-6 left-7 top-6 w-px bg-gradient-to-b from-cyan-400/70 via-cyan-400/40 to-cyan-400/70" aria-hidden="true" />
        {REFER_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative flex gap-5">
              <span className={`${nodeClass} relative z-10 shrink-0`}><Icon size={22} /></span>
              <StepText step={step} index={i} className="pt-1" />
            </li>
          );
        })}
      </ol>

      {/* desktop */}
      <div className="relative mx-auto my-[200px] hidden h-[400px] w-full max-w-[1100px] lg:block">
        <svg viewBox="0 0 1000 400" className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true" style={{ maskImage: ROAD_FADE, WebkitMaskImage: ROAD_FADE }}>
          <path d={ROAD} fill="none" stroke="rgba(34,211,238,0.14)" strokeWidth="40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={ROAD} fill="none" stroke="#071014" strokeWidth="34" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={ROAD} fill="none" stroke="rgba(34,211,238,0.55)" strokeWidth="2" strokeDasharray="10 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {REFER_STEPS.map((step, i) => {
          const [sx, sy] = STOPS[i];
          const up = sy < 200;
          const Icon = step.icon;
          return (
            <div key={step.title} className="absolute z-10" style={{ left: `${sx / 10}%`, top: `${(sy / 400) * 100}%` }}>
              <span className={`${nodeClass} absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2`}><Icon size={22} /></span>
              <StepText step={step} index={i} className={`absolute left-0 w-[250px] -translate-x-1/2 text-center ${up ? "bottom-[52px]" : "top-[52px]"}`} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* Elite Club: a rising ladder. Each tier is a taller step than the last, with a
   metal medal badge (bronze, silver, gold, cyan), its coin threshold and perks (each tier includes the one below). */
// Hover colour per tier (RGB triplets): bronze, silver, gold, and brand cyan for the top tier.
const TIER_RGB = ["205 127 50", "192 203 214", "236 190 70", "34 211 238"];
const STEP_H = ["lg:h-[300px]", "lg:h-[335px]", "lg:h-[370px]", "lg:h-[405px]"];

// Metal ramps per tier: [highlight, mid, shadow].
const METAL = [
  ["#f6c18d", "#cd7f32", "#6e3f14"], // bronze
  ["#f7f9fb", "#b9c3cd", "#5f6a75"], // silver
  ["#fff0ae", "#e6b84a", "#85600f"], // gold
  ["#d9fbff", "#22d3ee", "#0b6a80"], // elite (brand cyan)
];

const starPath = (cx, cy, r) => {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
};

// Tier I-III show 1-3 stars; the top tier gets a crown.
const EMBLEM = [
  [[32, 30, 9]],
  [[25.5, 30, 7], [38.5, 30, 7]],
  [[32, 24, 7], [24.5, 36, 6.5], [39.5, 36, 6.5]],
];

function TierBadge({ level }) {
  const [hi, mid, lo] = METAL[level];
  const id = `tier-metal-${level}`;
  const hex = "32,4 56,18 56,44 32,58 8,44 8,18";
  const innerHex = "32,10 51,21 51,41 32,52 13,41 13,21";
  return (
    <div className="relative h-16 w-16 transition-transform duration-700 group-hover:scale-110">
      {/* Resting state: one quiet cyan outline badge */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full transition-opacity duration-700 group-hover:opacity-0" aria-hidden="true">
        <polygon points={hex} fill="none" stroke="rgba(34,211,238,0.45)" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points={innerHex} fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.25)" strokeWidth="1" strokeLinejoin="round" />
        {level < 3 ? (
          EMBLEM[level].map(([cx, cy, r], k) => <path key={k} d={starPath(cx, cy, r)} fill="rgba(34,211,238,0.7)" />)
        ) : (
          <path d="M20 40 L22 25 L28 32 L32 22 L36 32 L42 25 L44 40 Z" fill="rgba(34,211,238,0.7)" />
        )}
      </svg>
      {/* Hover state: full metal medal fades in */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ filter: `drop-shadow(0 6px 14px rgb(${TIER_RGB[level].replaceAll(" ", ",")} / 0.4))` }}>
      <svg viewBox="0 0 64 64" className="h-full w-full" role="img" aria-label={`${["Bronze", "Silver", "Gold", "Elite Club"][level]} badge`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={hi} />
            <stop offset="0.5" stopColor={mid} />
            <stop offset="1" stopColor={lo} />
          </linearGradient>
          <linearGradient id={`${id}-in`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={lo} />
            <stop offset="1" stopColor={mid} />
          </linearGradient>
        </defs>
        {/* ribbon tails */}
        <path d="M22 50 L18 63 L26 59 L30 63 L31 53 Z" fill={lo} />
        <path d="M42 50 L46 63 L38 59 L34 63 L33 53 Z" fill={mid} opacity="0.85" />
        {/* metal rim + face */}
        <polygon points={hex} fill={`url(#${id})`} stroke={hi} strokeOpacity="0.6" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points={innerHex} fill={`url(#${id}-in)`} stroke={hi} strokeOpacity="0.45" strokeWidth="0.8" strokeLinejoin="round" />
        {/* gloss */}
        <path d="M13 21 L32 10 L51 21 L51 26 C40 22 24 22 13 30 Z" fill="#fff" opacity="0.16" />
        {/* emblem */}
        {level < 3 ? (
          EMBLEM[level].map(([cx, cy, r], k) => <path key={k} d={starPath(cx, cy, r)} fill={hi} stroke={lo} strokeOpacity="0.5" strokeWidth="0.6" strokeLinejoin="round" />)
        ) : (
          <path d="M20 40 L22 25 L28 32 L32 22 L36 32 L42 25 L44 40 Z" fill={hi} stroke={lo} strokeOpacity="0.5" strokeWidth="0.6" strokeLinejoin="round" />
        )}
      </svg>
      </div>
    </div>
  );
}

function TierLadder() {
  return (
    <div className="mt-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        {TIERS.map((tier, i) => {
          const perks = tier.perk.split(" + ");
          return (
            <motion.div
              key={tier.name}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              style={{ "--tc": TIER_RGB[i] }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-[border-color,box-shadow] duration-700 hover:border-[rgb(var(--tc)/0.6)] hover:shadow-[0_20px_60px_-20px_rgb(var(--tc)/0.45)] ${STEP_H[i]} ${
                tier.featured
                  ? "border-cyan-400/45 bg-gradient-to-b from-cyan-500/[0.12] via-[#06141a] to-[#06100f] shadow-[0_0_50px_-10px_rgba(34,211,238,0.35)]"
                  : "border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-[#0A0A0E]"
              }`}
            >
              {/* tier-colour fill that slowly rises from the bottom on hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[1100ms] ease-out group-hover:scale-y-100"
                style={{ background: "linear-gradient(to top, rgb(var(--tc) / 0.30), rgb(var(--tc) / 0.12) 55%, rgb(var(--tc) / 0.04))" }}
              />
              {/* faint rising lines, denser on higher tiers */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(34,211,238,0.07) 0 1px, transparent 1px 22px)", WebkitMaskImage: "linear-gradient(to top, black, transparent 70%)", maskImage: "linear-gradient(to top, black, transparent 70%)" }} />

              <div className="relative flex items-start justify-between">
                <TierBadge level={i} />
                {tier.featured && (
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200">Top tier</span>
                )}
              </div>

              <h3 className="relative mt-5 text-lg font-bold">{tier.name}</h3>
              <p className="relative mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tabular-nums tracking-tight">{tier.coins}</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400 transition-colors duration-700 group-hover:text-[rgb(var(--tc))]">coins</span>
              </p>

              <ul className="relative mt-auto space-y-2 border-t border-white/10 pt-4 text-sm text-white/65">
                {i > 0 && <li className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-400/70">+ Everything in {TIERS[i - 1].name}</li>}
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 transition-colors duration-700 group-hover:bg-[rgb(var(--tc))]" aria-hidden="true" />
                    {perk}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* coin meter: 0 -> 1,500 */}
      <div className="mt-8 hidden items-center gap-4 lg:flex" aria-hidden="true">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">0</span>
        <div className="relative h-px flex-1 bg-gradient-to-r from-white/10 via-cyan-400/60 to-cyan-300">
          {[12.5, 37.5, 62.5, 87.5].map((x) => (
            <span key={x} className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300 bg-[#030303]" style={{ left: `${x}%` }} />
          ))}
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">1,500 coins</span>
      </div>
    </div>
  );
}

export default function WhatWeOfferPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-black text-white">
      <SmoothScroll />

      {/* Hero: shared backdrop with the landing/blog pages */}
      <PageHeroShell as="header" fadeBottom className="pb-40 pt-28 sm:pb-56 sm:pt-36">
        <Eyebrow>What we offer</Eyebrow>
        <h1 className="font-serif-premium font-normal text-white text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05] mb-6">
          Everything a group needs, and rewards on top
        </h1>
        <p className="max-w-2xl text-sm font-medium leading-relaxed text-white/60 sm:text-base md:text-lg">
          From the first shared expense to the final settle-up, plus coins for
          bringing your friends along.
        </p>
      </PageHeroShell>

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
              tabIndex={0}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              style={{ clipPath: CHAMFER }}
              className="group relative h-[250px] cursor-default bg-white/[0.09] max-md:h-auto max-md:min-h-[230px] [@media(hover:none)]:h-auto [@media(hover:none)]:min-h-[250px] p-px outline-none transition-colors duration-500 hover:bg-gradient-to-br hover:from-cyan-300/45 hover:via-cyan-400/12 hover:to-cyan-300/35 focus-visible:bg-cyan-400/60"
            >
              <div style={{ clipPath: CHAMFER }} className="relative flex h-full min-h-[inherit] flex-col justify-between gap-8 overflow-hidden bg-[#0A0A0E] p-6">
              {/* blueprint "+" grid, same on every card */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: plus("rgba(255,255,255,0.13)"), backgroundSize: "28px 28px", backgroundPosition: "center" }} />
              {/* cyan version + glow that only exist around the cursor */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{
                  backgroundImage: `${plus("rgba(34,211,238,0.5)")}, radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(34,211,238,0.08), transparent 70%)`,
                  backgroundSize: "28px 28px, 100% 100%",
                  backgroundPosition: "center, 0 0",
                  WebkitMaskImage: "radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), black, transparent 100%)",
                  maskImage: "radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), black, transparent 100%)",
                }}
              />
              {/* soft fade so text stays readable over the pattern */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/85 to-transparent" />
              {/* ghost outline number */}
              <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 select-none font-mono text-[84px] font-bold leading-none text-transparent transition-all duration-500 [-webkit-text-stroke:1px_rgba(255,255,255,0.09)] group-hover:[-webkit-text-stroke:1px_rgba(34,211,238,0.28)]">0{i + 1}</span>

              <div className="relative flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 transition-all duration-500 group-hover:bg-cyan-400/20 group-hover:text-cyan-200 group-hover:ring-cyan-300/40 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.22)]">
                  <item.icon size={21} />
                </span>
                {item.soon && (
                  <span className="relative z-10 mt-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">
                    Coming soon
                  </span>
                )}
              </div>

              <div className="relative">
                <h3 className="font-serif-premium text-xl font-normal">{item.title}</h3>
                {/* Description is hidden until hover/focus; touch screens (no hover) always show it. */}
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] max-md:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <p className="translate-y-2 pt-2.5 text-sm leading-relaxed text-white/60 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-md:translate-y-0 max-md:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
              </div>
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
        <ReferJourney />
      </section>

      {/* Elite tiers */}
      <section className="mx-auto max-w-6xl px-6 pt-28 sm:pt-36">
        <Eyebrow>Elite Club</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Coins unlock real perks
        </h2>
        <TierLadder />
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
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.push("/register")}
            className="clickable inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
          >
            Get started
            <ArrowRight size={16} />
          </button>
          <PlayStoreButton />
        </div>
      </section>

      <Footer />
    </div>
  );
}
