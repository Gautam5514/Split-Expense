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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

/* ─── Quick Prompts ───────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  {
    icon: WalletCards,
    title: "Trip spend",
    subtitle: "Across all groups",
    prompt: "How much did I spend across my recent groups?",
    border: "border-violet-500/20 hover:border-violet-500/40",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/15",
    dot: "bg-violet-400",
  },
  {
    icon: ReceiptText,
    title: "Expense summary",
    subtitle: "By category",
    prompt: "Summarize my latest expenses by category.",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    dot: "bg-emerald-400",
  },
  {
    icon: UsersRound,
    title: "Who owes what",
    subtitle: "Active balances",
    prompt: "Who owes money in my active groups?",
    border: "border-orange-500/20 hover:border-orange-500/40",
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/15",
    dot: "bg-orange-400",
  },
  {
    icon: Lightbulb,
    title: "Budget planner",
    subtitle: "AI suggestions",
    prompt: "Suggest a simple budget plan for my next trip.",
    border: "border-pink-500/20 hover:border-pink-500/40",
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/15",
    dot: "bg-pink-400",
  },
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
    /* Full remaining viewport height after the 70px navbar */
    <div className="flex bg-background overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[280px] xl:w-[300px] shrink-0 flex-col border-r border-border/60">

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Sparkles size={16} className="text-white" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground tracking-tight leading-tight">SplitEase AI</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Powered by Gemini</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-4 grid grid-cols-2 gap-2 border-b border-border/40">
          <StatCard
            icon={<MessageSquare size={12} />}
            label="Questions"
            value={totalQuestions}
            accent="indigo"
          />
          <StatCard
            icon={loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            label="Status"
            value={loading ? "Thinking…" : "Ready"}
            accent={loading ? "amber" : "emerald"}
          />
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-4 flex-1 overflow-y-auto custom-scrollbar space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Quick Prompts
          </p>
          {QUICK_PROMPTS.map(({ icon: Icon, title, subtitle, prompt: qp, iconColor, iconBg, dot }) => (
            <button
              key={title}
              type="button"
              onClick={() => askAI(qp)}
              disabled={loading}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted/50 border border-transparent hover:border-border/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
                <Icon size={14} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-semibold text-foreground leading-tight">{title}</span>
                <span className="block text-[11px] text-muted-foreground">{subtitle}</span>
              </span>
              <ChevronRight size={12} className="text-muted-foreground/30 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
            </button>
          ))}
        </div>

        {/* Tip */}
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={11} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Pro tip</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Mention group names or date ranges for more precise answers.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main Chat ─────────────────────────────────────────────── */}
      <section className="flex flex-1 min-w-0 flex-col bg-background">

        {/* Slim top bar — actions only, no redundant title */}
        <div className="shrink-0 h-12 flex items-center justify-between gap-3 border-b border-border/60 bg-card/60 backdrop-blur-sm px-4">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold text-foreground">SplitEase AI</span>
          </div>

          {/* Desktop: subtle model badge */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[12px] text-muted-foreground font-medium">
              {loading ? "Generating response…" : `${totalQuestions} question${totalQuestions !== 1 ? "s" : ""} asked`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {lastPrompt && !loading && (
              <button
                type="button"
                onClick={() => askAI(lastPrompt)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages scroll area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 md:px-8 md:py-6"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.length === 0 && !loading ? (
              <EmptyState key="empty" onSuggestionClick={askAI} />
            ) : (
              <motion.div
                key="msgs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto flex max-w-2xl flex-col gap-5"
              >
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                {loading && <ThinkingBubble onStop={stopRequest} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
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

/* ─── Stat Card ───────────────────────────────────────────────────── */
const ACCENT_MAP = {
  indigo: { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

function StatCard({ icon, label, value, accent }) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.indigo;
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} px-3 py-2.5`}>
      <div className={`flex items-center gap-1 ${a.text} mb-1`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-[13px] font-bold ${a.text} truncate`}>{value}</p>
    </div>
  );
}

/* ─── Chat Bubble ─────────────────────────────────────────────────── */
function ChatBubble({ message }) {
  const isUser = message.role === "user";
  const isError = !!message.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25 mb-0.5">
          <Bot size={13} className="text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[80%] md:max-w-[70%]`}>
        <span className="text-[10px] font-semibold text-muted-foreground px-1">
          {isUser ? "You" : "SplitEase AI"}
        </span>

        <div
          className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-indigo-500/20"
              : isError
              ? "bg-red-500/8 border border-red-500/25 text-foreground rounded-bl-sm"
              : "bg-card border border-border/70 text-foreground rounded-bl-sm"
            }`}
        >
          {isError && (
            <div className="flex items-center gap-1.5 mb-2 text-red-400">
              <AlertTriangle size={12} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Error</span>
            </div>
          )}
          <FormattedText text={message.content} isUser={isUser} />
          {!isUser && (
            <div className="mt-3 pt-2.5 border-t border-border/40">
              <CopyBtn text={message.content} />
            </div>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted border border-border/60 text-[11px] font-bold text-foreground mb-0.5">
          U
        </div>
      )}
    </motion.div>
  );
}

/* ─── Formatted Text ──────────────────────────────────────────────── */
function FormattedText({ text, isUser }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;
        if (trimmed.match(/^[•\-\*] /)) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${isUser ? "bg-white/60" : "bg-indigo-400"}`} />
              <span className="whitespace-pre-wrap break-words">{trimmed.slice(2)}</span>
            </div>
          );
        }
        return <p key={i} className="whitespace-pre-wrap break-words">{line}</p>;
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 border
        ${copied
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
          : "bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
        }`}
    >
      {copied ? <Check size={10} /> : <Clipboard size={10} />}
      {copied ? "Copied!" : "Copy response"}
    </button>
  );
}

/* ─── Thinking Bubble ─────────────────────────────────────────────── */
function ThinkingBubble({ onStop }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="flex items-end gap-2.5"
    >
      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25 mb-0.5">
        <Bot size={13} className="text-white" />
        <span className="absolute inset-0 rounded-xl animate-ping bg-indigo-400/20" />
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="text-[10px] font-semibold text-muted-foreground px-1">SplitEase AI</span>
        <div className="bg-card border border-border/70 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
                  className="block h-2 w-2 rounded-full bg-indigo-400"
                />
              ))}
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Thinking</span>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted border border-border/60 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all"
            >
              <Square size={8} className="fill-current" />
              Stop
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-6 text-center"
    >
      {/* Icon */}
      <div className="relative mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30">
          <Sparkles size={24} className="text-white" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl bg-indigo-500/40 blur-xl"
        />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">Ask SplitEase AI</h2>
      <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed mb-7">
        Get instant answers from your expense history, group balances, and trip records — or ask any general question.
      </p>

      {/* Prompt cards */}
      <div className="w-full grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {QUICK_PROMPTS.map(({ icon: Icon, title, subtitle, prompt, iconColor, iconBg, border, dot }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSuggestionClick(prompt)}
            className={`group relative flex items-center gap-3 rounded-2xl border ${border} bg-card/80 p-3.5 text-left transition-all duration-200 hover:bg-muted/30 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
              <Icon size={16} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-foreground leading-tight">{title}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{subtitle}</span>
            </span>
            <ChevronRight size={13} className="shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Prompt Input ────────────────────────────────────────────────── */
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
    <div className="shrink-0 border-t border-border/60 bg-card/70 backdrop-blur-sm px-4 py-3 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div
          className={`rounded-2xl border bg-card shadow-sm transition-all duration-200 ${
            loading
              ? "border-border/40"
              : "border-border/60 focus-within:border-indigo-500/50 focus-within:shadow-md focus-within:shadow-indigo-500/8"
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask about your expenses, groups, balances, or any question…"
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50 custom-scrollbar"
            style={{ minHeight: "50px", maxHeight: "160px" }}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-3">
            {/* Left: char progress */}
            <div className="flex items-center gap-2.5">
              <div className="h-0.5 w-14 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barColor}`}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                {charCount}<span className="opacity-40">/{MAX}</span>
              </span>
              <span className="hidden sm:block text-[10px] text-muted-foreground/40">
                Shift+Enter for new line
              </span>
            </div>

            {/* Right: action button */}
            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-muted text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                <Square size={11} className="fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => askAI(prompt)}
                disabled={!canSend}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 shadow-sm
                  ${canSend
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:shadow-md hover:-translate-y-px active:translate-y-0"
                    : "bg-muted text-muted-foreground cursor-not-allowed border border-border/50"
                  }`}
              >
                <Send size={13} />
                Send
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
          SplitEase AI reads your expense and group data to give personalized answers.
        </p>
      </div>
    </div>
  );
}
