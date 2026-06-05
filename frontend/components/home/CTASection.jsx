"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Smartphone, Star } from "lucide-react";

const PERKS = [
  { icon: Zap,        text: "Free forever" },
  { icon: Shield,     text: "No card needed" },
  { icon: Smartphone, text: "Web & Mobile" },
  { icon: Star,       text: "4.9★ rating" },
];

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-background px-4 py-12 sm:py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] sm:h-[480px] sm:w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-500/12" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-cyan-200/60 bg-white px-5 py-10 text-center shadow-[0_20px_60px_-10px_rgba(8,145,178,0.13)] sm:px-10 sm:py-16 md:px-12 md:py-20 dark:border-cyan-400/20 dark:bg-[#031827] dark:shadow-[0_40px_100px_-30px_rgba(8,145,178,0.5)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(8,145,178,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_45%),linear-gradient(160deg,#02101f,#031d33_50%,#031525)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent dark:via-cyan-300/50" />

          <div className="relative z-10 mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-5 sm:mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-70 dark:bg-cyan-300" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-cyan-300" />
              </span>
              2,000+ groups active right now
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.18 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.06] tracking-tight text-gray-900 dark:text-white"
            >
              Split bills.{" "}
              <span className="bg-gradient-to-r from-cyan-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-emerald-300">
                Not friendships.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.26 }}
              className="mx-auto mt-3 sm:mt-4 max-w-md text-sm sm:text-base font-medium text-gray-500 dark:text-white/45"
            >
              Group expenses, smart settlements, AI insights - all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.34 }}
              className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-gray-200/80 pt-5 sm:pt-6 dark:border-white/8"
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
