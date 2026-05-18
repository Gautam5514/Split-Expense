"use client";

import { motion } from "framer-motion";
import { Users, DollarSign, CheckCircle } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30 relative">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {" "}
            Effortless splitting in 3 steps
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No spreadsheets, no calculators, no headaches.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent z-0" />

          <StepCard
            icon={<Users className="w-8 h-8 text-white" />}
            color="bg-indigo-500"
            step="01"
            title="Create Group"
            desc="Start a trip in seconds and invite your friends via link or QR code."
          />
          <StepCard
            icon={<DollarSign className="w-8 h-8 text-white" />}
            color="bg-purple-500"
            step="02"
            title="Add Expenses"
            desc="Log bills as you go. Split equally, by percentage, or by exact amounts."
          />
          <StepCard
            icon={<CheckCircle className="w-8 h-8 text-white" />}
            color="bg-pink-500"
            step="03"
            title="Settle Up"
            desc="We calculate the minimum transactions needed to pay everyone back."
          />
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
      className="relative z-10 flex flex-col items-center text-center p-6"
    >
      <div
        className={`w-16 h-16 rounded-2xl ${color} shadow-lg shadow-indigo-500/20 flex items-center justify-center mb-6 relative`}
      >
        {icon}
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-sm font-bold text-foreground shadow-sm">
          {step}
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </motion.div>
  );
}
