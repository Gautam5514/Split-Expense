"use client";

// Everything below the blog hero, styled with the landing page's design
// language: #030303 field with soft glows, AXIOM blueprint cards (crosshair
// corners, dot-grid headers, mono type, hairlines), per-post accent colors and
// the dark cyan CTA panel. Client component for framer-motion + the category
// filter, but the full "All" view is server-rendered so every post ships as
// crawlable HTML.

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, ArrowUpRight, Zap, Shield, Smartphone, Star } from "lucide-react";
import BlogCover from "@/components/blog/BlogCover";

// Same surface recipe as HowItWorksSection: inline styles so the cards always
// paint with clear contrast against the black field.
const CARD_BG = "linear-gradient(180deg, #16181c 0%, #101216 100%)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.10)";
const CARD_SHADOW = "0 24px 60px -24px rgba(0,0,0,0.9)";
const STAGE_BORDER = "1px solid rgba(255,255,255,0.08)";

const PERKS = [
  { icon: Zap, text: "Free forever" },
  { icon: Shield, text: "No card needed" },
  { icon: Smartphone, text: "Web & Mobile" },
  { icon: Star, text: "4.9★ rating" },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

// 3x3 dot matrix card-header motif (AXIOM, from HowItWorksSection).
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

// Corner crosshair marker, centered exactly on the card corner.
function Crosshair({ className = "" }) {
  return (
    <span className={`blog-cross absolute z-20 flex items-center justify-center w-4 h-4 pointer-events-none ${className}`}>
      <Plus size={30} strokeWidth={2.75} style={{ color: "rgba(255,255,255,0.55)" }} />
    </span>
  );
}

// Technical section bar: mono label · hairline · plus roundel.
function TechnicalBar({ label }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] whitespace-nowrap text-cyan-400">
        {label}
      </span>
      <span className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
      <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
        <Plus size={12} style={{ color: "rgba(255,255,255,0.4)" }} />
      </span>
    </div>
  );
}

// "Read" pill with the accent arrow roundel (HowItWorksSection CTA pattern).
function ReadPill({ children, accent }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full pl-4 pr-2.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white"
      style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
    >
      {children}
      <span
        className="flex items-center justify-center w-5 h-5 rounded-full transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        style={{ backgroundColor: accent }}
      >
        <ArrowUpRight className="w-3 h-3" strokeWidth={3} style={{ color: "#050506" }} />
      </span>
    </span>
  );
}

export default function BlogPageContent({ featured, posts }) {
  const categories = useMemo(
    () => ["All", ...new Set(posts.map((p) => p.category))],
    [posts]
  );
  const [active, setActive] = useState("All");
  const shown = active === "All" ? posts : posts.filter((p) => p.category === active);
  const featuredAccent = featured.cover?.c1 || "#0891B2";

  return (
    <div className="relative bg-[#030303] text-white">
      <style>{`
        .blog-cross { transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .blog-card:hover .blog-cross { transform: rotate(360deg); }
        @media (prefers-reduced-motion: reduce) {
          .blog-cross { transition: none !important; }
        }
      `}</style>

      {/* Soft background glows, same as the landing feature sections */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-900/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] left-1/4 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[140px]" />
      </div>

      {/* ── Featured article: blueprint card overlapping the hero ── */}
      <section
        aria-label="Featured article"
        className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 -mt-24 sm:-mt-32"
      >
        <motion.article
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="group blog-card relative rounded p-4 sm:p-5"
          style={{ background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_SHADOW }}
        >
          <Crosshair className="-top-5 -left-5" />
          <Crosshair className="-top-5 -right-5" />
          <Crosshair className="-bottom-5 -left-5" />
          <Crosshair className="-bottom-5 -right-5" />

          {/* Card header: dot matrix · hairline · index */}
          <div className="flex items-center gap-3.5 px-1 pt-1 pb-4">
            <DotGrid />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">
              Featured guide
            </span>
            <span className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
            <span className="font-mono text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>01</span>
          </div>

          <div className="grid gap-5 md:grid-cols-[1.05fr_1fr]">
            {/* Cover stage — recessed thin-black, like the landing image stages */}
            <div
              className="relative overflow-hidden rounded-sm"
              style={{ background: "#070809", border: STAGE_BORDER }}
            >
              <BlogCover post={featured} fill />
            </div>

            {/* Text block */}
            <div className="flex flex-col justify-center px-1 py-3 md:px-4 md:py-6">
              <span
                className="font-mono text-[9.5px] font-extrabold uppercase tracking-widest"
                style={{ color: featuredAccent === "#0891B2" ? "#22d3ee" : featuredAccent }}
              >
                {featured.category} · {featured.readTime}
              </span>
              <h2 className="font-serif-premium font-normal mt-4 text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight text-white">
                <Link href={`/blog/${featured.slug}`} className="after:absolute after:inset-0">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-4 text-xs sm:text-sm leading-relaxed font-medium text-white/50">
                {featured.description}
              </p>
              <div
                className="mt-7 flex flex-wrap items-center justify-between gap-4 pt-5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {featured.author || "SplitEase Team"} · <time dateTime={featured.date}>{formatDate(featured.date)}</time>
                </span>
                <ReadPill accent="#22d3ee">Read the guide</ReadPill>
              </div>
            </div>
          </div>
        </motion.article>
      </section>

      {/* ── The library: landing-style header + blueprint card grid ── */}
      <section
        aria-labelledby="latest-articles"
        className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24"
      >
        <TechnicalBar label={`// The library · ${posts.length + 1} guides`} />

        {/* Section header, same treatment as the landing feature sections */}
        <div className="max-w-2xl mt-10 mb-12 sm:mb-16 text-left">
          <h2
            id="latest-articles"
            className="font-serif-premium font-normal text-white text-4xl sm:text-5xl tracking-tight leading-[1.1] mb-5"
          >
            Every guide your group needs
          </h2>
          <p className="text-white/50 text-sm sm:text-base leading-relaxed font-medium">
            Real-world playbooks for rent, trips and group dinners — plus the
            settlement math and app comparisons behind them.
          </p>
        </div>

        {/* Topic filter */}
        <div className="mb-12 flex flex-wrap gap-2" role="group" aria-label="Filter articles by topic">
          {categories.map((cat) => {
            const isActive = cat === active;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                aria-pressed={isActive}
                className={`rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer ${
                  isActive
                    ? "border border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                    : "border border-white/10 bg-white/[0.03] text-white/45 hover:border-white/30 hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Card grid — wider gaps leave room for the corner crosshairs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-14">
          {shown.map((post, i) => {
            const accent = post.cover?.c1 || "#0891B2";
            return (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.08 * (i % 3), ease: [0.16, 1, 0.3, 1] }}
                className="group blog-card relative flex flex-col rounded p-4"
                style={{ background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_SHADOW }}
              >
                <Crosshair className="-top-5 -left-5" />
                <Crosshair className="-top-5 -right-5" />
                <Crosshair className="-bottom-5 -left-5" />
                <Crosshair className="-bottom-5 -right-5" />

                {/* Card header: dot matrix · hairline · index */}
                <div className="flex items-center gap-3.5 px-1 pt-1 pb-4">
                  <DotGrid />
                  <span className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
                  <span className="font-mono text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {String(i + 2).padStart(2, "0")}
                  </span>
                </div>

                {/* Cover stage */}
                <div
                  className="relative overflow-hidden rounded-sm"
                  style={{ background: "#070809", border: STAGE_BORDER }}
                >
                  <BlogCover post={post} compact />
                </div>

                {/* Text block */}
                <div className="flex flex-col flex-1 px-1 pt-6">
                  <span
                    className="font-mono text-[9.5px] font-extrabold uppercase tracking-widest"
                    style={{ color: accent }}
                  >
                    {post.category} · {post.readTime}
                  </span>
                  <h3 className="font-serif-premium font-normal mt-3 text-xl sm:text-2xl tracking-tight leading-snug text-white">
                    <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 flex-1 text-xs sm:text-[13px] leading-relaxed font-medium text-white/50">
                    {post.description}
                  </p>
                  <div
                    className="mt-6 flex items-center justify-between gap-3 pt-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <time
                      dateTime={post.date}
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {formatDate(post.date)}
                    </time>
                    <ReadPill accent={accent}>Read</ReadPill>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* ── CTA: classic editorial panel, same voice as the hero ── */}
      <section aria-label="Get started with SplitEase" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-14 text-center sm:px-12 sm:py-20"
          style={{ background: "linear-gradient(180deg, #0d0d0d 0%, #050505 100%)" }}
        >
          {/* Faint warm light from above — quiet, not neon */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative z-10 mx-auto max-w-2xl">
            <p className="mb-7 inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
              Begin here
            </p>

            <h2 className="font-serif-premium font-normal text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.12] text-white">
              Stop reading about it.
              <br />
              <span className="text-white/55 italic">Split your first bill.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-md text-sm sm:text-base font-medium leading-relaxed text-white/45">
              Unlimited groups, live balances, receipt scanning and one-tap
              settlements — everything the guides describe, free.
            </p>

            <Link
              href="/register"
              className="mt-10 inline-block rounded-full bg-white px-9 py-3.5 text-sm sm:text-base font-bold text-black shadow-[0_4px_25px_rgba(255,255,255,0.18)] transition-all hover:scale-105 hover:bg-white/95 active:scale-95"
            >
              Get Started For Free
            </Link>

            <div className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/[0.08] pt-6">
              {PERKS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                  <Icon className="h-3.5 w-3.5 text-white/40" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
