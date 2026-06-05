"use client";

import { motion } from "framer-motion";
import { Users, TrendingUp, Star, Globe } from "lucide-react";

const logos = [
  { src: "/airbnb.png", name: "Airbnb" },
  { src: "/splitwise.png", name: "Splitwise" },
  { src: "/expedia.png", name: "Expedia" },
  { src: "/skyscanner.png", name: "Skyscanner" },
  { src: "/tripadvisor.png", name: "Tripadvisor" },
  { src: "/kayak.png", name: "Kayak" },
  { src: "/trivago.png", name: "Trivago" },
];

const stats = [
  { icon: Users, value: "2,000+", label: "Active Groups", color: "#0891B2" },
  { icon: TrendingUp, value: "₹50L+", label: "Total Split", color: "#0E7490" },
  { icon: Star, value: "4.9 / 5", label: "User Rating", color: "#f59e0b" },
  { icon: Globe, value: "120+", label: "Cities Covered", color: "#ec4899" },
];

export default function LogoSlider() {
  return (
    <section className="relative py-16 overflow-hidden bg-background">

      {/* Subtle top & bottom gradient lines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Soft background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(8,145,178,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-12"
        >
          {/* Decorative line + label */}
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-cyan-400/50" />
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
              style={{
                background: "rgba(8,145,178,0.1)",
                border: "1px solid rgba(8,145,178,0.25)",
                color: "#22D3EE",
              }}
            >
              Social Proof
            </span>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-cyan-400/50" />
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center tracking-tight text-foreground">
            Loved by{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #ec4899 100%)" }}
            >
              travelers worldwide
            </span>
          </h2>
          <p className="mt-3 text-sm text-foreground/45 font-medium max-w-md text-center">
            From weekend road trips to month-long backpacking adventures - SplitEase keeps every group on the same page.
          </p>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14"
        >
          {stats.map(({ icon: Icon, value, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "rgba(8,145,178,0.04)",
                border: "1px solid rgba(8,145,178,0.12)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}35` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-xl font-extrabold text-foreground tracking-tight">{value}</p>
              <p className="text-[11px] text-foreground/45 font-semibold text-center">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Section divider ── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border/60" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/30">
            Used alongside your favourite platforms
          </p>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      </div>

      {/* ── Logo strip (full-width marquee) ── */}
      <div className="relative overflow-hidden">
        {/* Left fade */}
        <div className="absolute left-0 top-0 h-full w-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, var(--background), transparent)" }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 h-full w-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, var(--background), transparent)" }} />

        <div className="flex items-center gap-5 animate-logo-scroll" style={{ width: "max-content" }}>
          {[...Array(3)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-5 pr-5">
              {logos.map(({ src, name }, i) => (
                <div
                  key={`${setIdx}-${i}`}
                  className="group flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30 cursor-default select-none"
                  style={{
                    background: "rgba(8,145,178,0.04)",
                    border: "1px solid rgba(8,145,178,0.1)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <img
                    src={src}
                    alt={name}
                    className="h-6 w-auto object-contain opacity-50 group-hover:opacity-80 transition-opacity duration-300 grayscale group-hover:grayscale-0 dark:invert dark:group-hover:invert"
                    draggable={false}
                  />
                  <span className="text-xs font-semibold text-foreground/40 group-hover:text-foreground/70 transition-colors duration-300">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
