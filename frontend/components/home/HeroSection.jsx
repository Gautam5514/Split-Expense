"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Home,
  MessageCircle,
  Bot,
  Bell,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  Wallet,
  Receipt,
  Settings,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=2400&q=80",
];

const GROUPS = [
  { name: "Goa Trip", emoji: "🏖️", members: 4, total: "₹12,400", color: "#0891B2", pct: 65 },
  { name: "Monthly Rent", emoji: "🏠", members: 3, total: "₹45,000", color: "#0E7490", pct: 90 },
  { name: "Office Lunch", emoji: "🍕", members: 8, total: "₹3,200", color: "#ec4899", pct: 40 },
  { name: "Movie Night", emoji: "🎬", members: 5, total: "₹1,800", color: "#f59e0b", pct: 100 },
];

const EXPENSES = [
  { name: "Hotel Booking", person: "Felix", amount: "₹8,000", time: "2h ago", emoji: "🏨", settled: false },
  { name: "Beach Dinner", person: "Priya", amount: "₹2,400", time: "5h ago", emoji: "🍽️", settled: false },
  { name: "Taxi Airport", person: "Alex", amount: "₹1,200", time: "1d ago", emoji: "🚕", settled: true },
  { name: "Groceries", person: "Sam", amount: "₹850", time: "2d ago", emoji: "🛒", settled: true },
];

const NAV = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: Users, label: "Groups", badge: "3" },
  { icon: Receipt, label: "Expenses" },
  { icon: MessageCircle, label: "Messages", badge: "5" },
  { icon: Bot, label: "AI Assistant", sparkle: true },
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

      {/* ── Sliding background images ── */}
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

        {/* Overlay — lighter in light mode, dark in dark mode */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/85 dark:from-black/75 dark:via-black/60 dark:to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/25 via-transparent to-teal-950/25 dark:from-cyan-950/50 dark:to-teal-950/50" />
        {/* Bottom fade blends into page background */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Image indicator dots */}
      <div className="absolute top-[370px] xs:top-[390px] sm:top-[420px] md:top-auto md:bottom-[52%] left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {BG_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setBgIndex(i)}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === bgIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* ── Above-fold content ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-28 flex flex-col items-center">


        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.08 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-center text-white leading-[1.02] tracking-tight mb-5"
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
          className="text-base md:text-lg text-white/50 max-w-lg text-center leading-relaxed mb-9 font-medium"
        >
          Track shared costs, settle up in one tap, and let AI handle the math —
          so you focus on the memories, not the bills.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.28 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-5"
        >
          <button
            onClick={() => router.push("/register")}
            className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
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
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-white/75 text-sm transition-all hover:scale-105 active:scale-95 hover:text-white"
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
          className="flex items-center gap-3 mb-12 text-sm text-white/35 font-medium"
        >
          <div className="flex -space-x-2">
            {["Felix", "Lily", "Alex", "Sam", "Priya"].map((n) => (
              <img
                key={n}
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${n}&backgroundColor=c4b5fd`}
                className="w-7 h-7 rounded-full border-2 border-black/60 bg-teal-900 object-cover"
                alt={n}
              />
            ))}
          </div>
          <span>
            Trusted by <strong className="text-white/60">2,000+</strong> groups worldwide
          </span>
        </motion.div>

        {/* ── App Preview ── */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, type: "spring", stiffness: 55, damping: 18 }}
          className="w-full max-w-6xl mx-auto px-2 sm:px-0 overflow-hidden"
        >
          {/* Browser chrome */}
          <div
            className="rounded-t-2xl overflow-hidden"
            style={{
              background: "rgba(18,18,28,0.96)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              className="flex items-center gap-4 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              {/* Traffic lights */}
              <div className="flex gap-1.5 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/80 font-medium"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="w-3.5 h-3.5 rounded-sm overflow-hidden flex items-center justify-center border border-white/10 flex-shrink-0">
                    <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase" />
                  </div>
                  SplitEase
                </div>
              </div>

              {/* URL bar */}
              <div className="hidden sm:flex flex-1 items-center justify-center">
                <div
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs text-white/35"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", maxWidth: 280, width: "100%" }}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <span>splitease.app/dashboard</span>
                </div>
              </div>

              <div className="flex gap-1.5">
                {[Bell, Settings].map((Icon, i) => (
                  <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    <Icon className="w-3 h-3 text-white/25" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Dashboard UI ── */}
          <div
            className="flex overflow-hidden rounded-b-2xl"
            style={{
              background: "rgba(10,10,16,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: "none",
              height: 520,
            }}
          >
            {/* ── Sidebar ── */}
            <div
              className="hidden md:flex w-52 flex-shrink-0 flex flex-col py-5 px-3"
              style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Logo */}
              <div className="flex items-center gap-2 px-2 mb-7">
                <div
                  className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 flex-shrink-0"
                >
                  <img src="/logo-icon.png" className="w-full h-full object-cover" alt="SplitEase Logo" />
                </div>
                <span className="font-extrabold text-sm text-white tracking-tight">SplitEase</span>
              </div>

              {/* Nav links */}
              <div className="flex flex-col gap-0.5">
                {NAV.map(({ icon: Icon, label, active, badge, sparkle }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer select-none"
                    style={
                      active
                        ? {
                            background: "linear-gradient(135deg,rgba(8,145,178,0.28),rgba(6,182,212,0.18))",
                            border: "1px solid rgba(8,145,178,0.25)",
                          }
                        : {}
                    }
                  >
                    <div
                      className={`flex items-center gap-2.5 text-xs font-medium ${
                        active ? "text-white" : sparkle ? "text-cyan-400" : "text-white/40"
                      }`}
                    >
                      {sparkle ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      {label}
                    </div>
                    {badge && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(8,145,178,0.3)", color: "#67E8F9" }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* User */}
              <div
                className="mt-auto flex items-center gap-2 px-2 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <img
                  src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=c4b5fd"
                  className="w-7 h-7 rounded-lg object-cover bg-teal-900"
                  alt="user"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Felix Kumar</p>
                  <p className="text-[9px] text-white/30 truncate">felix@gmail.com</p>
                </div>
                <Settings className="w-3 h-3 text-white/20 flex-shrink-0" />
              </div>
            </div>

            {/* ── Main area ── */}
            <div className="flex-1 flex flex-col min-w-0">

              {/* Top bar */}
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-3.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">Good morning, Felix 👋</h2>
                  <p className="text-[9px] sm:text-[10px] text-white/30 mt-0.5">April 26, 2025 · 4 pending expenses</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/35"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Search className="w-3 h-3" />
                    <span>Search expenses…</span>
                  </div>
                  <button
                    className="flex items-center gap-1 px-2 py-1.5 sm:px-3.5 rounded-xl text-[10px] sm:text-xs text-white font-bold whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg,#0891B2,#0E7490)" }}
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Add Expense</span>
                  </button>
                </div>
              </div>

              {/* Content row */}
              <div className="flex flex-1 overflow-hidden">

                {/* Left: main content */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto min-w-0 scrollbar-none sm:custom-scrollbar">

                  {/* Balance cards */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3 flex-shrink-0">
                    {[
                      { label: "Total Expenses", value: "₹60,600", sub: "This month", Icon: Receipt, color: "text-white" },
                      { label: "You Owe", value: "₹3,240", sub: "2 groups", Icon: TrendingDown, color: "text-red-400", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
                      { label: "Owed to You", value: "₹7,800", sub: "3 people", Icon: TrendingUp, color: "text-emerald-400", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
                    ].map(({ label, value, sub, Icon, color, bg, border }) => (
                      <div
                        key={label}
                        className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl"
                        style={{
                          background: bg || "rgba(255,255,255,0.04)",
                          border: `1px solid ${border || "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-widest font-semibold truncate">{label}</p>
                          <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${color} flex-shrink-0`} />
                        </div>
                        <p className={`text-xs sm:text-base font-extrabold ${color}`}>{value}</p>
                        <p className="text-[8px] sm:text-[9px] text-white/25 mt-0.5 truncate">{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Groups row */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold text-white">Your Groups</h3>
                      <span className="text-[9px] text-cyan-400 cursor-pointer font-semibold">View all →</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {GROUPS.map(({ name, emoji, members, total, color, pct }) => (
                        <div
                          key={name}
                          className="p-2 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl mb-2 flex items-center justify-center text-sm"
                            style={{ background: `${color}22`, border: `1px solid ${color}40` }}
                          >
                            {emoji}
                          </div>
                          <p className="text-[10px] font-bold text-white leading-tight mb-0.5">{name}</p>
                          <p className="text-[9px] text-white/30 mb-2">{members} members · {total}</p>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expenses list */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-white">Recent Expenses</h3>
                      <span className="text-[9px] text-cyan-400 cursor-pointer font-semibold">View all →</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {EXPENSES.map(({ name, person, amount, time, emoji, settled }) => (
                        <div
                          key={name}
                          className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl cursor-pointer"
                          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{emoji}</span>
                            <div>
                              <p className="text-[10px] font-semibold text-white">{name}</p>
                              <p className="text-[9px] text-white/30">by {person} · {time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className={`text-[10px] font-bold ${settled ? "text-emerald-400" : "text-white"}`}>{amount}</p>
                            </div>
                            <span
                              className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                                settled
                                  ? "text-emerald-400 bg-emerald-400/10"
                                  : "text-amber-400 bg-amber-400/10"
                              }`}
                            >
                              {settled ? "Settled" : "Pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right panel */}
                <div
                  className="hidden lg:flex w-52 flex-shrink-0 flex flex-col p-4 gap-4 overflow-hidden"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {/* AI insight */}
                  <div
                    className="p-3.5 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg,rgba(8,145,178,0.2),rgba(6,182,212,0.1))",
                      border: "1px solid rgba(8,145,178,0.28)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px] font-bold text-cyan-300">AI Insight</span>
                    </div>
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      You spend <strong className="text-white/90">₹2,400 more</strong> on dining while
                      traveling. Set a travel dining budget?
                    </p>
                    <button className="mt-2 flex items-center gap-1 text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                      Ask AI <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Settle up */}
                  <div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Settle Up</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { name: "Priya", amount: "₹1,200", seed: "Priya" },
                        { name: "Alex", amount: "₹2,040", seed: "Alex" },
                      ].map(({ name, amount, seed }) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-2 rounded-xl"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=c4b5fd`}
                              className="w-6 h-6 rounded-lg bg-teal-900"
                              alt={name}
                            />
                            <div>
                              <p className="text-[10px] font-semibold text-white">{name}</p>
                              <p className="text-[8px] text-white/30">owes you</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-emerald-400">{amount}</p>
                            <button className="text-[8px] text-cyan-400 font-semibold">Remind</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini chart */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Spending</p>
                      <span className="text-[9px] text-cyan-400 font-semibold flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" /> +12%
                      </span>
                    </div>
                    <div className="relative h-16">
                      <svg viewBox="0 0 150 55" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(8,145,178,0.45)" />
                            <stop offset="100%" stopColor="rgba(8,145,178,0)" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,50 C18,44 28,30 45,25 C62,20 72,36 88,22 C104,8 118,26 135,10 L150,5"
                          fill="none"
                          stroke="#22D3EE"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M0,50 C18,44 28,30 45,25 C62,20 72,36 88,22 C104,8 118,26 135,10 L150,5 L150,55 L0,55 Z"
                          fill="url(#chartFill)"
                        />
                      </svg>
                      <div className="absolute bottom-0 w-full flex justify-between px-0.5">
                        {["J", "F", "M", "A", "M", "J"].map((m, i) => (
                          <span key={i} className="text-[8px] text-white/20">{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Categories</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: "Food & Dining", pct: 42, color: "#0891B2" },
                        { label: "Travel", pct: 28, color: "#0E7490" },
                        { label: "Utilities", pct: 30, color: "#ec4899" },
                      ].map(({ label, pct, color }) => (
                        <div key={label}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px] text-white/40">{label}</span>
                            <span className="text-[9px] text-white/50 font-semibold">{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
