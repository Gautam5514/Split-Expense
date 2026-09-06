"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  Link2,
  Lock,
  MessageCircleMore,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Wallet,
  WifiOff,
} from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { PlayStoreButton, PLAY_STORE_URL } from "@/components/PlayStoreLink";

/* "The App" - a dedicated marketing page about the SplitEase Android app,
   linked from the footer's Company column. Same dark landing hero as the
   About page, then everything a visitor needs to actually decide to
   install it: what it does that the web app doesn't, a screen-by-screen
   feature tour (linking into the existing feature pages), and a QR code
   for people who'd rather scan than type. */

const APP_PERKS = [
  { icon: CheckCircle2, text: "Free forever" },
  { icon: ShieldCheck, text: "No card needed" },
  { icon: Smartphone, text: "Android 8.0+" },
  { icon: Bell, text: "Push notifications" },
];

// Why install the app on top of already using the web version.
const APP_ADVANTAGES = [
  {
    icon: Bell,
    title: "Real push notifications",
    desc: "Get pinged the moment someone adds an expense, settles up, or invites you to a group - no need to keep a tab open.",
  },
  {
    icon: ScanLine,
    title: "Camera receipt capture",
    desc: "Snap a photo of a bill straight from your phone's camera and attach it to the expense in one step.",
  },
  {
    icon: WifiOff,
    title: "Built for spotty signal",
    desc: "Cabs, hostels, hikes - the app is designed to stay usable when a restaurant's Wi-Fi isn't.",
  },
  {
    icon: Lock,
    title: "Same security, native feel",
    desc: "The same encrypted data and OTP login as the web app, wrapped in a faster, native mobile experience.",
  },
];

// Mirrors each standalone /features/* page - same tag colour and screenshot,
// so this page becomes the jumping-off point into all of them.
const FEATURE_TOUR = [
  {
    icon: Bot,
    title: "AI Expense Splitter",
    desc: "Ask it who owes who in plain language - it reads your group's real balances.",
    image: "/ai_expense.webp",
    color: "text-pink-400",
    ring: "ring-pink-500/20",
    bg: "bg-pink-500/10",
    hoverBorder: "hover:border-pink-500/25",
    href: "/features/ai-expense-splitter",
  },
  {
    icon: Wallet,
    title: "Smart Settlements",
    desc: "Live balances and a minimal-transfer optimizer, updated the moment an expense lands.",
    image: "/live_balance_tracking.webp",
    color: "text-cyan-400",
    ring: "ring-cyan-500/20",
    bg: "bg-cyan-500/10",
    hoverBorder: "hover:border-cyan-500/25",
    href: "/features/smart-settlements",
  },
  {
    icon: ScanLine,
    title: "Receipt Scan",
    desc: "Attach a photo of any bill so the whole group can see exactly what they're paying for.",
    image: "/ocr_recept.webp",
    color: "text-emerald-400",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/10",
    hoverBorder: "hover:border-emerald-500/25",
    href: "/features/ocr-receipt-scan",
  },
  {
    icon: MessageCircleMore,
    title: "Group Chat Hub",
    desc: "Talk and split in the same place - every expense lives right inside the conversation.",
    image: "/groupchat.webp",
    color: "text-violet-400",
    ring: "ring-violet-500/20",
    bg: "bg-violet-500/10",
    hoverBorder: "hover:border-violet-500/25",
    href: "/features/group-chat-hub",
  },
  {
    icon: Link2,
    title: "QR & Link Invites",
    desc: "Share a code or link and anyone who opens it joins the group instantly.",
    image: "/qrlink.webp",
    color: "text-amber-400",
    ring: "ring-amber-500/20",
    bg: "bg-amber-500/10",
    hoverBorder: "hover:border-amber-500/25",
    href: "/features/qr-invites",
  },
  {
    icon: ShieldCheck,
    title: "Secure OTP Login",
    desc: "No passwords to remember or leak - just a one-time code sent to you.",
    image: "/secure_otp.webp",
    color: "text-emerald-500",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/10",
    hoverBorder: "hover:border-emerald-500/25",
    href: "/features/secure-login",
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

export default function MobileAppPageClient() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const float = (delay) =>
    reducedMotion
      ? {}
      : { animate: { y: [0, -14, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero - identical treatment to the About page's header */}
      <header className="relative px-6 pb-20 pt-40 text-center sm:pt-52">
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

        <Eyebrow>The SplitEase App</Eyebrow>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-4xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Every split, every balance, right in your pocket
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-2xl text-sm font-medium text-white/60 sm:text-base leading-relaxed">
          The SplitEase Android app carries your groups, expenses, chat, and settlements from the web straight to your phone - free, with zero paywall. iOS is on the way.
        </p>

        <div className="relative z-10 mt-9 flex flex-wrap items-center justify-center gap-3">
          <PlayStoreButton />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-bold text-white/35">
            <Smartphone size={16} />
            iOS - Coming soon
          </span>
        </div>

        <div className="relative z-10 mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {APP_PERKS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
              <Icon className="h-3.5 w-3.5 text-white/40" />
              {text}
            </div>
          ))}
        </div>
      </header>

      {/* Full-bleed phone showcase */}
      <section className="relative mx-auto max-w-6xl px-6 pt-4 text-center">
        <motion.img
          src="/mobile.webp"
          alt="SplitEase running on an Android phone - groups, balances and chat"
          {...fadeUp}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto w-full max-w-md"
          style={{ maskImage: "radial-gradient(ellipse 78% 80% at center, black 50%, rgba(0,0,0,0.35) 80%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 78% 80% at center, black 50%, rgba(0,0,0,0.35) 80%, transparent 100%)" }}
        />
      </section>

      {/* Why the app, not just the website */}
      <section className="mx-auto max-w-6xl px-6 pt-16 sm:pt-24">
        <Eyebrow>Why install it</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Everything the web app does, plus what only a phone can
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {APP_ADVANTAGES.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: (i % 4) * 0.08, ease: "easeOut" }}
              className="group rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 transition-colors duration-300 hover:border-cyan-400/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 transition-transform duration-300 group-hover:scale-110">
                <item.icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature tour - links into every /features/* page */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <Eyebrow>Inside the app</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          A closer look at every screen
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_TOUR.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                className={`group block overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B0F] transition-colors duration-300 ${item.hoverBorder}`}
              >
                <div className="relative aspect-[5/4] w-full overflow-hidden border-b border-white/[0.06] bg-[#050506]">
                  <div className={`pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full ${item.bg} blur-3xl`} />
                  <img
                    src={item.image}
                    alt={`${item.title} screen in the SplitEase app`}
                    className="relative z-10 h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-6">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.bg} ${item.color} ring-1 ${item.ring}`}>
                    <item.icon size={17} />
                  </span>
                  <h3 className="mt-3 flex items-center gap-1.5 text-base font-bold text-white">
                    {item.title}
                    <ArrowUpRight size={14} className="text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/60" />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{item.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* QR download card */}
      <section className="mx-auto max-w-3xl px-6 pt-24 sm:pt-32">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-12 text-center sm:px-12 sm:py-14"
          style={{ background: "linear-gradient(180deg, #0d0d0d 0%, #050505 100%)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative z-10 flex flex-col items-center gap-6">
            <div>
              <Eyebrow>Scan instead</Eyebrow>
              <h2 className="font-serif-premium text-2xl font-normal tracking-tight sm:text-3xl">
                Point your camera, get the app
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/50">
                Scan this with your phone&apos;s camera to open SplitEase straight on the Play Store.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-2xl">
              <QRCodeSVG value={PLAY_STORE_URL} size={140} bgColor="#ffffff" fgColor="#030303" level="M" />
            </div>
            <Link
              href="/downloadapp"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition-colors hover:text-white"
            >
              Prefer a link? Open the download page
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-6 pb-28 pt-24 text-center sm:pt-32">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Take your groups with you
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-white/50 sm:text-base">
          Free on the web and on Android - no paywall, no trial that runs out.
        </p>
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.push("/register")}
            className="clickable inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
          >
            Get started for free
            <ArrowRight size={16} />
          </button>
          <PlayStoreButton />
        </div>
      </section>

      <Footer />
    </div>
  );
}
