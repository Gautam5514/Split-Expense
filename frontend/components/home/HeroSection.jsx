"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Users, Home, MessageCircle, Bot,
  Bell, Search, Plus, ArrowRight, Sparkles, Zap, Wallet,
  Receipt, Settings, ChevronRight, CheckCircle2,
} from "lucide-react";
import InteractiveDashboardSimulator from "./InteractiveDashboardSimulator";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=2400&q=80",
];

const GROUPS = [
  { name: "Goa Trip",     emoji: "🏖️", members: 4, total: "₹12,400", color: "#0891B2", pct: 65 },
  { name: "Monthly Rent", emoji: "🏠", members: 3, total: "₹45,000", color: "#0E7490", pct: 90 },
  { name: "Office Lunch", emoji: "🍕", members: 8, total: "₹3,200",  color: "#ec4899", pct: 40 },
  { name: "Movie Night",  emoji: "🎬", members: 5, total: "₹1,800",  color: "#f59e0b", pct: 100 },
];

const EXPENSES = [
  { name: "Hotel Booking", person: "Felix", amount: "₹8,000", time: "2h ago", emoji: "🏨", settled: false },
  { name: "Beach Dinner",  person: "Priya", amount: "₹2,400", time: "5h ago", emoji: "🍽️", settled: false },
  { name: "Taxi Airport",  person: "Alex",  amount: "₹1,200", time: "1d ago", emoji: "🚕", settled: true },
  { name: "Groceries",     person: "Sam",   amount: "₹850",   time: "2d ago", emoji: "🛒", settled: true },
];

const NAV = [
  { icon: Home,        label: "Dashboard", active: true },
  { icon: Users,       label: "Groups",    badge: "3" },
  { icon: Receipt,     label: "Expenses" },
  { icon: MessageCircle, label: "Messages", badge: "5" },
  { icon: Bot,         label: "AI",        sparkle: true },
];

export default function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative w-full min-h-screen overflow-hidden flex flex-col bg-black text-white pt-28 pb-12 sm:pb-20">

      {/* Background Gradients matching obsidianos.com */}
      <div className="absolute inset-x-0 top-0 -bottom-[164px] z-0" style={{ background: "linear-gradient(180deg, #000 0%, #2F2C2A 67%)" }} />
      <div className="pointer-events-none absolute top-[656px] -bottom-[42px] -left-[218px] -right-[218px] z-[4]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 83.35%)" }} />
      <div className="absolute inset-0 bg-radial-gradient(circle_at_center,rgba(8,145,178,0.03)_0%,transparent_70%) z-[1]" />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center">

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, ease: "easeOut" }}
          className="font-serif-premium font-normal text-white text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] tracking-tight leading-[1.05] text-center mb-6 max-w-4xl"
        >
          The all-in-one platform for splitting expenses
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          className="text-white/60 text-sm sm:text-base md:text-lg max-w-2xl text-center leading-relaxed mb-8 sm:mb-10 font-medium px-4"
        >
          AI-powered expense management available now - with intelligent receipt scanning and smart settling launching soon.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.25, ease: "easeOut" }}
          className="mb-16 sm:mb-24"
        >
          <button
            onClick={() => router.push("/register")}
            className="px-8 py-3.5 rounded-full font-bold text-black bg-white hover:bg-white/95 transition-all hover:scale-105 active:scale-95 text-sm sm:text-base shadow-[0_4px_25px_rgba(255,255,255,0.18)] cursor-pointer"
          >
            Get Started For Free
          </button>
        </motion.div>

        {/* Floating Glassmorphic App Preview Simulator */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.45, type: "spring", stiffness: 45, damping: 16 }}
          className="w-full max-w-6xl mx-auto z-10 relative px-2 sm:px-0"
        >
          <div className="absolute -inset-1 rounded-2xl bg-cyan-500/5 blur-xl pointer-events-none" />
          <InteractiveDashboardSimulator />
        </motion.div>
      </div>

      {/* Flanking Rock Textures (In Background z-[5] to sit below the mockup card) */}
      <picture>
        <source srcSet="/stone-left.webp" type="image/webp" />
        <img
          src="/stone-left.webp"
          alt=""
          decoding="async"
          className="pointer-events-none absolute max-w-none bottom-[-100px] left-[-140px] size-[844px] max-md:bottom-[0px] max-md:left-[-5%] max-md:size-[356px] max-xl:bottom-[-100px] max-xl:left-[-200px] z-[5]"
        />
      </picture>

      <picture>
        <source srcSet="/stone-right.webp" type="image/webp" />
        <img
          src="/stone-right.webp"
          alt=""
          decoding="async"
          className="pointer-events-none absolute max-w-none right-[-820px] bottom-[-100px] h-[940px] w-[1500px] max-md:right-[-240px] max-md:bottom-[0px] max-md:size-[500px] max-xl:right-[-920px] max-xl:bottom-[-100px] z-[5]"
        />
      </picture>
    </section>
  );
}
