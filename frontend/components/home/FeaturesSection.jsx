"use client";

import { motion } from "framer-motion";
import { Zap, ScanLine, Bot, MessageSquare, QrCode, ShieldCheck } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const features = [
  {
    icon: <Zap />,
    title: "Live Balance Tracking",
    desc: "Every expense updates balances instantly for all group members. No refresh needed - it's always live.",
  },
  {
    icon: <ScanLine />,
    title: "OCR Receipt Scanning",
    desc: "Point your camera at any bill. AI reads the amount, date and items automatically - no manual typing.",
  },
  {
    icon: <Bot />,
    title: "AI Expense Assistant",
    desc: "Ask your AI assistant anything: cross-group debt summaries, spending patterns, or settlement suggestions.",
  },
  {
    icon: <MessageSquare />,
    title: "Group & Direct Chat",
    desc: "Chat inside every group or privately with any member. Expense context, decisions and receipts - all in one thread.",
  },
  {
    icon: <QrCode />,
    title: "QR & Link Invites",
    desc: "Generate a QR code or shareable link. Guests join with one tap - if new, they sign up and land directly in the group.",
  },
  {
    icon: <ShieldCheck />,
    title: "Secure OTP Login",
    desc: "Email + password login is protected by a 6-digit OTP sent to your registered email before access is granted.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-12 sm:py-16 md:py-24 bg-card">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 sm:mb-12 md:mb-16">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary mb-3">Built for real trips</p>
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3 sm:gap-4">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                Every feature your group needs
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Built from real travel pain points - from scanning receipts to settling cross-group debts with AI.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="p-5 sm:p-6 md:p-7 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group"
    >
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-card border border-border flex items-center justify-center text-primary mb-4 sm:mb-5 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}
