"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Check, Sparkles, Users } from "lucide-react";

const people = [
  { name: "You", initials: "YO", color: "from-cyan-300 to-cyan-600" },
  { name: "Maya", initials: "MA", color: "from-teal-300 to-emerald-600" },
  { name: "Alex", initials: "AL", color: "from-sky-300 to-blue-600" },
];

export default function AuthVisual({ mode = "login" }) {
  const isSignup = mode === "signup";

  return (
    <aside className="hidden lg:block lg:w-[52%] h-full relative overflow-hidden bg-[#030708] isolate">
      <motion.img
        src="/auth-network-v2.png"
        alt="A connected network representing effortless shared expenses"
        className="absolute inset-0 h-full w-full object-cover object-center scale-[1.08]"
        initial={{ opacity: 0, scale: 1.13 }}
        animate={{ opacity: 1, scale: 1.08 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,#070909_0%,rgba(7,9,9,.2)_25%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,transparent_20%,rgba(2,6,7,.15)_55%,#030607_105%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#030607] via-[#030607]/75 to-transparent" />

      <div className="absolute left-10 right-10 top-9 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" /> Live balances</span>
        <span>Private &amp; secure</span>
      </div>

      <motion.div
        className="absolute left-[9%] top-[18%] w-[245px] rounded-[26px] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl"
        initial={{ opacity: 0, x: -24, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.35, duration: 0.75 }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
            <Users className="h-4 w-4 text-cyan-200" />
          </div>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Settled</span>
        </div>
        <p className="text-[11px] font-semibold text-white/45">Weekend in Goa</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-white">₹12,480</p>
        <div className="mt-5 flex items-center">
          <div className="flex -space-x-2">
            {people.map((person) => (
              <div key={person.initials} title={person.name} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#071012] bg-gradient-to-br ${person.color} text-[8px] font-black text-white`}>
                {person.initials}
              </div>
            ))}
          </div>
          <span className="ml-3 text-[10px] text-white/40">3 friends · 8 expenses</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-[8%] top-[53%] w-[220px] rounded-2xl border border-white/10 bg-[#071012]/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,.5)] backdrop-blur-xl"
        initial={{ opacity: 0, x: 24, y: -8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.6, duration: 0.75 }}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black"><Check className="h-4 w-4" strokeWidth={3} /></div>
          <div>
            <p className="text-xs font-bold text-white">All balanced</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/45">Everyone knows exactly what they owe.</p>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-9 left-10 right-10">
        <div className="mb-4 flex items-center gap-2 text-cyan-200">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Split smarter</span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h2 className="max-w-[430px] text-[clamp(1.75rem,3vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-white">
            {isSignup ? "One trip. Zero awkward math." : "Money sorted. Friendships untouched."}
          </h2>
          <div className="mb-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </aside>
  );
}
