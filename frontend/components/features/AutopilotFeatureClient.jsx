"use client";

/* /features/autopilot - the marketing page for Autopilot, the in-app AI
   assistant. Same dark landing theme as the other feature pages
   (FeaturePageLayout), with a richer layout: a live demo of the real
   ask -> plan -> approve -> verified flow, capability cards, the safety model
   and an honest roadmap.

   Copy rule (same as FeaturePageLayout): say plainly what is live and what is
   not. Everything under "Live today" exists in backend/modules/autopilot;
   "Building next" and "Exploring" are not built yet. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bot, Check, ChevronDown, Coins, Construction,
  Fingerprint, Gauge, Hourglass, Languages, LifeBuoy, ListChecks, Lock, MessageSquareText, Pencil,
  PiggyBank, Plug, Receipt, Scale, ShieldCheck, Sparkles, Trash2, UserPlus, Users, Wand2,
} from "lucide-react";
import Footer from "@/components/Footer";
import { PlayStoreButton } from "@/components/PlayStoreLink";

const ACCENT = "167,139,250"; // violet - Autopilot's colour across the page

/* ── live demo ─────────────────────────────────────────────────────────── */

const SCENES = [
  {
    ask: "Create group Goa Trip with Aman and Priya, budget 40000",
    kind: "write",
    steps: [
      { icon: Users, title: "Create trip group", detail: "Goa Trip" },
      { icon: UserPlus, title: "Add people", detail: "Aman added · Priya gets an invite" },
      { icon: PiggyBank, title: "Set trip budget", detail: "₹40,000" },
    ],
  },
  {
    ask: "Dinner 3600 paid by me, Rahul ko chhod ke",
    kind: "write",
    steps: [
      { icon: Receipt, title: "Add expense · food", detail: "Dinner · ₹3,600 · paid by you" },
      { icon: Scale, title: "Split equally between 3", detail: "₹1,200 each · Rahul left out" },
    ],
  },
  {
    ask: "Who owes whom in Goa Trip?",
    kind: "read",
    steps: [
      { icon: Coins, title: "Aman pays you", detail: "₹1,200" },
      { icon: Coins, title: "Priya pays you", detail: "₹800" },
    ],
  },
];

// typing -> planning -> plan shown -> approved -> verified, then next scene
const PHASES = ["typing", "planning", "plan", "approving", "done"];
const PHASE_MS = { typing: 1600, planning: 1100, plan: 1900, approving: 900, done: 2300 };
const STAGE_LABELS = ["Understand", "Plan", "Approve", "Verify"];

function DemoChat() {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState(reduced ? "done" : "typing");
  const s = SCENES[scene];

  useEffect(() => {
    if (reduced) return undefined;
    // Reads answer straight away - no approval phase.
    const order = s.kind === "read" ? ["typing", "planning", "done"] : PHASES;
    const next = order[order.indexOf(phase) + 1];
    const t = setTimeout(() => {
      if (next) setPhase(next);
      else {
        setScene((i) => (i + 1) % SCENES.length);
        setPhase("typing");
      }
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, s.kind, reduced]);

  const at = { typing: 0, planning: 1, plan: 2, approving: 2, done: 4 }[phase];
  const showPlan = phase !== "typing" && phase !== "planning";
  const verified = phase === "done";

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2.5rem] blur-3xl"
        style={{ background: `radial-gradient(60% 60% at 60% 40%, rgba(${ACCENT},0.22), transparent 70%)` }}
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#0B0B0F]/95 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `rgba(${ACCENT},0.16)` }}>
              <Wand2 size={15} style={{ color: `rgb(${ACCENT})` }} />
            </span>
            <div>
              <p className="text-sm font-bold leading-none">Autopilot</p>
              <p className="mt-1 text-[10px] text-white/40">Reviews before it acts</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {SCENES.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === scene ? "w-5 bg-white/70" : "w-1.5 bg-white/15"}`} />
            ))}
          </div>
        </div>

        <div className="min-h-[392px] space-y-3.5 p-5">
          {/* user bubble */}
          <div className="flex justify-end">
            <motion.div
              key={`ask-${scene}`}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[13px] font-medium leading-snug text-black"
            >
              {phase === "typing" && !reduced ? <Typewriter text={s.ask} /> : s.ask}
            </motion.div>
          </div>

          {/* stage bar - same four stages as the real widget */}
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-2.5">
            <div className="flex gap-1.5">
              {STAGE_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                    i < at ? (verified ? "bg-emerald-400" : "bg-violet-400") : i === at ? "animate-pulse bg-violet-400/70" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
              {STAGE_LABELS.map((label) => <span key={label}>{label}</span>)}
            </div>
          </div>

          {phase === "planning" && (
            <div className="flex items-center gap-2 px-1 text-xs text-white/45">
              <Sparkles size={13} className="animate-pulse text-violet-300" />
              Reading your groups and working out the exact split…
            </div>
          )}

          {/* plan / answer card */}
          <AnimatePresence mode="wait">
            {(showPlan || (s.kind === "read" && verified)) && (
              <motion.div
                key={`plan-${scene}`}
                initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-2xl border border-white/[0.08] bg-[#111116]"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                    {s.kind === "read" ? "Answer · nothing changes" : verified ? "Done" : "Plan · waiting for you"}
                  </p>
                  {s.kind === "write" && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${verified ? "bg-emerald-400/15 text-emerald-300" : "bg-violet-400/15 text-violet-200"}`}>
                      {s.steps.length} steps
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-white/[0.05]">
                  {s.steps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <motion.li
                        key={step.title}
                        initial={reduced ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduced ? 0 : i * 0.12 }}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                          <Icon size={15} className="text-white/70" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-white/90">{step.title}</p>
                          <p className="truncate text-[11.5px] text-white/45">{step.detail}</p>
                        </div>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-500 ${
                            verified ? "border-emerald-400/40 bg-emerald-400/15" : "border-white/10"
                          }`}
                          style={{ transitionDelay: verified ? `${i * 140}ms` : "0ms" }}
                        >
                          {verified && <Check size={11} className="text-emerald-300" />}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
                {s.kind === "write" && (
                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
                    {verified ? (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <BadgeCheck size={14} /> Done, and verified against your ledger.
                      </p>
                    ) : (
                      <>
                        <span className="text-[11px] text-white/35">Edit · Reject</span>
                        <span
                          className={`rounded-full px-4 py-1.5 text-xs font-bold text-black transition-all duration-300 ${
                            phase === "approving" ? "scale-95 bg-emerald-300" : "bg-white shadow-[0_0_0_4px_rgba(167,139,250,0.25)]"
                          }`}
                        >
                          {phase === "approving" ? "Approved" : "Approve"}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Typewriter({ text }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const step = Math.max(14, Math.floor(1300 / text.length));
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), step);
    return () => clearInterval(t);
  }, [text]);
  return (
    <>
      {text.slice(0, n)}
      <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-black/60" />
    </>
  );
}

/* ── content ───────────────────────────────────────────────────────────── */

const STATS = [
  { value: "10", label: "actions it can plan and run" },
  { value: "0", label: "changes before you approve" },
  { value: "4 + 1", label: "AI engines, plus an offline mode" },
  { value: "Web + App", label: "same assistant everywhere" },
];

const FLOW = [
  { icon: MessageSquareText, title: "You ask", desc: "Type like you'd text a friend, in English or Hinglish. One message can hold several things." },
  { icon: ListChecks, title: "It plans", desc: "Autopilot reads your groups and shows every step: who's in, the amount, each person's exact share." },
  { icon: Fingerprint, title: "You approve", desc: "Edit, reject or approve. Approval is tied to that exact plan, so nothing different can run." },
  { icon: BadgeCheck, title: "It verifies", desc: "Each step runs, is read back from your ledger and saved. Members are notified and apps update live." },
];

const CAPABILITIES = [
  {
    icon: Users,
    title: "Create groups",
    desc: "Trip, flatmates or business. It picks the type from what you say, with the right budget and categories.",
    example: "Create group Manali Trip with Aman",
  },
  {
    icon: UserPlus,
    title: "Add people, with consent",
    desc: "Contacts join directly. Other SplitEase users get an invite to accept. New emails get a join link. Nobody is added silently.",
    example: "Add Priya and riya@mail.com to Flatmates",
  },
  {
    icon: Receipt,
    title: "Split bills exactly",
    desc: "Uses the group's own split, or equal or exact amounts. Leave people out, and the category is guessed for you.",
    example: "Cab 900 equally, leave out Rahul",
  },
  {
    icon: PiggyBank,
    title: "Budgets & alerts",
    desc: "Set a trip budget and alert levels like 75% and 90%. Autopilot checks your spend against them when you ask.",
    example: "Budget 25000, alert me at 75 and 90",
  },
  {
    icon: Scale,
    title: "Who owes whom",
    desc: "Balances for one group or all of them, and the fewest payments that settle everyone. Answers right away.",
    example: "How much do I owe overall?",
  },
  {
    icon: Gauge,
    title: "Spending summaries",
    desc: "Totals, your share, top categories and recent expenses, without opening a single screen.",
    example: "Show the last 5 expenses in Goa Trip",
  },
  {
    icon: Pencil,
    title: "Fix a plan in one line",
    desc: "Change it before approving: amount, people or name. No starting over.",
    example: "make it 4000 · Aman bhi · call it Team dinner",
  },
  {
    icon: Trash2,
    title: "Careful deletes",
    desc: "Delete an expense you paid, or a group you created. Delete plans run alone, in red, and need a tap.",
    example: "Delete the Snacks expense from Goa Trip",
    danger: true,
  },
];

const PROMPT_ROWS = [
  [
    "Create group Goa Trip with Aman and Priya, budget 40000",
    "Dinner 3600 paid by me, split equally",
    "Who owes whom? Show the simplest settle-up",
    "Add riya@mail.com to Flatmates",
    "How much did we spend on food this month?",
  ],
  [
    "Goa trip mein 1500 ka petrol add karo",
    "Rahul ko chhod ke sab mein baant do",
    "Mera total kitna banta hai?",
    "Priya bhi add kar do",
    "Budget 30000 rakho, 90% pe batana",
  ],
];

const SAFETY = [
  { icon: Fingerprint, title: "Approval locks the plan", desc: "Your yes is tied to the exact plan you saw. If anything in it changes, it can't run." },
  { icon: Hourglass, title: "Stale plans stop", desc: "If the group changed after the plan was made, Autopilot stops and asks again. Approvals expire after 24 hours." },
  { icon: Lock, title: "Only you pay", desc: "Expenses are always added as paid by you. It can never log a bill in someone else's name." },
  { icon: UserPlus, title: "No silent adding", desc: "Names only match people you already share a group with. Anyone else needs their exact email and an invite." },
  { icon: Coins, title: "Big amounts need a tap", desc: "At ₹50,000 and above, or for any delete, typing \"yes\" isn't enough. You press the button that names it." },
  { icon: ShieldCheck, title: "Never moves money", desc: "No payments, no confirming debts for you. Settle-ups stay two-sided, like in the app." },
];

const ROADMAP = [
  {
    stage: "Live today",
    tone: "emerald",
    icon: Check,
    items: [
      { title: "Plan, approve, verify", desc: "Every write shows a plan first and is read back after it runs." },
      { title: "Groups, people, budgets", desc: "Create typed groups, add people with consent, set trip budgets." },
      { title: "Bills with exact shares", desc: "Group default split, equal or exact amounts, exclusions, category guess." },
      { title: "Balances & summaries", desc: "Per group or overall, simplest settle-up, recent expenses." },
      { title: "One-line plan edits", desc: "Change amount, people or name before you approve." },
      { title: "Hinglish & questions", desc: "Casual phrasing, and short questions when something is unclear." },
      { title: "Deletes", desc: "Expenses you paid, groups you created, always confirmed." },
      { title: "Web + Android", desc: "Same assistant on the website and in the app, with live updates." },
    ],
  },
  {
    stage: "Building next",
    tone: "amber",
    icon: Construction,
    items: [
      { title: "Undo", desc: "Take back a delete or a mistaken bill right after it runs." },
      { title: "Settle up from chat", desc: "\"I paid Aman back\" recorded as a two-sided settlement." },
      { title: "Edit past expenses", desc: "Fix an amount or split after the bill was added." },
      { title: "Foreign-currency bills", desc: "\"$50 dinner\" converted at a rate you confirm." },
      { title: "Automatic budget alerts", desc: "Push alerts when spend crosses a level, without asking." },
    ],
  },
  {
    stage: "Exploring",
    tone: "white",
    icon: Sparkles,
    items: [
      { title: "Receipt to expense", desc: "Send a bill photo, get a ready plan with the items read." },
      { title: "Monthly bills by chat", desc: "\"Rent 30000 every 1st\" set up as a recurring bill." },
      { title: "Remembers your habits", desc: "Your usual group and split, so asks get even shorter." },
      { title: "Voice", desc: "Say it instead of typing it." },
    ],
  },
];

const FAQ = [
  {
    q: "Which AI runs Autopilot?",
    a: "It works through several AI engines in turn. If one is slow or down, the next one takes over. If none are reachable, a built-in basic mode still understands common requests, and the chat tells you when it's in that mode.",
  },
  {
    q: "Can it make a mistake with my money?",
    a: "It can misread a message, which is why nothing changes until you approve the plan. You see each person's exact share first. After it runs, every step is checked against your ledger and saved, so what you approved is what happened.",
  },
  {
    q: "Does it see my chats or other people's groups?",
    a: "It only reads the groups you're a member of, and only what it needs for your request. Your messages and its replies are not written to our logs.",
  },
  {
    q: "Is it the same as the MCP connector?",
    a: "No. Autopilot lives inside SplitEase and asks for approval in its own plan card. The MCP connector lets ChatGPT, Claude or Gemini use your SplitEase account from their own apps. Both follow the same rules.",
  },
  {
    q: "Why is it marked Beta?",
    a: "Everything listed as live works today, but we're still improving how it understands unusual phrasing and adding the features under Building next. Your existing screens keep working exactly as before.",
  },
];

const FEATURE_PAGES = [
  { label: "AI Expense Splitter", href: "/features/ai-expense-splitter" },
  { label: "Smart Settlements", href: "/features/smart-settlements" },
  { label: "OCR Receipt Scan", href: "/features/ocr-receipt-scan" },
  { label: "Group Chat Hub", href: "/features/group-chat-hub" },
  { label: "QR & Link Invites", href: "/features/qr-invites" },
  { label: "Secure OTP Login", href: "/features/secure-login" },
  { label: "MCP Server", href: "/mcp" },
];

const TONES = {
  emerald: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-400/25", glow: "52,211,153" },
  amber: { dot: "bg-amber-400", text: "text-amber-300", ring: "border-amber-400/25", glow: "251,191,36" },
  white: { dot: "bg-white/50", text: "text-white/60", ring: "border-white/15", glow: "255,255,255" },
};

/* ── building blocks ───────────────────────────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
};

function Eyebrow({ children }) {
  return (
    <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80 sm:text-[11px]">
      <span className="h-px w-6 bg-violet-300/40" />
      {children}
    </p>
  );
}

function SectionTitle({ eyebrow, title, sub }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-serif-premium text-3xl font-normal tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-sm leading-relaxed text-white/50 sm:text-[15px]">{sub}</p>}
    </div>
  );
}

function Marquee({ items, reverse }) {
  const reduced = useReducedMotion();
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <motion.div
        className="flex w-max gap-3"
        animate={reduced ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      >
        {row.map((text, i) => (
          <span
            key={`${text}-${i}`}
            className="whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13px] text-white/65"
          >
            &ldquo;{text}&rdquo;
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function AutopilotFeatureClient() {
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      {/* Hero */}
      <header className="relative px-6 pb-16 pt-28 sm:pt-32">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
          style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(${ACCENT},0.10) 0%, transparent 70%)` }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-300">AI ASSISTANT</span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300">
                Beta
              </span>
            </div>
            <h1 className="font-serif-premium mt-4 text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              Say it once.
              <br />
              <span className="bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-transparent">Autopilot does the rest.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
              Tell SplitEase what you need: a new trip, a bill to split, who owes whom. Autopilot turns it into a clear plan with
              everyone&apos;s exact share, and changes nothing until you approve it.
            </p>

            <ul className="mt-7 space-y-2.5">
              {["Plans groups, people, bills and budgets from one message", "Shows every share before anything changes", "Understands English and Hinglish"].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm font-medium text-white/70">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-300/20 bg-violet-300/10">
                    <Check className="h-3 w-3 text-violet-200" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="clickable inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
              >
                Try Autopilot free
                <ArrowRight size={16} />
              </Link>
              <PlayStoreButton />
            </div>
            <p className="mt-4 text-xs text-white/35">Already have an account? Open any page and tap the Autopilot button.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}>
            <DemoChat />
          </motion.div>
        </div>

        {/* stats */}
        <div className="relative mx-auto mt-20 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] lg:grid-cols-4">
          {STATS.map((st) => (
            <div key={st.label} className="bg-[#07070A] px-6 py-6">
              <p className="font-serif-premium text-3xl text-white sm:text-4xl">{st.value}</p>
              <p className="mt-1.5 text-xs text-white/45">{st.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pt-20 sm:pt-28">
        <SectionTitle eyebrow="How it works" title="Ask, review, approve" sub="The same four steps for every request, so you always know what will happen and what did." />
        <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-[38px] hidden h-px bg-gradient-to-r from-transparent via-violet-300/25 to-transparent lg:block" />
          {FLOW.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                className="relative rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 transition-colors duration-300 hover:border-violet-300/25"
              >
                <div className="flex items-center justify-between">
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/20 bg-[#141019]">
                    <Icon size={18} className="text-violet-200" />
                  </span>
                  <span className="font-serif-premium text-3xl text-white/15">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <SectionTitle
          eyebrow="Live today"
          title="Everything it can do right now"
          sub="Each of these works on the website and in the Android app today. Try the example on any card."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon;
            const rgb = c.danger ? "248,113,113" : ACCENT;
            return (
              <motion.div
                key={c.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: (i % 4) * 0.07, ease: "easeOut" }}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0B0B0F] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-white/20"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `rgba(${rgb},0.18)` }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `rgba(${rgb},0.14)` }}>
                    <Icon size={18} style={{ color: `rgb(${rgb})` }} />
                  </span>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                    Live
                  </span>
                </div>
                <h3 className="relative mt-5 text-[15px] font-bold">{c.title}</h3>
                <p className="relative mt-2 flex-1 text-[13px] leading-relaxed text-white/50">{c.desc}</p>
                <div className="relative mt-5 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Try</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-white/75">&ldquo;{c.example}&rdquo;</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Natural language */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        {/* min-w-0: the marquee rows are wider than the screen on purpose and
            must not stretch the grid columns. */}
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0">
            <SectionTitle
              eyebrow="Talks like you do"
              title="No commands to learn"
              sub="Mix English and Hindi, skip words, put three things in one message. If something is missing, like which Rahul or which group, it asks one short question with tap-to-answer options."
            />
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Languages, label: "English + Hinglish" },
                { icon: MessageSquareText, label: "Asks when unsure" },
                { icon: LifeBuoy, label: "Works if AI is down" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] px-3 py-4 text-center">
                  <Icon size={17} className="mx-auto text-violet-200" />
                  <p className="mt-2 text-[11.5px] font-semibold leading-tight text-white/65">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            <Marquee items={PROMPT_ROWS[0]} />
            <Marquee items={PROMPT_ROWS[1]} reverse />
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Changed your mind? Just say it</p>
              <div className="mt-4 space-y-2.5">
                {[
                  ["make it 4000", "Amount updated to ₹4,000, shares recalculated"],
                  ["Rahul ko hata do", "Rahul removed, now split between 3"],
                  ["call it Team dinner", "Renamed, everything else kept"],
                ].map(([say, result]) => (
                  <div key={say} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-black">{say}</span>
                    <ArrowRight size={13} className="hidden shrink-0 text-white/25 sm:block" />
                    <span className="text-[12.5px] text-white/55">{result}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#08080B] p-6 sm:p-10">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "rgba(52,211,153,0.10)" }}
          />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow="Built to be trusted"
              title="Nothing happens without your yes"
              sub="Autopilot follows every rule the app does, plus a few extra ones because it's an AI."
            />
            <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200 lg:self-auto">
              <ShieldCheck size={14} /> No automatic payments. No surprises.
            </div>
          </div>
          <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY.map((sf, i) => {
              const Icon = sf.icon;
              return (
                <motion.div
                  key={sf.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.07 }}
                  className="rounded-2xl border border-white/[0.07] bg-black/40 p-5 transition-colors duration-300 hover:border-emerald-400/25"
                >
                  <Icon size={18} className="text-emerald-300" />
                  <h3 className="mt-4 text-sm font-bold">{sf.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{sf.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <SectionTitle
          eyebrow="Roadmap"
          title="What's done, and what's next"
          sub="An honest view of where Autopilot is. Anything not under Live today isn't built yet, and we'll update this page as it ships."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {ROADMAP.map((col, ci) => {
            const tone = TONES[col.tone];
            const StageIcon = col.icon;
            return (
              <motion.div
                key={col.stage}
                {...fadeUp}
                transition={{ duration: 0.55, delay: ci * 0.1 }}
                className={`relative overflow-hidden rounded-3xl border bg-[#0B0B0F] p-6 ${tone.ring}`}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl"
                  style={{ background: `rgba(${tone.glow},0.08)` }}
                />
                <div className="relative flex items-center justify-between">
                  <p className={`flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] ${tone.text}`}>
                    <span className={`h-2 w-2 rounded-full ${tone.dot} ${col.tone === "amber" ? "animate-pulse" : ""}`} />
                    {col.stage}
                  </p>
                  <span className="text-xs text-white/30">{col.items.length}</span>
                </div>
                <ul className="relative mt-6 space-y-4">
                  {col.items.map((it) => (
                    <li key={it.title} className="flex gap-3">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${tone.ring}`}>
                        <StageIcon size={11} className={tone.text} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white/90">{it.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/45">{it.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* MCP cross-link */}
      <section className="mx-auto max-w-6xl px-6 pt-20">
        <Link
          href="/mcp"
          className="clickable group flex flex-col gap-4 rounded-3xl border border-white/[0.08] bg-gradient-to-r from-[#0B0B0F] to-[#0d1418] p-6 transition-colors duration-300 hover:border-cyan-400/30 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
              <Plug size={18} className="text-cyan-300" />
            </span>
            <div>
              <p className="text-base font-bold">Prefer ChatGPT, Claude or Gemini?</p>
              <p className="mt-1 text-sm text-white/50">Connect SplitEase to your own AI assistant with the MCP server. Same rules, your favourite chat app.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            Connect your assistant <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pt-24 sm:pt-32">
        <SectionTitle eyebrow="Questions" title="Good to know" />
        <div className="mt-8 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.08] bg-[#0B0B0F]">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="clickable flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-white/85">
                {f.q}
                <ChevronDown size={16} className="shrink-0 text-white/35 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[13.5px] leading-relaxed text-white/50">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0B0B0F] px-6 py-14 text-center sm:px-12">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(50% 80% at 50% 0%, rgba(${ACCENT},0.18), transparent 70%)` }}
          />
          <Bot size={28} className="relative mx-auto text-violet-200" />
          <h2 className="font-serif-premium relative mx-auto mt-5 max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
            Your next trip, planned in one message
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-white/50">Free to use. Open Autopilot from any page once you&apos;re signed in.</p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="clickable inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
            >
              Get started for free <ArrowRight size={16} />
            </Link>
            <PlayStoreButton />
          </div>
        </div>

        <div className="mt-16 border-t border-white/[0.08] pt-8">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Explore more features</p>
          <nav className="flex flex-wrap gap-2.5">
            {FEATURE_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="clickable inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-white/60 transition-all duration-200 hover:border-violet-300/30 hover:text-white"
              >
                {page.label}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <Footer />
    </div>
  );
}
