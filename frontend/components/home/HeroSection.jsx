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
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBgIndex((p) => (p + 1) % BG_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative w-full min-h-screen overflow-hidden flex flex-col">

      {/* Sliding background */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={bgIndex}
            src={BG_IMAGES[bgIndex]}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/85 dark:from-black/75 dark:via-black/60 dark:to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/25 via-transparent to-teal-950/25 dark:from-cyan-950/50 dark:to-teal-950/50" />
        <div className="absolute bottom-0 inset-x-0 h-48 sm:h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Above-fold content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-28 flex flex-col items-center">

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.08 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[5rem] xl:text-[5.5rem] font-black text-center text-white leading-[1.04] tracking-tight mb-4 sm:mb-5"
        >
          Split expenses,
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #22D3EE 0%, #38BDF8 40%, #34D399 100%)" }}
          >
            not friendships.
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.18 }}
          className="text-sm sm:text-base md:text-lg text-white/50 max-w-sm sm:max-w-lg text-center leading-relaxed mb-7 sm:mb-9 font-medium px-2"
        >
          Track shared costs, settle up in one tap, and let AI handle the math -
          so you focus on the memories, not the bills.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.28 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-5 w-full sm:w-auto px-4 sm:px-0"
        >
          <button
            onClick={() => router.push("/register")}
            className="group flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #0891B2, #0E7490)",
              boxShadow: "0 0 40px rgba(8,145,178,0.45), 0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <Zap className="w-4 h-4" />
            Start for free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => router.push("/login")}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-2xl font-semibold text-white/75 text-sm transition-all hover:scale-105 active:scale-95 hover:text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(12px)",
            }}
          >
            Sign in
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="flex items-center gap-3 mb-8 sm:mb-12 text-xs sm:text-sm text-white/35 font-medium"
        >
          <div className="flex -space-x-2">
            {["Felix", "Lily", "Alex", "Sam", "Priya"].map((n) => (
              <img
                key={n}
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${n}&backgroundColor=c4b5fd`}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-black/60 bg-teal-900 object-cover"
                alt={n}
              />
            ))}
          </div>
          <span>
            Trusted by <strong className="text-white/60">2,000+</strong> groups worldwide
          </span>
        </motion.div>

        {/* Image indicator dots */}
        <div className="flex gap-1.5 mb-5 sm:mb-6">
          {BG_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${i === bgIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
            />
          ))}
        </div>

        {/* App Preview */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, type: "spring", stiffness: 55, damping: 18 }}
          className="w-full max-w-6xl mx-auto"
        >
          <InteractiveDashboardSimulator />
        </motion.div>
      </div>
    </section>
  );
}
