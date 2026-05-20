"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Bot,
  Check,
  Clipboard,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  WalletCards,
  UsersRound,
  ReceiptText,
  Lightbulb,
  Square,
  ChevronRight,
  Zap,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Compass,
  ArrowUpRight,
  LineChart,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

/* ─── Premium Suggestions / Insights ─────────────────────────────── */
const QUICK_PROMPTS = [
  {
    icon: WalletCards,
    title: "Trip spend analysis",
    subtitle: "Complete cross-group spend metrics",
    prompt: "How much did I spend across my recent groups?",
    color: "from-violet-500/20 to-indigo-500/20",
    border: "group-hover:border-violet-500/40",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
  },
  {
    icon: ReceiptText,
    title: "Expense distribution",
    subtitle: "Breakdown by category and shares",
    prompt: "Summarize my latest expenses by category.",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "group-hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    icon: UsersRound,
    title: "Smart debt simplification",
    subtitle: "Cross-group optimized balances",
    prompt: "Who owes money in my active groups?",
    color: "from-orange-500/20 to-amber-500/20",
    border: "group-hover:border-orange-500/40",
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
  },
  {
    icon: Lightbulb,
    title: "Trip budget planning",
    subtitle: "Interactive travel forecaster",
    prompt: "Suggest a simple budget plan for my next trip.",
    color: "from-pink-500/20 to-rose-500/20",
    border: "group-hover:border-pink-500/40",
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/10",
  },
];

/* ─── Interactive Intelligence Hub ─────────────────────────────── */
const CAPABILITIES = [
  { name: "Debt simplification", active: true },
  { name: "Anomalies detection", active: true },
  { name: "Forecast & planning", active: true },
];

/* ─── Root Page ───────────────────────────────────────────────────── */
export default function AiPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const scrollAreaRef = useRef(null);
  const abortRef = useRef(null);

  const totalQuestions = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );
  const canSend = prompt.trim().length > 0 && !loading;

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const askAI = useCallback(
    async (currentPrompt = prompt) => {
      const trimmed = currentPrompt.trim();
      if (!trimmed || loading) return;

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: trimmed },
      ]);
      setPrompt("");
      setLoading(true);
      setLastPrompt(trimmed);

      try {
        const res = await api.post("/ai/query", { prompt: trimmed }, { signal: ctrl.signal });
        const text = res.data?.text || "I couldn't generate a response for that.";
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "ai", content: text },
        ]);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        const errText = err.response?.data?.message || "SplitEase AI is unavailable right now.";
        toast.error(errText, { duration: 4000 });
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "ai", content: errText, error: true },
        ]);
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setLoading(false);
      }
    },
    [prompt, loading]
  );

  const stopRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setPrompt("");
    setLoading(false);
  }, []);

  return (
    <div className="relative flex bg-[#030303] overflow-hidden select-none" style={{ height: "calc(100vh - 70px)" }}>
      
      {/* Ambient Neon Background Meshes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/8 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-[300px] xl:w-[320px] shrink-0 flex-col border-r border-white/[0.04] bg-[#09090b]/70 backdrop-blur-xl relative z-10">
        
        {/* Sidebar Header */}
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/10">
              <Cpu size={18} className="text-white" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-white tracking-tight leading-tight flex items-center gap-1.5">
                SplitEase Core
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  PRO
                </span>
              </p>
              <p className="text-[11px] text-[#8e8e93] mt-0.5">Gemini 3.5 Analytical Suite</p>
            </div>
          </div>
        </div>

        {/* Live System Diagnostics / Widgets */}
        <div className="px-4 py-4 space-y-4 border-b border-white/[0.03] bg-white/[0.01]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#8e8e93] px-1">
            System Diagnostics
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<MessageSquare size={12} className="text-indigo-400" />}
              label="Inquiries"
              value={totalQuestions}
              accent="indigo"
            />
            <StatCard
              icon={loading ? <Loader2 size={12} className="animate-spin text-amber-400" /> : <ShieldCheck size={12} className="text-emerald-400" />}
              label="Processor"
              value={loading ? "Analyzing..." : "Standby"}
              accent={loading ? "amber" : "emerald"}
            />
          </div>

          {/* Core Analytics Status */}
          <div className="rounded-xl border border-white/[0.03] bg-black/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-medium text-[#8e8e93]">
              <span>INTELLIGENCE CAPABILITIES</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE
              </span>
            </div>
            <div className="space-y-1.5">
              {CAPABILITIES.map((cap) => (
                <div key={cap.name} className="flex items-center justify-between text-[11px] text-white/70">
                  <span className="flex items-center gap-1.5 text-[#a1a1aa]">
                    <span className="h-1 w-1 rounded-full bg-indigo-500" />
                    {cap.name}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/5 px-1.5 py-0.2 rounded border border-indigo-500/10">PRO</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Actions list */}
        <div className="px-4 py-4 flex-1 overflow-y-auto custom-scrollbar space-y-1.5 relative">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#8e8e93] px-1 mb-2">
            Intelligence Modules
          </p>
          {QUICK_PROMPTS.map(({ icon: Icon, title, subtitle, prompt: qp, iconColor, iconBg, border }) => (
            <button
              key={title}
              type="button"
              onClick={() => askAI(qp)}
              disabled={loading}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.03] hover:shadow-[0_2px_12px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor} shadow-inner`}>
                <Icon size={14} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-semibold text-white group-hover:text-indigo-400 transition-colors leading-tight">{title}</span>
                <span className="block text-[10px] text-[#8e8e93] truncate mt-0.5">{subtitle}</span>
              </span>
              <ChevronRight size={12} className="text-white/20 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50" />
            </button>
          ))}
        </div>

        {/* Tip panel */}
        <div className="p-4 border-t border-white/[0.03]">
          <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 px-3.5 py-3 shadow-[inset_0_1px_12px_rgba(99,102,241,0.05)]">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Dynamic context</span>
            </div>
            <p className="text-[11px] text-[#8e8e93] leading-relaxed">
              Real-time cross-group simplifications are calculated live based on current ledgers.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <section className="flex flex-1 min-w-0 flex-col bg-[#09090b]/40 backdrop-blur-xl relative z-10">
        
        {/* Terminal Header */}
        <div className="shrink-0 h-14 flex items-center justify-between gap-3 border-b border-white/[0.04] bg-[#09090b]/60 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile icon */}
            <div className="flex lg:hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
              <Cpu size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-white tracking-tight">Intelligence Console</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse hidden sm:inline-block" />
              </div>
              <p className="text-[10px] text-[#8e8e93] truncate hidden sm:block">
                Query model with complete chronological, categorical, and transaction contexts
              </p>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-2">
            {lastPrompt && !loading && (
              <button
                type="button"
                onClick={() => askAI(lastPrompt)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] text-[11px] font-semibold text-[#8e8e93] hover:text-white transition-all"
              >
                <RefreshCw size={11} />
                Retry Last
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-red-500/10 hover:border-red-500/20 text-[11px] font-semibold text-[#8e8e93] hover:text-red-400 transition-all"
              >
                <Trash2 size={11} />
                Reset Chat
              </button>
            )}
          </div>
        </div>

        {/* Message Threads */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 md:px-8 xl:px-12"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.length === 0 && !loading ? (
              <EmptyState key="empty" onSuggestionClick={askAI} />
            ) : (
              <motion.div
                key="chat-thread"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto flex max-w-3xl flex-col gap-6"
              >
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                {loading && <ThinkingBubble onStop={stopRequest} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced Commander Input Box */}
        <PromptInput
          prompt={prompt}
          setPrompt={setPrompt}
          askAI={askAI}
          loading={loading}
          canSend={canSend}
          onStop={stopRequest}
        />
      </section>
    </div>
  );
}

/* ─── Premium Stat Card ───────────────────────────────────────────── */
const ACCENT_MAP = {
  indigo: { text: "text-indigo-400", bg: "bg-indigo-500/5", border: "border-indigo-500/20" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/20" },
};

function StatCard({ icon, label, value, accent }) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.indigo;
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-3 transition-all duration-200 hover:bg-white/[0.02]`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">{label}</span>
      </div>
      <p className="text-[13px] font-bold text-white truncate font-mono">{value}</p>
    </div>
  );
}

/* ─── Chat Bubble ─────────────────────────────────────────────────── */
function ChatBubble({ message }) {
  const isUser = message.role === "user";
  const isError = !!message.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex items-start gap-4.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Bot Avatar */}
      {!isUser && (
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-white/10 mt-1">
          <Bot size={14} className="text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[85%] md:max-w-[76%]`}>
        <span className="text-[10px] font-semibold text-[#8e8e93] px-1 tracking-wider uppercase font-mono">
          {isUser ? "USER CONSOLE" : "CORE INTELLIGENCE"}
        </span>

        <div
          className={`px-5 py-4 rounded-2xl text-[14px] leading-relaxed shadow-lg backdrop-blur-md relative overflow-hidden
            ${isUser
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-[0_4px_20px_rgba(99,102,241,0.15)] border border-indigo-400/20"
              : isError
              ? "bg-red-500/5 border border-red-500/20 text-red-200 rounded-bl-sm"
              : "bg-white/[0.02] border border-white/[0.04] text-[#e1e1e6] rounded-bl-sm"
            }`}
        >
          {isError && (
            <div className="flex items-center gap-1.5 mb-2 text-red-400">
              <AlertTriangle size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Operational Fault</span>
            </div>
          )}
          <FormattedText text={message.content} isUser={isUser} />
          {!isUser && (
            <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center justify-between">
              <CopyBtn text={message.content} />
              <span className="text-[9px] font-mono text-[#8e8e93]">SplitEase AI Core v3.5</span>
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-bold text-white shadow-md mt-1">
          U
        </div>
      )}
    </motion.div>
  );
}

/* ─── Custom Premium Markdown Parser ─── */
function parseInlineMarkdown(text, isUser) {
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className={`font-bold ${isUser ? "text-white" : "text-white font-bold tracking-wide"}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index} className="italic opacity-90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${
            isUser ? "bg-white/20 text-white" : "bg-[#111] text-indigo-400 border border-white/[0.06]"
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function FormattedText({ text, isUser }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2.5 select-text">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className={`pl-4 border-l-2 py-1.5 px-3 rounded-r-xl my-2 text-[13px] ${
                isUser
                  ? "border-white/50 bg-white/10 text-white/90"
                  : "border-indigo-500 bg-indigo-500/5 text-[#8e8e93]"
              }`}
            >
              {parseInlineMarkdown(trimmed.slice(2), isUser)}
            </blockquote>
          );
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className={`font-bold text-[14px] mt-4 mb-1.5 tracking-tight ${isUser ? "text-white" : "text-indigo-400"}`}>
              {parseInlineMarkdown(trimmed.slice(4), isUser)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          const sliceIndex = trimmed.startsWith("## ") ? 3 : 2;
          return (
            <h3
              key={i}
              className={`font-bold text-[15px] mt-5 mb-2.5 pb-1.5 border-b ${
                isUser ? "text-white border-white/25" : "text-white border-white/[0.04]"
              }`}
            >
              {parseInlineMarkdown(trimmed.slice(sliceIndex), isUser)}
            </h3>
          );
        }

        // Lists
        if (trimmed.match(/^[•\-\*] /)) {
          return (
            <div key={i} className="flex items-start gap-2.5 pl-2 my-0.5">
              <span
                className={`mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full ${
                  isUser ? "bg-white/60" : "bg-indigo-500 animate-pulse"
                }`}
              />
              <span className="whitespace-pre-wrap break-words leading-relaxed">
                {parseInlineMarkdown(trimmed.slice(2), isUser)}
              </span>
            </div>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">
            {parseInlineMarkdown(line, isUser)}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Copy Button ─────────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy text");
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all duration-150 border
        ${copied
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          : "bg-white/[0.02] border-white/[0.04] text-[#8e8e93] hover:text-white hover:bg-white/[0.04]"
        }`}
    >
      {copied ? <Check size={10} /> : <Clipboard size={10} />}
      {copied ? "Copied!" : "Copy ledger"}
    </button>
  );
}

/* ─── Thinking Bubble ─────────────────────────────────────────────── */
function ThinkingBubble({ onStop }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="flex items-start gap-4.5"
    >
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-white/10 mt-1">
        <Bot size={14} className="text-white" />
        <span className="absolute -inset-0.5 rounded-xl animate-ping bg-indigo-500/20" />
      </div>

      <div className="flex flex-col gap-1.5 items-start">
        <span className="text-[10px] font-semibold text-[#8e8e93] px-1 tracking-wider uppercase font-mono">
          CORE INTELLIGENCE
        </span>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl rounded-bl-sm px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
                  className="block h-2.5 w-2.5 rounded-full bg-indigo-500"
                />
              ))}
            </div>
            <span className="text-[12px] font-mono text-[#8e8e93]">Analyzing ledger parameters...</span>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] font-semibold text-[#8e8e93] hover:text-white transition-all"
            >
              <Square size={8} className="fill-current" />
              Abort
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────── */
function EmptyState({ onSuggestionClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-6 text-center"
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/10 relative z-10">
          <Cpu size={28} className="text-white" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-3xl bg-indigo-500/30 blur-2xl z-0"
        />
      </div>

      <h2 className="text-2xl font-black text-white mb-2 tracking-tight">SplitEase Intelligence Console</h2>
      <p className="text-[13px] text-[#8e8e93] max-w-sm leading-relaxed mb-8">
        Unlock real-time cross-group debt optimizations, budget anomaly tracking, and advanced cost simulations.
      </p>

      {/* Suggested prompts list */}
      <div className="w-full grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_PROMPTS.map(({ icon: Icon, title, subtitle, prompt, iconColor, iconBg, border, color }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSuggestionClick(prompt)}
            className={`group relative flex items-center gap-3.5 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 text-left transition-all duration-300 hover:bg-white/[0.03] hover:border-indigo-500/20 hover:shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 active:translate-y-0`}
          >
            {/* Background Hover Glow */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />

            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} border border-white/[0.03]`}>
              <Icon size={16} />
            </span>
            <span className="flex-1 min-w-0 relative z-10">
              <span className="block text-[13px] font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">{title}</span>
              <span className="block text-[11px] text-[#8e8e93] mt-0.5 leading-normal">{subtitle}</span>
            </span>
            <ArrowUpRight size={14} className="shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-400 relative z-10" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Premium Commander Input Box ─── */
function PromptInput({ prompt, setPrompt, askAI, loading, canSend, onStop }) {
  const textareaRef = useRef(null);
  const charCount = prompt.length;
  const MAX = 1200;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI(prompt);
    }
  };

  const pct = (charCount / MAX) * 100;
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-indigo-500";

  return (
    <div className="shrink-0 border-t border-white/[0.04] bg-[#09090b]/40 backdrop-blur-md px-4 py-4 md:px-8 xl:px-12">
      <div className="mx-auto max-w-3xl">
        
        {/* Commander panel */}
        <div
          className={`rounded-2xl border bg-black/60 shadow-2xl relative overflow-hidden transition-all duration-300 ${
            loading
              ? "border-white/[0.02]"
              : "border-white/[0.04] focus-within:border-indigo-500/30 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.06)]"
          }`}
        >
          {/* Neon inner edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

          {/* Commander Badge */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-white/[0.02] bg-white/[0.01]">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest">COMMANDER MODULE v3.5</span>
            </div>
            <span className="text-[9px] font-mono text-[#8e8e93]">SYSTEM SECURE</span>
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask about spent trends, cross-group balances, anomalies, or planning..."
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[13.5px] leading-relaxed text-white outline-none placeholder:text-[#8e8e93]/50 disabled:opacity-40 custom-scrollbar"
            style={{ minHeight: "50px", maxHeight: "160px" }}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-3 border-t border-white/[0.01]">
            {/* Char progress */}
            <div className="flex items-center gap-2.5">
              <div className="h-0.5 w-12 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barColor}`}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-[10px] text-[#8e8e93] font-mono tabular-nums">
                {charCount}<span className="opacity-30">/{MAX}</span>
              </span>
              <span className="hidden sm:block text-[9px] text-[#8e8e93]/40 font-mono">
                [Enter] Send · [Shift+Enter] Line
              </span>
            </div>

            {/* Action buttons */}
            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/[0.04] bg-white/[0.02] text-[12px] font-semibold text-[#8e8e93] hover:text-white transition-all shadow-md"
              >
                <Square size={10} className="fill-current text-red-500 animate-pulse" />
                Abort
              </button>
            ) : (
              <button
                type="button"
                onClick={() => askAI(prompt)}
                disabled={!canSend}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide transition-all duration-200 shadow-lg
                  ${canSend
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:-translate-y-px active:translate-y-0 border border-white/10"
                    : "bg-white/[0.01] text-white/20 cursor-not-allowed border border-white/[0.02]"
                  }`}
              >
                <Send size={12} />
                ENGAGE
              </button>
            )}
          </div>
        </div>

        {/* Console footer */}
        <p className="mt-2.5 text-center text-[9px] font-mono text-[#8e8e93]/40 tracking-wider">
          SYSTEM STATUS: ONLINE · SECURITY LEVEL: ELEVATED · CONTEXT WINDOW: MAXIMUM
        </p>
      </div>
    </div>
  );
}
