"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "I used to hate being the 'math person' on trips. SplitEase made our Japan trip completely stress-free.",
    author: "Sarah Jenkins",
    role: "Backpacker",
    avatar: "SJ",
    color: "bg-cyan-500",
  },
  {
    quote: "The currency conversion is a game changer. We didn't have to worry about exchange rates once.",
    author: "David Chen",
    role: "Business Traveler",
    avatar: "DC",
    color: "bg-teal-500",
  },
  {
    quote: "Cleanest UI of any splitting app I've used. My parents figured it out in 5 minutes.",
    author: "Elena Rodriguez",
    role: "Family Vacationer",
    avatar: "ER",
    color: "bg-sky-500",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-muted/40 dark:bg-slate-900/80">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-600/15" />
        <div className="absolute -bottom-20 left-0 w-72 h-72 rounded-full bg-teal-500/8 blur-3xl dark:bg-teal-600/15" />
      </div>

      <div className="relative z-10 container mx-auto max-w-6xl px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary mb-3">
            What people say
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground leading-tight">
            Loved by 50,000+{" "}
            <span className="bg-gradient-to-r from-cyan-600 to-teal-500 bg-clip-text text-transparent dark:from-cyan-400 dark:to-teal-300">
              travelers
            </span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">{t.author}</p>
                  <p className="text-xs text-primary font-medium">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
