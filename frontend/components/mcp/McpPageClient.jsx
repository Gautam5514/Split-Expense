"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Plug,
  ShieldCheck,
  Sparkles,
  Wallet,
  Users,
  Receipt,
  UserPlus,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { API_URL } from "@/lib/config";
import toast from "@/lib/toast";

/* The MCP page: one link, pasted into an AI assistant, connects SplitEase.
   Sign-in happens inside the assistant's own OAuth window (the normal
   SplitEase login), so this page itself needs no login or token. */

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || `${API_URL}/mcp`;

/* ── Brand marks (simplified, drawn inline so there are no image requests) ── */

function ClaudeMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g stroke="#D97757" strokeWidth="2.4" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="12"
            y1={i % 2 ? 5.2 : 3}
            x2="12"
            y2="9"
            transform={`rotate(${i * 30} 12 12)`}
          />
        ))}
      </g>
    </svg>
  );
}

function ChatGPTMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round">
      {Array.from({ length: 6 }).map((_, i) => (
        <path
          key={i}
          d="M12 2.6c1.7 0 3 1.2 3 2.7v3.4L12 10.4 9 8.7V5.3c0-1.5 1.3-2.7 3-2.7Z"
          transform={`rotate(${i * 60} 12 12)`}
        />
      ))}
    </svg>
  );
}

function GeminiMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gem-grad" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4285F4" />
          <stop offset="0.55" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path fill="url(#gem-grad)" d="M12 1.5C12.6 7.6 16.4 11.4 22.5 12 16.4 12.6 12.6 16.4 12 22.5 11.4 16.4 7.6 12.6 1.5 12 7.6 11.4 11.4 7.6 12 1.5Z" />
    </svg>
  );
}

const ASSISTANTS = [
  {
    id: "claude",
    name: "Claude",
    maker: "Anthropic",
    Mark: ClaudeMark,
    glow: "bg-orange-500/15",
    accent: "text-orange-300",
    activeBorder: "border-orange-400/40",
    steps: [
      "Open Claude and go to Settings, then Connectors.",
      "Click Add custom connector.",
      "Name it SplitEase and paste the link you copied above.",
      "Click Add, then Connect, and sign in to SplitEase in the window that opens.",
    ],
    note: "Custom connectors are available on Claude's web and desktop apps.",
    href: "https://claude.ai/settings/connectors",
    cta: "Open Claude connectors",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    maker: "OpenAI",
    Mark: ChatGPTMark,
    glow: "bg-emerald-500/15",
    accent: "text-emerald-300",
    activeBorder: "border-emerald-400/40",
    steps: [
      "Open ChatGPT and go to Settings, then Connectors.",
      "Under Advanced, turn on Developer mode.",
      "Click Create, name it SplitEase and paste the link you copied above.",
      "Choose OAuth for authentication, save, then sign in to SplitEase when asked.",
    ],
    note: "Custom connectors need a ChatGPT plan that includes Developer mode.",
    href: "https://chatgpt.com/#settings/Connectors",
    cta: "Open ChatGPT settings",
  },
  {
    id: "gemini",
    name: "Gemini",
    maker: "Google",
    Mark: GeminiMark,
    glow: "bg-blue-500/15",
    accent: "text-blue-300",
    activeBorder: "border-blue-400/40",
    steps: [
      "Install Gemini CLI if you have not already.",
      "Run the command below in your terminal.",
      "Start gemini and type /mcp to check that splitease is listed.",
      "Follow the sign-in link it shows, then ask your first question.",
    ],
    command: `gemini mcp add --transport http splitease ${MCP_URL}`,
    note: "The Gemini mobile and web apps do not accept custom MCP servers yet. Gemini CLI does.",
    href: "https://github.com/google-gemini/gemini-cli",
    cta: "Get Gemini CLI",
  },
];

const CAPABILITIES = [
  { icon: Users, title: "Your groups", desc: "List every group you are in and who is in them." },
  { icon: Wallet, title: "Balances", desc: "See who owes whom, in one group or across all of them." },
  { icon: Receipt, title: "Recent expenses", desc: "Pull the latest expenses from any group, with amounts and payers." },
  { icon: UserPlus, title: "Create groups", desc: "Ask for a new group by name and it is ready in the app." },
];

const PROMPTS = [
  "How much do I owe across all my groups?",
  "Show the last 5 expenses in my Goa trip group",
  "Create a group called Flatmates",
  "Who still has to settle up in the roommates group?",
];

const TRUST = [
  { icon: KeyRound, title: "Normal sign-in", desc: "You log in on the SplitEase page, as always. Your password never reaches the assistant." },
  { icon: ShieldCheck, title: "Short-lived access", desc: "Access tokens expire after an hour and refresh in the background." },
  { icon: Plug, title: "Disconnect any time", desc: "Remove the connector in your assistant and its access stops." },
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
};

function Eyebrow({ children }) {
  return (
    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px]">
      {children}
    </p>
  );
}

function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = async (key, text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success(message);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      toast.error("Copy failed. Select the text and copy it manually.");
    }
  };
  return [copied, copy];
}

export default function McpPageClient() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState("claude");
  const [copied, copy] = useCopy();
  const current = ASSISTANTS.find((a) => a.id === active);
  const float = (delay) =>
    reducedMotion
      ? {}
      : { animate: { y: [0, -14, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#030303] text-white">
      <SmoothScroll />

      {/* Hero */}
      <header className="relative px-6 pb-16 pt-28 text-center sm:pt-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[130px]" />
        <motion.img
          src="/stone-left.webp"
          alt=""
          {...float(0)}
          className="pointer-events-none absolute -left-10 top-36 hidden w-44 -rotate-12 opacity-70 lg:block xl:left-16"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />
        <motion.img
          src="/stone-right.webp"
          alt=""
          {...float(1.4)}
          className="pointer-events-none absolute -right-14 top-48 hidden w-64 rotate-12 opacity-70 lg:block xl:right-10"
          style={{ maskImage: "linear-gradient(180deg, black 55%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 55%, transparent)" }}
        />

        <Eyebrow>SplitEase MCP Server</Eyebrow>
        <h1 className="font-serif-premium relative z-10 mx-auto max-w-4xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Connect SplitEase to your favourite AI
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/60 sm:text-base">
          Paste one link into Claude, ChatGPT or Gemini, sign in once, and ask about your groups, balances and expenses in plain language.
        </p>

        {/* Assistant logos */}
        <div className="relative z-10 mx-auto mt-9 flex items-center justify-center gap-3 sm:gap-4">
          {ASSISTANTS.map(({ id, name, Mark, glow }) => (
            <button
              key={id}
              onClick={() => {
                setActive(id);
                document.getElementById("connect")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              aria-label={`Connect ${name}`}
              className="clickable group relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#0B0B0F] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 sm:h-[72px] sm:w-[72px]"
            >
              <span className={`pointer-events-none absolute inset-2 rounded-full ${glow} blur-xl`} />
              <Mark className="relative h-8 w-8 sm:h-9 sm:w-9" />
            </button>
          ))}
        </div>

        {/* Copy link bar */}
        <div className="relative z-10 mx-auto mt-8 max-w-xl">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0B0B0F] p-1.5 pl-5 shadow-2xl">
            <Plug size={15} className="shrink-0 text-cyan-400" />
            <code className="min-w-0 flex-1 truncate text-left font-mono text-xs text-white/75 sm:text-sm">{MCP_URL}</code>
            <button
              onClick={() => copy("url", MCP_URL, "MCP link copied. Paste it into your assistant.")}
              className="clickable inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
            >
              {copied === "url" ? <Check size={15} /> : <Copy size={15} />}
              {copied === "url" ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">
            Free · No token to copy · Sign in inside your assistant
          </p>
        </div>
      </header>

      {/* Connect guide */}
      <section id="connect" className="mx-auto max-w-5xl scroll-mt-24 px-6 pt-8 sm:pt-12">
        <Eyebrow>How to connect</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Pick your assistant, paste the link
        </h2>

        <div className="mt-10 grid gap-5 lg:grid-cols-[260px_1fr]">
          <div role="tablist" aria-label="Assistant" className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
            {ASSISTANTS.map(({ id, name, maker, Mark, activeBorder }) => {
              const on = id === active;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(id)}
                  className={`clickable flex min-w-[170px] flex-1 items-center gap-3 rounded-2xl border p-4 text-left transition-colors duration-300 lg:flex-none ${
                    on ? `${activeBorder} bg-white/[0.05]` : "border-white/[0.08] bg-[#0B0B0F] hover:border-white/20"
                  }`}
                >
                  <Mark className="h-7 w-7 shrink-0" />
                  <span>
                    <span className="block text-sm font-bold text-white">{name}</span>
                    <span className="block text-[11px] text-white/40">{maker}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 sm:p-8">
            <div className={`pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full blur-3xl ${current.glow}`} />
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative"
              >
                <div className="flex items-center gap-3">
                  <current.Mark className="h-8 w-8" />
                  <h3 className="text-xl font-bold">Connect {current.name}</h3>
                </div>

                <ol className="mt-6 space-y-4">
                  {current.steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-white/65">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-[11px] font-bold text-white/70">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                {current.command && (
                  <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-black/50 p-3">
                    <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-cyan-200/90">
                      {current.command}
                    </code>
                    <button
                      onClick={() => copy("cmd", current.command, "Command copied.")}
                      aria-label="Copy command"
                      className="clickable shrink-0 rounded-lg border border-white/10 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {copied === "cmd" ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}

                <p className="mt-5 text-xs leading-relaxed text-white/40">{current.note}</p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => copy("url", MCP_URL, "MCP link copied. Paste it into your assistant.")}
                    className="clickable inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
                  >
                    {copied === "url" ? <Check size={15} /> : <Copy size={15} />}
                    {copied === "url" ? "Copied" : "Copy MCP link"}
                  </button>
                  <a
                    href={current.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`clickable inline-flex items-center gap-1.5 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.06] ${current.accent}`}
                  >
                    {current.cta}
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* What you can do */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <Eyebrow>What you can do</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          Ask about your money, in your own words
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: (i % 4) * 0.08, ease: "easeOut" }}
              className="group rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 transition-colors duration-300 hover:border-cyan-400/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 transition-transform duration-300 group-hover:scale-110">
                <item.icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp} className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6 sm:p-8">
          <p className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            <Sparkles size={13} className="text-cyan-400" />
            Try asking
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => copy(q, q, "Question copied.")}
                className="clickable group flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <span>&ldquo;{q}&rdquo;</span>
                {copied === q ? (
                  <Check size={14} className="shrink-0 text-emerald-300" />
                ) : (
                  <Copy size={14} className="shrink-0 text-white/25 group-hover:text-white/60" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-6 pt-24 sm:pt-32">
        <Eyebrow>Safe by design</Eyebrow>
        <h2 className="font-serif-premium max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
          You stay in control of the connection
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TRUST.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              className="rounded-2xl border border-white/[0.08] bg-[#0B0B0F] p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <item.icon size={18} />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-white/35">
          <CheckCircle2 size={14} className="text-emerald-400/70" />
          Need an account first?{" "}
          <Link href="/register" className="font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline">
            Sign up free
          </Link>
        </p>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-6 pb-28 pt-24 text-center sm:pt-32">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-900/10 blur-[120px]" />
        <h2 className="font-serif-premium mx-auto max-w-2xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
          One link. Every assistant.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium text-white/50 sm:text-base">
          Copy the link, paste it into your assistant and start asking.
        </p>
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => copy("url", MCP_URL, "MCP link copied. Paste it into your assistant.")}
            className="clickable inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.03]"
          >
            {copied === "url" ? <Check size={16} /> : <Copy size={16} />}
            {copied === "url" ? "Copied" : "Copy MCP link"}
          </button>
          <button
            onClick={() => router.push("/platforms")}
            className="clickable inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm font-bold text-white/80 transition-colors hover:bg-white/[0.06]"
          >
            All platforms
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
