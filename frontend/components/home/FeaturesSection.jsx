"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  ShieldCheck,
  Plane,
  BookOpen,
  MessageSquare,
  Wallet2,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-card">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold text-foreground mb-2">
              Everything you need for group travel
            </h2>
            <p className="text-muted-foreground text-lg">
              Packed with powerful features to handle complex splitting scenarios.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<TrendingUp />}
            title="Real-Time Sync"
            desc="Changes appear instantly on everyone's phone."
          />
          <FeatureCard
            icon={<ShieldCheck />}
            title="Bank-Grade Security"
            desc="Your financial data is encrypted and never shared."
          />
          <FeatureCard
            icon={<Plane />}
            title="Multi-Currency"
            desc="Auto-convert 150+ currencies with real-time rates."
          />
          <FeatureCard
            icon={<BookOpen />}
            title="PDF Reports"
            desc="Export detailed summaries for your records."
          />
          <FeatureCard
            icon={<MessageSquare />}
            title="Expense Chat"
            desc="Comment on specific bills to clarify details."
          />
          <FeatureCard
            icon={<Wallet2 />}
            title="Offline Mode"
            desc="Add expenses without internet; syncs when online."
          />
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
      whileHover={{ y: -5 }}
      className="p-8 rounded-2xl bg-card border border-border hover:border-primary/20 hover:bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group"
    >
      <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}
