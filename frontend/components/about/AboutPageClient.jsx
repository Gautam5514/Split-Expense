"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Coffee, HeartHandshake, PiggyBank, ShieldCheck, Github, Linkedin, Twitter, Instagram, Code, UserCheck } from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

const VALUES = [
  {
    icon: PiggyBank,
    title: "We split bills, not friendships",
    desc: "No more 'send me later' that never comes. SplitEase does the math so nobody has to be the group's unofficial accountant.",
  },
  {
    icon: Coffee,
    title: "Built by Gautam Pandit",
    desc: "From a real college problem to a full live product at split.elitecrew.online, built from scratch to fix group money friction.",
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

export default function AboutPageClient() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const float = (delay) =>
    reducedMotion
      ? {}
      : { animate: { y: [0, -14, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero with mountain/stone imagery */}
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

        <Eyebrow>About SplitEase & Founder</Eyebrow>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-4xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Ending &ldquo;I&apos;ll pay you back later&rdquo; forever
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-2xl text-sm font-medium text-white/60 sm:text-base leading-relaxed">
          SplitEase (split.elitecrew.online) was built by founder <strong className="text-white">Gautam Pandit</strong> to give students, flatmates, and travel groups a zero-paywall, intelligent platform for shared expenses.
        </p>
      </header>

      {/* Founder Spotlight Section */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#0F172A]/80 to-[#0B0B0F] p-8 sm:p-12 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Founder Image */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 opacity-60 blur-md" />
              <img
                src="/blog/gautam-pandit-portrait.png"
                alt="Gautam Pandit - Founder and Developer of SplitEase"
                className="relative size-44 sm:size-52 rounded-2xl object-cover object-top border border-white/20 shadow-2xl"
              />
            </div>

            {/* Founder Content */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3">
                <UserCheck size={14} /> Founder & Lead Developer
              </div>
              <h2 className="font-serif-premium text-3xl sm:text-4xl font-normal text-white">
                Gautam Pandit
              </h2>
              <p className="mt-1 text-cyan-400 font-mono text-xs tracking-wider uppercase">
                Creator of SplitEase (split.elitecrew.online)
              </p>
              <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed max-w-xl">
                Gautam Pandit designed, architected, and engineered SplitEase end-to-end. Driven by the frustration of awkward micro-debts during college and group trips, he conducted 6 months of research, wrote the complete system specifications, and developed SplitEase into a full-scale web and mobile application.
              </p>

              {/* Founder Social Links */}
              <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="https://github.com/Gautam5514"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Github size={14} /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/gautam-pandit-4b185224b/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Linkedin size={14} /> LinkedIn
                </a>
                <a
                  href="https://x.com/Gautamp5514"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Twitter size={14} /> X / Twitter
                </a>
                <a
                  href="https://www.instagram.com/gautamp5514/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Instagram size={14} /> Instagram
                </a>
                <a
                  href="/blog/gautam-pandit-founder-splitease-story"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                >
                  <Code size={14} /> Read Founder Story
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* The origin story */}
      <section className="mx-auto max-w-3xl px-6 text-center pt-12">
        <Eyebrow>The Story Behind SplitEase</Eyebrow>
        <h2 className="font-serif-premium text-2xl font-normal tracking-tight sm:text-3xl">
          From a College Problem to a Production Product
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          SplitEase didn&apos;t start as a commercial venture — it started as a lived problem. After living through messy roommate bills, student hostel expenses, and group vacation math, Gautam spent months analyzing why existing tools failed real groups. The result is split.elitecrew.online: a fast, zero-paywall application with receipt OCR, AI debt simplification, and real-time syncing.
        </p>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-6 pt-20 sm:pt-28">
        <Eyebrow>Core Principles</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Built for real groups, with zero paywalls
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
      <section className="relative overflow-hidden px-6 pb-28 pt-24 text-center sm:pt-32">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          Try SplitEase Today
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-white/50 sm:text-base">
          Free to join, free to use, live at split.elitecrew.online.
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
