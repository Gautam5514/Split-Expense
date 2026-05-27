"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Shield, Smartphone, Star, Sparkles } from "lucide-react";

const PERKS = [
  { icon: Zap,        text: "Free forever" },
  { icon: Shield,     text: "No card needed" },
  { icon: Smartphone, text: "iOS & Android" },
  { icon: Star,       text: "4.9★ rating" },
];

export default function CTASection() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden bg-background px-4 py-20 sm:px-6 sm:py-28">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-500/12" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white px-6 py-14 text-center shadow-[0_20px_60px_-10px_rgba(8,145,178,0.13)] sm:px-12 sm:py-20 dark:border-cyan-400/20 dark:bg-[#031827] dark:shadow-[0_40px_100px_-30px_rgba(8,145,178,0.5)]"
        >
          {/* Gradient tint */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(8,145,178,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_45%),linear-gradient(160deg,#02101f,#031d33_50%,#031525)]" />

          {/* Top line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent dark:via-cyan-300/50" />

          <div className="relative z-10 mx-auto max-w-2xl">

            {/* Live dot badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-xs font-bold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-70 dark:bg-cyan-300" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-cyan-300" />
              </span>
              2,000+ groups active right now
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.18 }}
              className="text-4xl font-black leading-[1.06] tracking-tight text-gray-900 sm:text-5xl md:text-6xl dark:text-white"
            >
              Split bills.{" "}
              <span className="bg-gradient-to-r from-cyan-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300">
                Not friendships.
              </span>
            </motion.h2>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.26 }}
              className="mx-auto mt-4 max-w-md text-base font-medium text-gray-500 sm:text-lg dark:text-white/45"
            >
              Group expenses, settled fairly — in seconds.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.34 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <button
                onClick={() => router.push("/register")}
                className="group relative w-full overflow-hidden rounded px-8 py-4 text-base font-black text-[#021820] shadow-[0_12px_36px_rgba(8,145,178,0.28)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_18px_48px_rgba(8,145,178,0.42)] active:scale-95 sm:w-auto"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300" />
                <span className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] bg-white/25 transition-all duration-700 group-hover:left-[130%]" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>

              <button
                onClick={() => router.push("/login")}
                className="w-full rounded border border-gray-200 bg-gray-100 px-8 py-4 text-base font-semibold text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900 active:scale-95 sm:w-auto dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.09] dark:hover:text-white"
              >
                Sign in
              </button>
            </motion.div>

            {/* Perks */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.44 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-gray-200/80 pt-6 dark:border-white/8"
            >
              {PERKS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-white/35">
                  <Icon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400/80" />
                  {text}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
