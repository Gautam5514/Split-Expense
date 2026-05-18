"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

const QUICK_PROMPTS = [
  {
    icon: WalletCards,
    title: "Trip spend",
    prompt: "How much did I spend across my recent groups?",
  },
  {
    icon: ReceiptText,
    title: "Expense summary",
    prompt: "Summarize my latest expenses by category.",
  },
  {
    icon: UsersRound,
    title: "Balances",
    prompt: "Who owes money in my active groups?",
  },
  {
    icon: Lightbulb,
    title: "Planning help",
    prompt: "Suggest a simple budget plan for my next trip.",
  },
];

export default function AiPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const scrollAreaRef = useRef(null);
  const abortRef = useRef(null);

  const canSend = prompt.trim().length > 0 && !loading;
  const totalQuestions = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const askAI = async (currentPrompt = prompt) => {
    const trimmedPrompt = currentPrompt.trim();
    if (!trimmedPrompt || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedPrompt,
    };

    setLoading(true);
    setLastPrompt(trimmedPrompt);
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");

    try {
      const res = await api.post(
        "/ai/query",
        { prompt: trimmedPrompt },
        { signal: controller.signal }
      );

      const aiText = res.data?.text || "I could not find a useful answer for that.";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: aiText,
        },
      ]);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      console.error("AI error:", err);
      const errorText =
        err.response?.data?.message || "SplitEase AI is unavailable right now.";
      toast.error(errorText);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          role: "ai",
          content: errorText,
          error: true,
        },
      ]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  };

  const stopRequest = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    toast("Request stopped");
  };

  const clearChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setPrompt("");
    setLoading(false);
  };

  const retryLastPrompt = () => {
    if (!lastPrompt || loading) return;
    askAI(lastPrompt);
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-background px-3 pb-4 pt-8 text-foreground md:px-6">
      <main className="mx-auto grid h-[calc(100vh-118px)] max-w-[1500px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="hidden border-r border-border bg-muted/35 p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles size={21} />
            </div>
            <div>
              <h1 className="text-lg font-bold">SplitEase AI</h1>
              <p className="text-xs text-muted-foreground">Trip and expense assistant</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric label="Questions" value={totalQuestions} />
            <Metric label="Status" value={loading ? "Thinking" : "Ready"} />
          </div>

          <div className="mt-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Start with
            </p>
            <div className="space-y-2">
              {QUICK_PROMPTS.map(({ icon: Icon, title, prompt: suggestion }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => askAI(suggestion)}
                  disabled={loading}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-primary/40 hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {suggestion}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Better answers</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ask with group names, date ranges, or categories for more precise results.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-4 md:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary lg:hidden">
                  <Sparkles size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold md:text-lg">AI Assistant</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    Ask about expenses, groups, balances, plans, or general questions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastPrompt && (
                <button
                  type="button"
                  onClick={retryLastPrompt}
                  disabled={loading}
                  className="hidden items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:flex"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={clearChat}
                disabled={!messages.length && !prompt && !loading}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </header>

          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 md:p-6">
            <AnimatePresence initial={false}>
              {messages.length === 0 && !loading ? (
                <EmptyState onSuggestionClick={askAI} />
              ) : (
                <div className="mx-auto flex max-w-4xl flex-col gap-5">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {loading && <ThinkingIndicator onStop={stopRequest} />}
                </div>
              )}
            </AnimatePresence>
          </div>

          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            askAI={askAI}
            loading={loading}
            canSend={canSend}
            onStop={stopRequest}
          />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const isError = message.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Bot size={18} />
        </div>
      )}

      <div
        className={`group max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[76%] ${
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : isError
            ? "rounded-bl-md border border-destructive/25 bg-destructive/10 text-foreground"
            : "rounded-bl-md border border-border bg-muted/70 text-foreground"
        }`}
      >
        <MessageText text={message.content} />
        {!isUser && <CopyButton text={message.content} />}
      </div>
    </motion.div>
  );
}

function MessageText({ text }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {text.split("\n").map((line, index) => (
        <p key={`${line}-${index}`} className={line.trim() ? "" : "h-3"}>
          {line}
        </p>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy response");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground opacity-100 transition hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
    >
      {copied ? <Check size={13} /> : <Clipboard size={13} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ChatInput({ prompt, setPrompt, askAI, loading, canSend, onStop }) {
  const inputRef = useRef(null);
  const length = prompt.length;

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
  }, [prompt]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI(prompt);
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-card/95 p-3 md:p-4">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-input bg-input px-3 py-3 shadow-sm focus-within:border-primary/50">
          <textarea
            ref={inputRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={1200}
            placeholder="Ask about your trip spend, members, balances, or planning..."
            className="max-h-40 min-h-7 w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              Enter to send, Shift+Enter for a new line
              <span className="ml-2">{length}/1200</span>
            </p>

            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Loader2 size={14} className="animate-spin" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => askAI(prompt)}
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                <Send size={16} />
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator({ onStop }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Bot size={18} />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-border bg-muted/70 px-4 py-3">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <span>Thinking</span>
          <span className="flex gap-1">
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            />
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.12 }}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            />
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.24 }}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            />
          </span>
          <button
            type="button"
            onClick={onStop}
            className="ml-2 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-card"
          >
            Stop
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onSuggestionClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full max-w-4xl flex-col justify-center py-6"
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Bot size={26} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Ask SplitEase AI</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Get fast answers from your trip records, expense history, balances, and general planning questions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_PROMPTS.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSuggestionClick(prompt)}
            className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/50"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon size={17} />
            </span>
            <span className="block text-sm font-semibold text-foreground">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {prompt}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
