"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "We used SplitEase for a 10-day Goa trip with 6 friends. The QR invite got everyone in the group in 30 seconds. No more 'who paid for what?' arguments.",
    author: "Rohan Mehta",
    role: "Travel Group Organiser",
    avatar: "RM",
    color: "bg-cyan-500",
  },
  {
    quote: "The OCR receipt scanning is unreal. I just point my phone at the bill and it reads the amount automatically. Saved us so much time at restaurants.",
    author: "Priya Sharma",
    role: "Frequent Traveler",
    avatar: "PS",
    color: "bg-teal-500",
  },
  {
    quote: "The AI assistant figured out that two of us owed each other money across different groups and suggested a single net settlement. That's genuinely smart.",
    author: "Aditya Kulkarni",
    role: "Office Trip Coordinator",
    avatar: "AK",
    color: "bg-sky-500",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="relative py-12 sm:py-20 md:py-28 overflow-hidden bg-muted/40 dark:bg-slate-900/80">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-0 w-64 sm:w-72 h-64 sm:h-72 rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-600/15" />
        <div className="absolute -bottom-20 left-0 w-64 sm:w-72 h-64 sm:h-72 rounded-full bg-teal-500/8 blur-3xl dark:bg-teal-600/15" />
      </div>

      <div className="relative z-10 container mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary mb-3">Real users, real trips</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-cyan-600 to-teal-500 bg-clip-text text-transparent dark:from-cyan-400 dark:to-teal-300">
              50,000+ groups
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            From weekend getaways to month-long backpacking — SplitEase keeps every trip stress-free.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => <Star key={s} size={13} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
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
