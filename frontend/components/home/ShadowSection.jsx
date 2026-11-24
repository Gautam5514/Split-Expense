"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Callout, GRAIN } from "./AutopilotSection";

/* Home-page Shadow showcase: the dark twin of the Autopilot panel.
   Shadow is the SEM settlement engine. Today it runs in the background next
   to the normal settle-up and only checks the math; users do not see its
   result yet. So the copy says "in testing" and promises nothing else.
   The example in the card is real arithmetic: five people, balances
   +700 +500 -400 -300 -500, cleared in three payments (the minimum). */

const PAYMENTS = [
  { from: "Priya", to: "Aman", amount: "₹400" },
  { from: "Rohit", to: "Aman", amount: "₹300" },
  { from: "Kabir", to: "Neha", amount: "₹500" },
];

const CALLOUTS = [
  { key: "quiet", side: "left", top: 12, label: "Works quietly", detail: "Runs behind your balances, never in your way" },
  { key: "fewest", side: "right", top: 20, label: "Fewest payments", detail: "Looks for the smallest set of transfers that clears everyone" },
  { key: "exact", side: "left", top: 130, label: "Exact to the paisa", detail: "Whole-paisa math, rounded once, no drift" },
  { key: "checked", side: "right", top: 186, label: "Checked twice", detail: "A second pass verifies every plan" },
];

export default function ShadowSection() {
  return (
    <section className="bg-[#030303] px-3 pb-16 sm:px-5 sm:pb-24" aria-labelledby="shadow-home-title">
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] ring-1 ring-inset ring-white/[0.08] sm:rounded-[36px]"
        style={{
          background:
            "radial-gradient(60% 50% at 12% 100%, rgba(103,232,249,0.16) 0%, transparent 70%), linear-gradient(180deg, #0B0C11 0%, #10111A 40%, #1A1838 82%, #262058 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-soft-light"
          style={{ backgroundImage: GRAIN }}
          aria-hidden="true"
        />

        {/* copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mx-auto max-w-2xl px-6 pt-14 text-center sm:pt-20"
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">
            [ Shadow · In testing ]
          </p>
          <h2
            id="shadow-home-title"
            className="mt-4 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl"
          >
            Fewer payments.
            <br />
            <span className="text-white/40">Shadow checks the math.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-base">
            Shadow is our new settlement engine. It runs quietly behind your balances, works out the fewest payments
            that clear the group, and verifies the plan to the paisa. It&apos;s in testing today.
          </p>
        </motion.div>

        {/* stage */}
        <div className="relative mx-auto mt-12 max-w-6xl px-5 pb-12 sm:mt-14 lg:h-[410px] lg:pb-0">
          <div className="pointer-events-none absolute inset-0 hidden select-none font-mono font-bold uppercase leading-[1.15] text-white/[0.13] blur-[5px] lg:block" aria-hidden="true">
            <span className="absolute left-[calc(50%+215px)] top-[300px] text-[52px]">Shadow</span>
            <span className="absolute right-[calc(50%+215px)] top-[250px] whitespace-nowrap text-[46px]">
              Checked
              <br />
              twice
            </span>
          </div>

          {CALLOUTS.map((c, i) => (
            <Callout key={c.key} callout={c} index={i} dark />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[340px] lg:absolute lg:left-1/2 lg:top-0 lg:-translate-x-1/2"
          >
            <SettleCard />
          </motion.div>

          <ul className="relative mx-auto mt-8 grid max-w-md grid-cols-2 gap-x-5 gap-y-5 lg:hidden">
            {CALLOUTS.map((c) => (
              <li key={c.key}>
                <p className="border-b border-white/30 pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                  {c.label}
                </p>
                <p className="mt-1.5 text-[13px] leading-snug text-white/55">{c.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SettleCard() {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#13141C] p-4 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-white">Goa trip · settle up</span>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/70">5 people</span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[13.5px] font-semibold text-white">3 payments clear everyone</p>
          <p className="text-xs text-white/40 line-through">4</p>
        </div>
        <p className="mt-0.5 text-xs text-white/45">The usual way takes four</p>

        <ul className="mt-3 space-y-2.5 border-t border-white/[0.07] pt-3">
          {PAYMENTS.map((p) => (
            <li key={p.from} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-white/80">
                {p.from}
                <ArrowRight className="h-3.5 w-3.5 text-white/35" aria-hidden="true" />
                {p.to}
              </span>
              <span className="font-medium tabular-nums text-white">{p.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-emerald-400/10 py-2.5 text-[13px] font-semibold text-emerald-300">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verified: adds up exactly
      </div>
      <p className="mt-3 text-center text-[11px] text-white/40">Example plan. Shadow never moves money.</p>
    </div>
  );
}
