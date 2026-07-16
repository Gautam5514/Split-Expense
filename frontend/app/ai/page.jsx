"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import toast from "@/lib/toast";
import {
  Check,
  Clipboard,
  RefreshCw,
  Send,
  Trash2,
  WalletCards,
  UsersRound,
  ReceiptText,
  Lightbulb,
  Square,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { auth } from "@/lib/firebaseClient";

/* ─── AI Providers ─── */
const AI_PROVIDERS = [
  { key: "gemini", label: "Gemini" },
  { key: "openai", label: "ChatGPT" },
];
const PROVIDER_LABELS = { gemini: "Gemini", openai: "ChatGPT", smart: "Instant lookup" };

function ChatGPTMark({ className = "h-4 w-4" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path fill="currentColor" d="M22.28 9.82a5.73 5.73 0 0 0-.49-4.68 5.82 5.82 0 0 0-6.27-2.79A5.76 5.76 0 0 0 11.2.43a5.82 5.82 0 0 0-5.56 4 5.75 5.75 0 0 0-3.84 2.8 5.82 5.82 0 0 0 .71 6.82 5.73 5.73 0 0 0 .49 4.68A5.82 5.82 0 0 0 9.27 21.5a5.76 5.76 0 0 0 4.33 1.93 5.82 5.82 0 0 0 5.56-4 5.75 5.75 0 0 0 3.84-2.8 5.82 5.82 0 0 0-.72-6.81Zm-8.67 12.12a4.27 4.27 0 0 1-2.73-.98l.14-.08 4.53-2.61a.73.73 0 0 0 .37-.64v-6.37l1.91 1.1v5.27a4.32 4.32 0 0 1-4.22 4.31Zm-9.3-3.95a4.28 4.28 0 0 1-.51-2.86l.14.09 4.53 2.61a.72.72 0 0 0 .74 0l5.52-3.19v2.21l-4.57 2.64a4.32 4.32 0 0 1-5.87-1.5ZM3.1 8a4.27 4.27 0 0 1 2.23-1.86v5.36c0 .27.14.51.37.64l5.52 3.19-1.91 1.1-4.57-2.64A4.32 4.32 0 0 1 3.1 8Zm15.2 3.86-5.52-3.19 1.91-1.1 4.57 2.64a4.32 4.32 0 0 1-.59 7.65V12.5a.74.74 0 0 0-.37-.64Zm1.9-2.99-.14-.09-4.53-2.61a.72.72 0 0 0-.74 0l-5.52 3.19V7.15l4.57-2.64a4.32 4.32 0 0 1 6.36 4.36ZM8.08 12.74l-1.91-1.1V6.37a4.32 4.32 0 0 1 7.09-3.33l-.14.08-4.53 2.61a.73.73 0 0 0-.37.64l-.14 6.37Zm1.04-2.19L11.58 9.13l2.46 1.42v2.84l-2.46 1.42-2.46-1.42v-2.84Z"/></svg>;
}

function GeminiMark({ className = "h-4 w-4" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><defs><linearGradient id="gemini-gradient" x1="3" y1="21" x2="21" y2="3"><stop stopColor="#1c7dff"/><stop offset=".5" stopColor="#a35bff"/><stop offset="1" stopColor="#f04e98"/></linearGradient></defs><path fill="url(#gemini-gradient)" d="M12 2c.72 5.57 4.43 9.28 10 10-5.57.72-9.28 4.43-10 10-.72-5.57-4.43-9.28-10-10 5.57-.72 9.28-4.43 10-10Z"/></svg>;
}

function ProviderMark({ provider, className }) {
  return provider === "openai" ? <ChatGPTMark className={className} /> : <GeminiMark className={className} />;
}

/* ─── Quick Prompt Suggestions ─── */
const QUICK_PROMPTS = [
  {
    icon: WalletCards,
    title: "Trip Spend Analysis",
    subtitle: "Show breakdown across active trips",
    prompt: "How much did I spend across my recent groups?",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10",
  },
  {
    icon: ReceiptText,
    title: "Expense Categories",
    subtitle: "Analyze latest transactions by tags",
    prompt: "Summarize my latest expenses by category.",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    icon: UsersRound,
    title: "Settle Up Balances",
    subtitle: "Who owes money and who is owed",
    prompt: "Who owes money in my active groups?",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-500/10",
  },
  {
    icon: Lightbulb,
    title: "Smart Travel Budget",
    subtitle: "Suggest budget metrics for planning",
    prompt: "Suggest a simple budget plan for my next trip.",
    iconColor: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-500/10",
  },
];

/* ─── Root Page ─── */
export default function AiPage() {
  // Privacy by design: the conversation lives only in this component's memory.
  // Nothing is written to localStorage or any server store - leaving the page
  // erases the chat completely.
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [provider, setProvider] = useState("gemini");

  const scrollAreaRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      // The provider choice is the only remembered preference.
      const savedProvider = localStorage.getItem("splitease_ai_provider");
      if (savedProvider === "gemini" || savedProvider === "openai") setProvider(savedProvider);
      // Purge chat data an earlier version of this page stored locally.
      ["splitease_ai_chats", "splitease_ai_current_id", "splitease_ai_sidebar_collapsed"].forEach(
        (key) => localStorage.removeItem(key)
      );
    } catch (e) {}
  }, []);

  const selectProvider = useCallback((key) => {
    setProvider(key);
    try {
      localStorage.setItem("splitease_ai_provider", key);
    } catch (e) {}
  }, []);

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

      // Recent turns give the AI memory, so follow-up questions work.
      const history = messages
        .filter((m) => !m.error)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setPrompt("");
      setLoading(true);
      setLastPrompt(trimmed);

      try {
        const res = await api.post(
          "/ai/query",
          { prompt: trimmed, provider, history },
          { signal: ctrl.signal }
        );
        const text = res.data?.text || "I couldn't generate a response.";
        const aiMsg = { id: `a-${Date.now()}`, role: "ai", content: text, provider: res.data?.provider };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        const errText = err.response?.data?.message || "SplitEase AI is unavailable right now.";
        toast.error(errText);
        const errorMsg = { id: `e-${Date.now()}`, role: "ai", content: errText, error: true };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setLoading(false);
      }
    },
    [prompt, loading, messages, provider]
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
    setLastPrompt("");
    setLoading(false);
    toast.success("Chat cleared");
  }, []);

  return (
    <div
      className="relative flex h-[calc(100dvh-72px)] bg-background text-foreground overflow-hidden transition-colors duration-300 md:h-[calc(100dvh-80px)]"
    >
      {/* ── Main Chat Area ── */}
      <section className="flex flex-1 min-w-0 flex-col bg-background relative z-10">
        {/* Floating top controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <div />

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {lastPrompt && !loading && (
              <button
                type="button"
                onClick={() => askAI(lastPrompt)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card/90 backdrop-blur-md hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all shadow-sm"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card/90 backdrop-blur-md hover:bg-red-500/10 hover:border-red-500/20 text-[11px] font-medium text-muted-foreground hover:text-red-500 transition-all shadow-sm"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-14 pb-4 md:px-8 xl:px-16"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.length === 0 && !loading ? (
              <EmptyState key="empty" onSuggestionClick={askAI} />
            ) : (
              <motion.div
                key="thread"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto flex max-w-2xl flex-col gap-5"
              >
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                {loading && <ThinkingBubble onStop={stopRequest} provider={provider} />}
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
          provider={provider}
          selectProvider={selectProvider}
        />
      </section>
    </div>
  );
}

/* ─── Chat Bubble ─── */
function ChatBubble({ message }) {
  const isUser = message.role === "user";
  const isError = !!message.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-foreground">
          <ProviderMark provider={message.provider} className="h-5 w-5" />
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[82%]`}>
        <div
          className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed ${
            isUser
              ? "bg-primary text-white rounded-br-sm"
              : isError
              ? "bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-300 rounded-bl-sm"
              : "bg-card border border-border/60 text-foreground rounded-bl-sm shadow-[0_10px_35px_-24px_rgba(8,145,178,0.45)]"
          }`}
        >
          {isError && (
            <div className="flex items-center gap-1.5 mb-2 text-red-500">
              <AlertTriangle size={12} />
              <span className="text-[11px] font-semibold">Something went wrong</span>
            </div>
          )}
          <FormattedText text={message.content} isUser={isUser} />
          {!isUser && (
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
              <CopyBtn text={message.content} />
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {PROVIDER_LABELS[message.provider] || "SplitEase AI"}
              </span>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-[11px] font-bold mt-0.5">
          {(auth.currentUser?.displayName || auth.currentUser?.email || "U").trim().charAt(0).toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Markdown Parser ─── */
function parseMarkdownToBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let currentBlock = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (currentBlock?.type === "code") { blocks.push(currentBlock); currentBlock = null; }
      else { if (currentBlock) blocks.push(currentBlock); currentBlock = { type: "code", lang: trimmed.slice(3).trim() || "text", content: [] }; }
      continue;
    }
    if (currentBlock?.type === "code") { currentBlock.content.push(line); continue; }
    if (trimmed.startsWith("|")) {
      if (currentBlock?.type === "table") currentBlock.rows.push(line);
      else { if (currentBlock) blocks.push(currentBlock); currentBlock = { type: "table", rows: [line] }; }
      continue;
    }
    if (currentBlock?.type === "table") { blocks.push(currentBlock); currentBlock = null; }
    if (!currentBlock) currentBlock = { type: "text", content: [] };
    currentBlock.content.push(line);
  }
  if (currentBlock) blocks.push(currentBlock);
  return blocks;
}

function parseInlineMarkdown(text, isUser) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className={`px-1.5 py-0.5 rounded text-[11.5px] font-mono ${isUser ? "bg-white/20" : "bg-muted border border-border/50 text-primary"}`}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function CodeBlock({ lang, content }) {
  const codeText = content.join("\n");
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(codeText); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Could not copy"); }
  };
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/60 bg-zinc-950 text-zinc-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
        <span className="uppercase font-medium">{lang}</span>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 hover:text-white transition-colors">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Clipboard size={11} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] font-mono leading-relaxed custom-scrollbar">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

function TableBlock({ rows }) {
  const valid = rows.filter((r) => !r.match(/^\s*\|?\s*:?-+:?\s*\|/));
  const parsed = valid.map((row) => {
    const cells = row.split("|").map((c) => c.trim());
    if (row.startsWith("|")) cells.shift();
    if (row.endsWith("|")) cells.pop();
    return cells;
  });
  if (parsed.length === 0) return null;
  const [headers, ...bodyRows] = parsed;
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border/50 shadow-sm custom-scrollbar">
      <table className="min-w-full text-[13px]">
        <thead className="bg-muted/50">
          <tr>{headers.map((c, i) => <th key={i} className="px-4 py-2 text-left font-semibold text-foreground border-r last:border-r-0 border-border/30">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {bodyRows.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/30">
              {row.map((c, ci) => <td key={ci} className="px-4 py-2 text-muted-foreground border-r last:border-r-0 border-border/30">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormattedText({ text, isUser }) {
  const blocks = useMemo(() => parseMarkdownToBlocks(text), [text]);
  if (isUser) {
    return (
      <div className="space-y-1 select-text">
        {text.split("\n").map((line, i) => (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
            {parseInlineMarkdown(line, true)}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3 select-text">
      {blocks.map((block, idx) => {
        if (block.type === "code") return <CodeBlock key={idx} lang={block.lang} content={block.content} />;
        if (block.type === "table") return <TableBlock key={idx} rows={block.rows} />;
        return (
          <div key={idx} className="space-y-1.5">
            {block.content.map((line, i) => {
              const t = line.trim();
              if (!t) return <div key={i} className="h-1" />;
              if (t.startsWith("> ")) return <blockquote key={i} className="pl-3 border-l-2 border-primary/50 text-muted-foreground text-[13px] my-1">{parseInlineMarkdown(t.slice(2), false)}</blockquote>;
              if (t.startsWith("### ")) return <h4 key={i} className="font-bold text-[13.5px] mt-3 mb-1 text-foreground">{parseInlineMarkdown(t.slice(4), false)}</h4>;
              if (t.startsWith("## ") || t.startsWith("# ")) {
                const s = t.startsWith("## ") ? 3 : 2;
                return <h3 key={i} className="font-bold text-[14px] mt-4 mb-1.5 pb-1 border-b border-border/50 text-foreground">{parseInlineMarkdown(t.slice(s), false)}</h3>;
              }
              if (t.match(/^[•\-\*] /)) return (
                <div key={i} className="flex items-start gap-2 pl-1">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">{parseInlineMarkdown(t.slice(2), false)}</span>
                </div>
              );
              const numMatch = t.match(/^(\d+)\.\s(.*)/);
              if (numMatch) return (
                <div key={i} className="flex items-start gap-2 pl-1">
                  <span className="font-mono text-[12px] font-semibold text-primary/70 w-5 shrink-0 text-right">{numMatch[1]}.</span>
                  <span className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">{parseInlineMarkdown(numMatch[2], false)}</span>
                </div>
              );
              return <p key={i} className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">{parseInlineMarkdown(line, false)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Copy Button ─── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Could not copy"); }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all border ${
        copied ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {copied ? <Check size={10} /> : <Clipboard size={10} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ─── Thinking Bubble ─── */
function ThinkingBubble({ onStop, provider }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="flex items-start gap-3"
    >
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-foreground"><ProviderMark provider={provider} className="h-5 w-5" /></div>
      <div className="bg-muted border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay, ease: "easeInOut" }}
              className="block h-1.5 w-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
        <span className="text-[12.5px] text-muted-foreground">{PROVIDER_LABELS[provider] || "SplitEase AI"} is thinking…</span>
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
        >
          <Square size={8} className="fill-current text-red-500" />
          Stop
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onSuggestionClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto flex h-full max-w-lg flex-col items-center justify-center py-8 text-center"
    >
      <div className="mb-5 flex items-center gap-2 text-foreground">
        <GeminiMark className="h-9 w-9" /><span className="h-7 w-px bg-border" /><ChatGPTMark className="h-8 w-8" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1.5 tracking-tight">
        {(() => {
          const firstName = auth.currentUser?.displayName?.trim().split(" ")[0];
          return firstName ? `Hi ${firstName} 👋 How can I help?` : "How can SplitEase AI help?";
        })()}
      </h2>
      <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed mb-6">
        Ask about your balances, trips and spending — follow-up questions work
        too. Nothing is saved: leaving this page erases the conversation.
      </p>

      <div className="w-full grid grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map(({ icon: Icon, title, subtitle, prompt, iconColor, iconBg }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSuggestionClick(prompt)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-all duration-200 hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
              <Icon size={15} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                {title}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{subtitle}</span>
            </span>
            <ArrowUpRight size={13} className="shrink-0 text-muted-foreground/30 group-hover:text-primary transition" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Prompt Input ─── */
function PromptInput({ prompt, setPrompt, askAI, loading, canSend, onStop, provider, selectProvider }) {
  const textareaRef = useRef(null);
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

  return (
    <div className="shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pt-2 md:px-8 xl:px-16" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-3xl">
        <div
          className={`relative overflow-visible rounded-[22px] border bg-card/95 shadow-[0_18px_55px_-24px_rgba(8,145,178,0.35)] backdrop-blur-xl transition-all duration-200 ${
            loading ? "border-border/40" : "border-border/80 focus-within:border-primary/50 focus-within:shadow-[0_18px_60px_-24px_rgba(8,145,178,0.5)]"
          }`}
        >
          <textarea ref={textareaRef} rows={1} value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX))} onKeyDown={handleKeyDown}
            disabled={loading} placeholder="Ask SplitEase AI about spending, balances or your next trip…"
            aria-label="Message SplitEase AI"
            className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/55 disabled:opacity-40 custom-scrollbar sm:px-5"
            style={{ minHeight: "54px", maxHeight: "160px" }} />

          <div className="flex items-center justify-between gap-3 px-3 pb-3 sm:px-4">
            <details className="group relative z-40" aria-label="Choose AI model">
              <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-xl border border-border/70 bg-muted/55 px-3 text-[12px] font-semibold text-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden">
                <ProviderMark provider={provider} className="h-4 w-4" />
                {PROVIDER_LABELS[provider]}
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-muted-foreground transition group-open:rotate-180" aria-hidden="true"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </summary>
              <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-56 overflow-hidden rounded-2xl border border-border/70 bg-card p-1.5 shadow-[0_22px_60px_-18px_rgba(0,0,0,0.4)]">
                {AI_PROVIDERS.map((item) => (
                  <button key={item.key} type="button" disabled={loading}
                    onClick={(event) => { selectProvider(item.key); event.currentTarget.closest("details")?.removeAttribute("open"); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${provider === item.key ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    <ProviderMark provider={item.key} className="h-5 w-5 shrink-0" />
                    <span><span className="block text-[12px] font-semibold">{item.label}</span><span className="block text-[10px] opacity-65">{item.key === "gemini" ? "Fast, helpful answers" : "OpenAI intelligence"}</span></span>
                    {provider === item.key && <Check size={13} className="ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            </details>
          {loading ? (
            <button
              type="button"
              onClick={onStop}
              className="shrink-0 flex h-9 items-center gap-1.5 px-3 rounded-xl border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <Square size={9} className="fill-current text-red-500" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => askAI(prompt)}
              disabled={!canSend}
              aria-label="Send message"
              className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                canSend
                  ? "bg-primary text-white hover:opacity-90 hover:scale-[1.03] cursor-pointer"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <Send size={15} />
            </button>
          )}
          </div>
        </div>

        <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground/45 sm:block">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
