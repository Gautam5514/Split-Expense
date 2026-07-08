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
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  PenSquare,
  X,
  Search,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

/* ─── AI Providers ─── */
const AI_PROVIDERS = [
  { key: "gemini", label: "Gemini" },
  { key: "openai", label: "ChatGPT" },
];
const PROVIDER_LABELS = { gemini: "Gemini", openai: "ChatGPT", smart: "Instant lookup" };

/* ─── Chat retention: nothing is kept locally past 24 hours ─── */
const CHAT_TTL_MS = 24 * 60 * 60 * 1000;
const dropExpiredChats = (chatList) =>
  chatList.filter((c) => {
    const ts = parseInt(c.id, 10);
    return !isNaN(ts) && Date.now() - ts < CHAT_TTL_MS;
  });
import { AnimatePresence, motion } from "framer-motion";
import toast from "@/lib/toast";

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

/* ─── Chat Grouping ─── */
function getGroupedChats(chats) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 864e5;
  const sevenDaysAgo = todayStart - 7 * 864e5;

  return chats.reduce(
    (acc, chat) => {
      const ts = parseInt(chat.id);
      if (isNaN(ts) || ts < sevenDaysAgo) acc.older.push(chat);
      else if (ts < yesterdayStart) acc.previous7Days.push(chat);
      else if (ts < todayStart) acc.yesterday.push(chat);
      else acc.today.push(chat);
      return acc;
    },
    { today: [], yesterday: [], previous7Days: [], older: [] }
  );
}

/* ─── Root Page ─── */
export default function AiPage() {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [provider, setProvider] = useState("gemini");

  const scrollAreaRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      const savedChats = localStorage.getItem("splitease_ai_chats");
      const savedCurrentId = localStorage.getItem("splitease_ai_current_id");
      const savedCollapsed = localStorage.getItem("splitease_ai_sidebar_collapsed");
      if (savedCollapsed) setIsSidebarCollapsed(JSON.parse(savedCollapsed));
      const savedProvider = localStorage.getItem("splitease_ai_provider");
      if (savedProvider === "gemini" || savedProvider === "openai") setProvider(savedProvider);
      const parsed = savedChats ? dropExpiredChats(JSON.parse(savedChats)) : [];
      if (parsed.length > 0) {
        setChats(parsed);
        save(parsed);
        if (savedCurrentId && parsed.some((c) => c.id === savedCurrentId)) {
          setCurrentChatId(savedCurrentId);
        } else {
          setCurrentChatId(parsed[0].id);
        }
      } else {
        const id = Date.now().toString();
        const chat = { id, title: "New Chat", messages: [] };
        setChats([chat]);
        setCurrentChatId(id);
        save([chat]);
      }
    } catch (e) {}
  }, []);

  // Sweep expired chats every few minutes so a tab left open past the
  // 24-hour retention window still drops old conversations without a reload.
  useEffect(() => {
    const sweep = () => {
      setChats((prev) => {
        const fresh = dropExpiredChats(prev);
        if (fresh.length === prev.length) return prev;
        const next =
          fresh.length > 0
            ? fresh
            : [{ id: Date.now().toString(), title: "New Chat", messages: [] }];
        save(next);
        setCurrentChatId((id) => (next.some((c) => c.id === id) ? id : next[0].id));
        return next;
      });
    };
    const interval = setInterval(sweep, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const save = (updatedChats) =>
    localStorage.setItem("splitease_ai_chats", JSON.stringify(updatedChats));

  const handleNewChat = useCallback(() => {
    const id = Date.now().toString();
    const chat = { id, title: "New Chat", messages: [] };
    const updated = [chat, ...chats];
    setChats(updated);
    setCurrentChatId(id);
    save(updated);
    localStorage.setItem("splitease_ai_current_id", id);
    setPrompt("");
    if (isSidebarOpen) setIsSidebarOpen(false);
  }, [chats, isSidebarOpen]);

  const handleDeleteChat = useCallback(
    (idToDelete, e) => {
      e.stopPropagation();
      const updated = chats.filter((c) => c.id !== idToDelete);
      if (updated.length === 0) {
        const id = Date.now().toString();
        const chat = { id, title: "New Chat", messages: [] };
        setChats([chat]);
        setCurrentChatId(id);
        save([chat]);
        localStorage.setItem("splitease_ai_current_id", id);
      } else {
        setChats(updated);
        if (currentChatId === idToDelete) {
          setCurrentChatId(updated[0].id);
          localStorage.setItem("splitease_ai_current_id", updated[0].id);
        }
        save(updated);
      }
      toast.success("Chat deleted");
    },
    [chats, currentChatId]
  );

  const startEditing = useCallback((id, title, e) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitle(title);
  }, []);

  const handleRename = useCallback(
    (id, e) => {
      if (e) e.stopPropagation();
      if (!editTitle.trim()) return setEditingChatId(null);
      const updated = chats.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c));
      setChats(updated);
      setEditingChatId(null);
      save(updated);
      toast.success("Renamed");
    },
    [chats, editTitle]
  );

  const selectProvider = useCallback((key) => {
    setProvider(key);
    localStorage.setItem("splitease_ai_provider", key);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("splitease_ai_sidebar_collapsed", JSON.stringify(next));
      return next;
    });
  }, []);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [chats, searchQuery]);

  const groupedChats = useMemo(() => getGroupedChats(filteredChats), [filteredChats]);
  const currentChat = useMemo(
    () => chats.find((c) => c.id === currentChatId) || chats[0] || null,
    [chats, currentChatId]
  );
  const messages = useMemo(() => currentChat?.messages || [], [currentChat]);
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
      if (!trimmed || loading || !currentChat) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const userMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      const updatedMsgs = [...currentChat.messages, userMsg];
      let newTitle = currentChat.title;
      if (currentChat.title === "New Chat" && currentChat.messages.length === 0) {
        newTitle = trimmed.split(" ").slice(0, 5).join(" ");
        if (newTitle.length > 28) newTitle = newTitle.slice(0, 28) + "…";
      }

      const updatedChats = chats.map((c) =>
        c.id === currentChatId ? { ...c, title: newTitle, messages: updatedMsgs } : c
      );
      setChats(updatedChats);
      setPrompt("");
      setLoading(true);
      setLastPrompt(trimmed);
      save(updatedChats);

      try {
        const res = await api.post(
          "/ai/query",
          { prompt: trimmed, provider },
          { signal: ctrl.signal }
        );
        const text = res.data?.text || "I couldn't generate a response.";
        const aiMsg = { id: `a-${Date.now()}`, role: "ai", content: text, provider: res.data?.provider };
        const final = chats.map((c) =>
          c.id === currentChatId
            ? { ...c, title: newTitle, messages: [...updatedMsgs, aiMsg] }
            : c
        );
        setChats(final);
        save(final);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        const errText = err.response?.data?.message || "SplitEase AI is unavailable right now.";
        toast.error(errText);
        const errorMsg = { id: `e-${Date.now()}`, role: "ai", content: errText, error: true };
        const final = chats.map((c) =>
          c.id === currentChatId ? { ...c, messages: [...updatedMsgs, errorMsg] } : c
        );
        setChats(final);
        save(final);
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setLoading(false);
      }
    },
    [prompt, loading, currentChat, currentChatId, chats, provider]
  );

  const stopRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (currentChat) {
      const updated = chats.map((c) =>
        c.id === currentChatId ? { ...c, messages: [] } : c
      );
      setChats(updated);
      save(updated);
    }
    setPrompt("");
    setLoading(false);
    toast.success("Chat cleared");
  }, [chats, currentChatId, currentChat]);

  const renderSidebarItem = (chat) => {
    const isActive = chat.id === currentChatId;
    const isEditing = chat.id === editingChatId;
    return (
      <div
        key={chat.id}
        onClick={() => {
          setCurrentChatId(chat.id);
          localStorage.setItem("splitease_ai_current_id", chat.id);
          if (isSidebarOpen) setIsSidebarOpen(false);
        }}
        className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 cursor-pointer ${
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <MessageSquare size={13} className="shrink-0 opacity-60" />
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(chat.id);
              if (e.key === "Escape") setEditingChatId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-background text-foreground text-xs px-2 py-0.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-0"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-[12.5px] font-medium truncate pr-10">{chat.title}</span>
        )}
        <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card pl-3">
          {isEditing ? (
            <button onClick={(e) => handleRename(chat.id, e)} className="p-1 rounded hover:bg-muted text-emerald-500">
              <Check size={11} />
            </button>
          ) : (
            <>
              <button onClick={(e) => startEditing(chat.id, chat.title, e)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition">
                <PenSquare size={11} />
              </button>
              <button onClick={(e) => handleDeleteChat(chat.id, e)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition">
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative flex bg-background text-foreground overflow-hidden transition-colors duration-300 pt-6 lg:pt-8"
      style={{ height: "calc(100dvh - 70px)" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-border/60 bg-card transition-all duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isSidebarCollapsed ? "lg:w-0 lg:opacity-0 lg:border-r-0 lg:pointer-events-none" : "w-[260px] lg:w-[260px]"}`}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center">
                <img src="/logo-icon.png" className="w-full h-full object-cover" alt="" />
              </div>
              <span className="text-sm font-bold text-foreground">SplitEase AI</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold border border-border bg-foreground text-background hover:opacity-90 transition-all"
          >
            <Plus size={13} />
            New Chat
          </button>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/60 text-[11.5px] rounded-lg pl-9 pr-4 py-2 outline-none focus:border-primary/40 text-foreground transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3">
          {filteredChats.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground italic">
              {searchQuery ? "No matching chats" : "No chats yet"}
            </p>
          ) : (
            <>
              {[
                { label: "Today", chats: groupedChats.today },
                { label: "Yesterday", chats: groupedChats.yesterday },
                { label: "Previous 7 Days", chats: groupedChats.previous7Days },
                { label: "Older", chats: groupedChats.older },
              ]
                .filter((g) => g.chats.length > 0)
                .map(({ label, chats: group }) => (
                  <div key={label} className="space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1.5">
                      {label}
                    </p>
                    {group.map(renderSidebarItem)}
                  </div>
                ))}
            </>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Main Chat Area ── */}
      <section className="flex flex-1 min-w-0 flex-col bg-background relative z-10">
        {/* Floating top controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) setIsSidebarOpen(true);
                else toggleCollapse();
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 bg-card/90 backdrop-blur-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm ${
                !isSidebarCollapsed ? "lg:hidden" : ""
              }`}
            >
              <PanelLeft size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border/60 bg-card/90 backdrop-blur-md shadow-sm">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => selectProvider(p.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    provider === p.key
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
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
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mt-0.5">
          <Bot size={14} className="text-primary" />
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[82%]`}>
        <div
          className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed ${
            isUser
              ? "bg-primary text-white rounded-br-sm"
              : isError
              ? "bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-300 rounded-bl-sm"
              : "bg-muted border border-border/50 text-foreground rounded-bl-sm"
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
          U
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
  const parts = text.split(/(\\*\\*.*?\\*\\*|\\*.*?\\*|`.*?`)/g);
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
function ThinkingBubble({ onStop }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="flex items-start gap-3"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mt-0.5">
        <Bot size={14} className="text-primary" />
      </div>
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
        <span className="text-[12.5px] text-muted-foreground">Thinking…</span>
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
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-background border border-border shadow-sm">
        <img src="/logo-icon.png" className="w-9 h-9 object-cover" alt="" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1.5 tracking-tight">
        How can SplitEase AI help?
      </h2>
      <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed mb-6">
        Ask about group balances, trip expenses, debt simplification, and more.
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
function PromptInput({ prompt, setPrompt, askAI, loading, canSend, onStop }) {
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
    <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-md px-4 py-3 md:px-8 xl:px-16">
      <div className="mx-auto max-w-2xl">
        <div
          className={`flex items-end gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm transition-all duration-200 ${
            loading ? "border-border/30" : "border-border/70 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(8,145,178,0.06)]"
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask anything about your expenses..."
            className="flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-40 custom-scrollbar"
            style={{ minHeight: "24px", maxHeight: "160px" }}
          />

          {loading ? (
            <button
              type="button"
              onClick={onStop}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <Square size={9} className="fill-current text-red-500" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => askAI(prompt)}
              disabled={!canSend}
              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                canSend
                  ? "bg-primary text-white hover:opacity-90 hover:scale-[1.03] cursor-pointer"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <Send size={14} />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
