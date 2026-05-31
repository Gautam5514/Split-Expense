"use client";

import { motion } from "framer-motion";
import { QrCode, ScanLine, CheckCircle } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const steps = [
  {
    icon: <QrCode className="w-7 h-7 sm:w-8 sm:h-8 text-white" />,
    color: "bg-cyan-600",
    step: "01",
    title: "Create & Invite",
    desc: "Start a group in seconds. Invite friends instantly via QR code, link, or email — no app download needed.",
  },
  {
    icon: <ScanLine className="w-7 h-7 sm:w-8 sm:h-8 text-white" />,
    color: "bg-teal-600",
    step: "02",
    title: "Log Expenses",
    desc: "Add bills on the go. Scan receipts with AI-powered OCR, split equally, by percentage, or custom amounts.",
  },
  {
    icon: <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />,
    color: "bg-pink-500",
    step: "03",
    title: "Settle Smart",
    desc: "Our algorithm finds the minimum transactions to clear all debts. One tap records the settlement and zeroes balances.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 md:py-24 bg-muted/30 relative">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 md:mb-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary mb-3">Simple by design</p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            From trip to settled — in 3 steps
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto">
            No spreadsheets, no awkward reminders, no mental math.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 md:gap-12 relative">
          <div className="hidden sm:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent z-0" />
          {steps.map((s) => (
            <StepCard key={s.step} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ icon, color, step, title, desc }) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="relative z-10 flex flex-col items-center text-center p-5 sm:p-6"
    >
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${color} shadow-lg shadow-cyan-500/20 flex items-center justify-center mb-4 sm:mb-6 relative`}>
        {icon}
        <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs sm:text-sm font-bold text-foreground shadow-sm">
          {step}
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{desc}</p>
    </motion.div>
  );
}
