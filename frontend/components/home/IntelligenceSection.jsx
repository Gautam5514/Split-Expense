"use client";

import { useEffect, useRef, useState } from "react";
import { Saira_Condensed, VT323 } from "next/font/google";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, CheckCheck, ScanLine, Smartphone, Laptop, Tablet, ArrowRight } from "lucide-react";

/* Engine showcase: a tab rail of the six core skills over one stage. Each skill
   plays its own looping mini-demo built from plain markup (no screenshots), so
   it stays crisp, light, and on-brand. Auto-advances, pauses on hover/focus. */

const condensed = Saira_Condensed({ weight: "600", subsets: ["latin"] });
const pixel = VT323({ weight: "400", subsets: ["latin"] });

const AUTO_MS = 6500;

const FEATURES = [
  { id: "split", label: "Instant Split", info: "Equal, shares or exact. Settled in one tap.", points: ["Equal, ratio or exact amounts", "Edit any share, totals stay balanced", "Multi-currency groups"] },
  { id: "receipt", label: "Receipt Vision", info: "Attach bill photos now. AI itemization coming soon.", points: ["Snap or upload any bill", "Proof stays attached to the expense", "Itemised splitting is on the way"] },
  { id: "chat", label: "Settle Chat", info: "Every payment lives inside the conversation.", points: ["Pay and chat in one thread", "Payments logged automatically", "No more “did you send it?”"] },
  { id: "graph", label: "Debt Graph", info: "Balances routed through minimal transfers.", points: ["Cuts transfers to the minimum", "Works across the whole group", "One clear list of who pays whom"] },
  { id: "ledger", label: "Live Ledger", info: "Real-time sync across every device.", points: ["Phone, tablet and web in sync", "Everyone sees the same numbers", "Updates land in under a second"] },
  { id: "confirm", label: "Settle Confirm", info: "Two-party confirmation before any balance moves.", points: ["Payer marks it, receiver confirms", "Balances change only after both", "A clean audit trail"] },
];

/* ---------- mini demos ---------- */

function useTick(count, ms, active) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((v) => (v + 1) % count), ms);
    return () => clearInterval(id);
  }, [count, ms, active]);
  return t;
}

const Shell = ({ children, title }) => (
  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#071218] p-4 sm:p-5">
    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">{title}</p>
    <div className="flex-1">{children}</div>
  </div>
);

function SplitDemo({ run }) {
  const mode = useTick(2, 2200, run);
  const rows = [["🧑🏻", "Aman"], ["👩🏽", "Riya"], ["🧔🏻", "Karan"]];
  const pct = mode === 0 ? [33, 33, 34] : [50, 30, 20];
  return (
    <Shell title={mode === 0 ? "Split equally" : "Split by shares"}>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-extrabold tabular-nums">₹1,200</p>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">Dinner · Fri</span>
      </div>
      <div className="mt-5 space-y-3.5">
        {rows.map(([e, n], i) => (
          <div key={n} className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#16262e] text-base">{e}</span>
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs"><span>{n}</span><span className="font-mono tabular-nums">₹{Math.round(1200 * pct[i] / 100)}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-200" animate={{ width: `${pct[i]}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function ReceiptDemo({ run }) {
  const step = useTick(5, 900, run);
  const items = [["Paneer tikka", 420], ["Butter naan ×4", 240], ["Cold drinks", 180], ["GST 5%", 42]];
  return (
    <Shell title="Receipt attached">
      <div className="relative mx-auto h-full max-w-[250px] overflow-hidden rounded-lg bg-[#f3efe6] p-4 font-mono text-[11px] text-[#2a2a2a]">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest">Spice Route</p>
        <div className="my-2 border-t border-dashed border-black/30" />
        {items.map(([n, a], i) => (
          <motion.div key={n} initial={false} animate={{ opacity: step > i ? 1 : 0.15 }} className="flex justify-between py-0.5">
            <span>{n}</span><span>₹{a}</span>
          </motion.div>
        ))}
        <div className="my-2 border-t border-dashed border-black/30" />
        <motion.div initial={false} animate={{ opacity: step >= 4 ? 1 : 0.15 }} className="flex justify-between font-bold"><span>Total</span><span>₹882</span></motion.div>
        <motion.div
          className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent"
          animate={{ top: ["-15%", "100%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
        />
        <ScanLine className="absolute right-2 top-2 h-4 w-4 text-cyan-600" aria-hidden="true" />
      </div>
    </Shell>
  );
}

function ChatDemo({ run }) {
  const step = useTick(5, 1100, run);
  const msgs = [
    { me: false, t: "Sent ₹450 on UPI 💸" },
    { me: true, t: "Got it, thanks!" },
  ];
  return (
    <Shell title="Group · Goa Trip">
      <div className="flex h-full flex-col justify-end gap-2.5">
        {msgs.map((m, i) => step > i && (
          <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.me ? "self-end rounded-br-sm bg-cyan-400 text-[#00232c]" : "self-start rounded-bl-sm bg-white/10"}`}>
            {m.t}
          </motion.div>
        ))}
        {step > 2 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="self-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
            <CheckCheck className="mr-1.5 inline h-3 w-3" aria-hidden="true" />Settled · ₹450 logged
          </motion.div>
        )}
      </div>
    </Shell>
  );
}

function GraphDemo({ run }) {
  const after = useTick(2, 2600, run) === 1;
  const before = [["Aman", "Riya", 300], ["Riya", "Karan", 450], ["Karan", "Neha", 200], ["Neha", "Aman", 150], ["Aman", "Karan", 100]];
  const best = [["Riya", "Neha", 150], ["Karan", "Neha", 100]];
  const list = after ? best : before;
  return (
    <Shell title={after ? "Minimal transfers" : "Raw balances"}>
      <div className="flex items-end justify-between">
        <motion.p key={after} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-extrabold tabular-nums text-cyan-300">{list.length}</motion.p>
        <p className="pb-1 text-xs text-white/50">transfers needed</p>
      </div>
      <ul className="mt-4 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {list.map(([a, b, amt]) => (
            <motion.li key={a + b + amt} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs">
              <span className="font-semibold">{a}</span><ArrowRight className="h-3 w-3 text-cyan-400" aria-hidden="true" /><span className="font-semibold">{b}</span>
              <span className="ml-auto font-mono tabular-nums">₹{amt}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Shell>
  );
}

function LedgerDemo({ run }) {
  const t = useTick(4, 1000, run);
  const devices = [[Smartphone, "Phone"], [Tablet, "Tablet"], [Laptop, "Web"]];
  return (
    <Shell title="Live ledger">
      <div className="grid grid-cols-3 gap-2.5">
        {devices.map(([Icon, name], i) => (
          <div key={name} className="relative rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <Icon className="mx-auto h-5 w-5 text-white/60" aria-hidden="true" />
            <p className="mt-1 text-[10px] text-white/50">{name}</p>
            <motion.p animate={{ opacity: t > i ? 1 : 0.25 }} className="mt-2 font-mono text-sm font-bold tabular-nums">₹{t === 0 ? "3,200" : "3,650"}</motion.p>
            <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${t > i ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-white/20"}`} />
          </div>
        ))}
      </div>
      <motion.p animate={{ opacity: t >= 1 ? 1 : 0 }} className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-2 text-xs text-cyan-100">
        + ₹450 “Cab to airport” added. Synced on all devices.
      </motion.p>
    </Shell>
  );
}

function ConfirmDemo({ run }) {
  const step = useTick(4, 1300, run);
  const steps = ["Rohit marks ₹450 as paid", "Aditi gets a confirmation request", "Aditi confirms receipt", "Balances updated"];
  return (
    <Shell title="Two-party confirm">
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const done = step >= i;
          return (
            <motion.li key={s} animate={{ opacity: done ? 1 : 0.3 }} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-sm">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-cyan-400 text-[#00232c]" : "bg-white/10 text-white/40"}`}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              {s}
            </motion.li>
          );
        })}
      </ol>
    </Shell>
  );
}

const DEMOS = { split: SplitDemo, receipt: ReceiptDemo, chat: ChatDemo, graph: GraphDemo, ledger: LedgerDemo, confirm: ConfirmDemo };

/* ---------- section ---------- */

export default function IntelligenceSection() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.3 });
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!inView || paused || reduced) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % FEATURES.length), AUTO_MS);
    return () => clearTimeout(id);
  }, [active, inView, paused, reduced]);

  const f = FEATURES[active];
  const Demo = DEMOS[f.id];

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#030303] py-20 text-white sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.07] blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <header className="mb-10 max-w-2xl sm:mb-12">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">{"// Inside the SplitEase engine"}</p>
          <h2 className={`${condensed.className} mt-4 text-4xl uppercase leading-[1.02] sm:text-6xl`}>
            Six skills.<br /><span className="text-white/40">One living ledger.</span>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
            Tracking, balancing and settling debts with context. Pick a skill and watch it work.
          </p>
        </header>

        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
          {/* tab rail */}
          <div
            role="tablist"
            aria-label="Engine skills"
            onKeyDown={(e) => {
              const n = FEATURES.length;
              const next = { ArrowRight: (active + 1) % n, ArrowLeft: (active + n - 1) % n, Home: 0, End: n - 1 }[e.key];
              if (next === undefined) return;
              e.preventDefault();
              setActive(next);
              e.currentTarget.children[next]?.focus();
            }}
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {FEATURES.map((x, i) => {
              const on = i === active;
              return (
                <button
                  key={x.id}
                  role="tab"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  className={`relative shrink-0 overflow-hidden rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${on ? "border-cyan-400/60 bg-cyan-400/10 text-white" : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/80"}`}
                >
                  {on && (
                    <motion.span
                      key={`p-${active}-${paused}`}
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/25 to-cyan-400/45"
                      initial={{ width: reduced || paused ? "100%" : 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: reduced || paused ? 0 : AUTO_MS / 1000, ease: "linear" }}
                    />
                  )}
                  <span className="relative"><span className="mr-2 text-cyan-400/70">0{i + 1}</span>{x.label}</span>
                </button>
              );
            })}
          </div>

          {/* stage */}
          <div className="relative mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a1a22] via-[#05090c] to-[#030303] p-5 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,430px)] lg:gap-14"
              >
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">0{active + 1} / 0{FEATURES.length}</p>
                  <h3 className={`${condensed.className} mt-3 text-5xl uppercase leading-none sm:text-7xl`}>{f.label}</h3>
                  <p className="mt-4 max-w-md text-base text-white/65">{f.info}</p>
                  <ul className="mt-6 space-y-2.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-3 text-sm text-white/80">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-cyan-400/15 text-cyan-300"><Check className="h-3 w-3" aria-hidden="true" /></span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="h-[330px]"><Demo run={inView && !reduced} /></div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-14 flex items-end gap-4 sm:gap-7">
          <span className={`${pixel.className} leading-none text-[clamp(40px,6.6vw,92px)]`}>Intelligence</span>
          <span className="mb-[0.18em] h-px flex-1 bg-white/30" />
          <span className="font-serif-premium italic leading-none text-[clamp(40px,6.6vw,92px)]">Model</span>
        </div>
      </div>
    </section>
  );
}
