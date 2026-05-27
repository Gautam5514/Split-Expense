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
  ChevronLeft,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  PenSquare,
  Menu,
  X,
  History,
  Search,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "@/lib/toast";
import useTheme from "@/hooks/useTheme";

/* ─── Premium Suggestions / Insights ─────────────────────────────── */
const QUICK_PROMPTS = [
  {
    icon: WalletCards,
    title: "Trip Spend Analysis",
    subtitle: "Show breakdown across active trips",
    prompt: "How much did I spend across my recent groups?",
    color: "from-cyan-500/20 to-cyan-500/20",
    border: "group-hover:border-cyan-500/40",
    iconColor: "text-cyan-600 dark:text-cyan-400 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
  },
  {
    icon: ReceiptText,
    title: "Expense Categories",
    subtitle: "Analyze latest transactions by tags",
    prompt: "Summarize my latest expenses by category.",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "group-hover:border-emerald-500/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
  {
    icon: UsersRound,
    title: "Settle Up Balances",
    subtitle: "Who owes money and who is owed",
    prompt: "Who owes money in my active groups?",
    color: "from-orange-500/20 to-amber-500/20",
    border: "group-hover:border-orange-500/40",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
  },
  {
    icon: Lightbulb,
    title: "Smart Travel Budget",
    subtitle: "Suggest budget metrics for planning",
    prompt: "Suggest a simple budget plan for my next trip.",
    color: "from-pink-500/20 to-rose-500/20",
    border: "group-hover:border-pink-500/40",
    iconColor: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
  },
];

/* ─── Chronological Grouping Logic ─────────────────────────────── */
function getGroupedChats(chats) {
  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  chats.forEach((chat) => {
    const timestamp = parseInt(chat.id);
    if (isNaN(timestamp)) {
      groups.older.push(chat);
      return;
    }

    if (timestamp >= todayStart) {
      groups.today.push(chat);
    } else if (timestamp >= yesterdayStart) {
      groups.yesterday.push(chat);
    } else if (timestamp >= sevenDaysAgoStart) {
      groups.previous7Days.push(chat);
    } else {
      groups.older.push(chat);
    }
  });

  return groups;
}

/* ─── Root Page ───────────────────────────────────────────────────── */
export default function AiPage() {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer open
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop panel collapsed
  const [searchQuery, setSearchQuery] = useState(""); // Filter chat history
  const [editingChatId, setEditingChatId] = useState(null); // ID of chat being renamed
  const [editTitle, setEditTitle] = useState("");
  const { theme } = useTheme();

  const scrollAreaRef = useRef(null);
  const abortRef = useRef(null);

  // Load chats & sidebar config from LocalStorage on mount
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem("splitease_ai_chats");
      const savedCurrentId = localStorage.getItem("splitease_ai_current_id");
      const savedCollapsed = localStorage.getItem("splitease_ai_sidebar_collapsed");

      if (savedCollapsed) {
        setIsSidebarCollapsed(JSON.parse(savedCollapsed));
      }

      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
        if (savedCurrentId && parsedChats.some((c) => c.id === savedCurrentId)) {
          setCurrentChatId(savedCurrentId);
        } else if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        }
      } else {
        // Initialize with a default new chat
        const initialId = Date.now().toString();
        const initialChat = {
          id: initialId,
          title: "New Chat",
          messages: [],
        };
        setChats([initialChat]);
        setCurrentChatId(initialId);
      }
    } catch (e) {
      console.error("Failed to load chats from localStorage:", e);
    }
  }, []);

  // Save chats to LocalStorage when changed
  const saveChatsToStorage = (updatedChats) => {
    localStorage.setItem("splitease_ai_chats", JSON.stringify(updatedChats));
  };

  const handleNewChat = useCallback(() => {
    const newId = Date.now().toString();
    const newChat = {
      id: newId,
      title: "New Chat",
      messages: [],
    };
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    setCurrentChatId(newId);
    saveChatsToStorage(updatedChats);
    localStorage.setItem("splitease_ai_current_id", newId);
    setPrompt("");
    if (isSidebarOpen) setIsSidebarOpen(false);
  }, [chats, isSidebarOpen]);

  const handleDeleteChat = useCallback(
    (idToDelete, e) => {
      e.stopPropagation();
      const updatedChats = chats.filter((c) => c.id !== idToDelete);
      setChats(updatedChats);

      if (updatedChats.length === 0) {
        const newId = Date.now().toString();
        const newChat = {
          id: newId,
          title: "New Chat",
          messages: [],
        };
        setChats([newChat]);
        setCurrentChatId(newId);
        saveChatsToStorage([newChat]);
        localStorage.setItem("splitease_ai_current_id", newId);
      } else if (currentChatId === idToDelete) {
        const fallbackId = updatedChats[0].id;
        setCurrentChatId(fallbackId);
        saveChatsToStorage(updatedChats);
        localStorage.setItem("splitease_ai_current_id", fallbackId);
      } else {
        saveChatsToStorage(updatedChats);
      }
      toast.success("Chat deleted");
    },
    [chats, currentChatId]
  );

  const startEditing = useCallback((id, currentTitle, e) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitle(currentTitle);
  }, []);

  const handleRename = useCallback(
    (id, e) => {
      if (e) e.stopPropagation();
      if (!editTitle.trim()) return setEditingChatId(null);

      const updatedChats = chats.map((c) =>
        c.id === id ? { ...c, title: editTitle.trim() } : c
      );
      setChats(updatedChats);
      setEditingChatId(null);
      saveChatsToStorage(updatedChats);
      toast.success("Chat renamed");
    },
    [chats, editTitle]
  );

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("splitease_ai_sidebar_collapsed", JSON.stringify(next));
      return next;
    });
  }, []);

  // Filter history titles in real time
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  // Group filtered history chronologically
  const groupedChats = useMemo(() => getGroupedChats(filteredChats), [filteredChats]);

  const currentChat = useMemo(() => {
    return chats.find((c) => c.id === currentChatId) || chats[0] || null;
  }, [chats, currentChatId]);

  const messages = useMemo(() => {
    return currentChat?.messages || [];
  }, [currentChat]);

  const totalQuestions = useMemo(() => {
    return messages.filter((m) => m.role === "user").length;
  }, [messages]);

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
      const updatedChatMessages = [...currentChat.messages, userMsg];

      // Auto rename chat title if it was default "New Chat" and this is the first message
      let newTitle = currentChat.title;
      if (currentChat.title === "New Chat" && currentChat.messages.length === 0) {
        newTitle = trimmed.split(" ").slice(0, 4).join(" ");
        if (newTitle.length > 25) newTitle = newTitle.slice(0, 25) + "...";
      }

      const updatedChats = chats.map((c) =>
        c.id === currentChatId
          ? { ...c, title: newTitle, messages: updatedChatMessages }
          : c
      );

      setChats(updatedChats);
      setPrompt("");
      setLoading(true);
      setLastPrompt(trimmed);
      saveChatsToStorage(updatedChats);

      try {
        const res = await api.post("/ai/query", { prompt: trimmed }, { signal: ctrl.signal });
        const text = res.data?.text || "I couldn't generate a response for that.";

        const aiMsg = { id: `a-${Date.now()}`, role: "ai", content: text };

        const finalChats = chats.map((c) =>
          c.id === currentChatId
            ? { ...c, title: newTitle, messages: [...updatedChatMessages, aiMsg] }
            : c
        );

        setChats(finalChats);
        saveChatsToStorage(finalChats);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        const errText = err.response?.data?.message || "SplitEase AI is unavailable right now.";
        toast.error(errText, { duration: 4000 });

        const errorMsg = { id: `e-${Date.now()}`, role: "ai", content: errText, error: true };

        const finalChats = chats.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...updatedChatMessages, errorMsg] }
            : c
        );

        setChats(finalChats);
        saveChatsToStorage(finalChats);
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setLoading(false);
      }
    },
    [prompt, loading, currentChat, currentChatId, chats]
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
      const updatedChats = chats.map((c) =>
        c.id === currentChatId ? { ...c, messages: [] } : c
      );
      setChats(updatedChats);
      saveChatsToStorage(updatedChats);
    }

    setPrompt("");
    setLoading(false);
    toast.success("Active chat cleared");
  }, [chats, currentChatId, currentChat]);

  // Shared sidebar item renderer
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
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 cursor-pointer border ${
          isActive
            ? "bg-muted text-foreground border-border/80 shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent"
        }`}
      >
        <MessageSquare size={13.5} className="shrink-0 text-primary opacity-70" />

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
          <span className="flex-1 text-[12.5px] font-medium truncate pr-12">
            {chat.title}
          </span>
        )}

        {/* Action buttons (Visible on hover or if active) */}
        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card pl-3">
          {isEditing ? (
            <button
              onClick={(e) => handleRename(chat.id, e)}
              className="p-1 rounded hover:bg-muted text-emerald-500"
            >
              <Check size={11} />
            </button>
          ) : (
            <>
              <button
                onClick={(e) => startEditing(chat.id, chat.title, e)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <PenSquare size={11} />
              </button>
              <button
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-zinc-800 text-red-500 transition"
              >
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
      className="relative flex bg-background text-foreground overflow-hidden select-none transition-colors duration-300 pt-6 lg:pt-8"
      style={{ height: "calc(100dvh - 70px)" }}
    >
      {/* Ambient Glows */}
      <div
        className="absolute top-[-25%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/5 dark:bg-cyan-600/8 blur-[150px] pointer-events-none animate-pulse"
        style={{ animationDuration: "12s" }}
      />

      {/* ── Sidebar (ChatGPT Style with Search & Chronological Grouping) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-border/80 bg-card/95 backdrop-blur-xl transition-all duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isSidebarCollapsed ? "lg:w-0 lg:opacity-0 lg:border-r-0 lg:pointer-events-none" : "w-[280px] sm:w-[300px] lg:w-[280px]"}`}
      >
        {/* Sidebar Header */}
        <div className="px-4 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center border border-border bg-background shadow-sm">
                <img
                  src="/logo-icon.png"
                  className="w-full h-full object-cover animate-pulse"
                  alt="SplitEase"
                />
              </div>
              <h3 className="text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
                SplitEase AI
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  PRO
                </span>
              </h3>
            </div>
            {/* Sidebar toggle buttons (Mobile and Desktop) */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex w-7.5 h-7.5 items-center justify-center rounded-lg border border-border hover:bg-muted text-foreground transition-all active:scale-95"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden w-7.5 h-7.5 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-foreground transition-all active:scale-95"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* + New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all border border-border bg-foreground text-background hover:opacity-90 hover:scale-[1.01]"
          >
            <Plus size={14} />
            New Chat
          </button>

          {/* History Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search chat sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/80 text-[11.5px] rounded-xl pl-9 pr-4 py-2 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 text-foreground transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Chat History List (Chronological Grouping) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-4">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">
              {searchQuery ? "No matching chats found" : "No chats started yet"}
            </div>
          ) : (
            <>
              {/* Today Group */}
              {groupedChats.today.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-muted-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                      Today
                    </span>
                  </div>
                  {groupedChats.today.map(renderSidebarItem)}
                </div>
              )}

              {/* Yesterday Group */}
              {groupedChats.yesterday.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-muted-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                      Yesterday
                    </span>
                  </div>
                  {groupedChats.yesterday.map(renderSidebarItem)}
                </div>
              )}

              {/* Previous 7 Days Group */}
              {groupedChats.previous7Days.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-muted-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Previous 7 Days
                    </span>
                  </div>
                  {groupedChats.previous7Days.map(renderSidebarItem)}
                </div>
              )}

              {/* Older Group */}
              {groupedChats.older.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-muted-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      Older
                    </span>
                  </div>
                  {groupedChats.older.map(renderSidebarItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Diagnostics Widget at Sidebar Bottom */}
        <div className="p-4 border-t border-border/60 bg-muted/20">
          <div className="rounded-xl border border-border/80 bg-background/50 p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>SYSTEM METRICS</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                SECURE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-muted-foreground">
              <div className="bg-card border border-border/40 p-2 rounded-lg text-center">
                <p className="text-[9px] uppercase tracking-wide opacity-75">Inquiries</p>
                <p className="text-sm font-extrabold text-foreground mt-0.5">{totalQuestions}</p>
              </div>
              <div className="bg-card border border-border/40 p-2 rounded-lg text-center">
                <p className="text-[9px] uppercase tracking-wide opacity-75">Processor</p>
                <p className="text-xs font-bold text-primary mt-1.5 truncate">Gemini Pro</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Main Chat Area (Clean canvas with floating buttons) ── */}
      <section className="flex flex-1 min-w-0 flex-col bg-background/50 backdrop-blur-xl relative z-10 transition-colors duration-300">
        {/* Floating Controls Overlay (Replaces the overlapping Top Header Bar) */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {/* Left Floating Sidebar Toggle (Only visible when collapsed on desktop, or always on mobile) */}
          <div className="pointer-events-auto">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(true);
                } else {
                  toggleSidebarCollapse();
                }
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border border-border/80 bg-card/90 backdrop-blur-md hover:bg-muted text-foreground transition-all duration-200 shadow-sm active:scale-95 ${
                !isSidebarCollapsed ? "lg:hidden" : ""
              }`}
              title="Expand sidebar"
            >
              <PanelLeft size={16} />
            </button>
          </div>

          {/* Right Floating Actions (Retry & Clear Chat) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {lastPrompt && !loading && (
              <button
                type="button"
                onClick={() => askAI(lastPrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card/90 backdrop-blur-md hover:bg-muted text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all shadow-sm"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card/90 backdrop-blur-md hover:bg-red-500/10 hover:border-red-500/20 text-[11px] font-bold text-muted-foreground hover:text-red-500 transition-all shadow-sm"
              >
                <Trash2 size={11} />
                Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Message Threads */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-4 pt-16 pb-6 md:px-8 xl:px-12"
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

        {/* Commander Input */}
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
        <div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 via-teal-600 to-cyan-700 shadow-md border border-white/10 mt-1">
          <Bot size={15} className="text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[85%] md:max-w-[78%]`}>
        <span className="text-[10px] font-bold text-muted-foreground px-1 tracking-wider uppercase font-mono">
          {isUser ? "USER CONSOLE" : "CORE INTELLIGENCE"}
        </span>

        <div
          className={`px-5 py-4 rounded-2xl text-[14px] leading-relaxed shadow-sm relative overflow-hidden transition-all duration-300
            ${
              isUser
                ? "bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-br-sm shadow-md border border-cyan-400/20"
                : isError
                ? "bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-200 rounded-bl-sm"
                : "bg-muted/50 border border-border/60 text-foreground rounded-bl-sm"
            }`}
        >
          {isError && (
            <div className="flex items-center gap-1.5 mb-2 text-red-500 dark:text-red-400">
              <AlertTriangle size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                Operational Fault
              </span>
            </div>
          )}
          <FormattedText text={message.content} isUser={isUser} />
          {!isUser && (
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <CopyBtn text={message.content} />
              <span className="text-[9px] font-mono text-muted-foreground">
                SplitEase AI Core v3.5
              </span>
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-foreground text-background border border-border shadow-sm text-[11px] font-black mt-1">
          U
        </div>
      )}
    </motion.div>
  );
}

/* ─── Custom Premium Block Markdown Parser ─── */
function parseMarkdownToBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block Parsing
    if (trimmed.startsWith("```")) {
      if (currentBlock && currentBlock.type === "code") {
        // End of code block
        blocks.push(currentBlock);
        currentBlock = null;
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        const lang = trimmed.slice(3).trim() || "javascript";
        currentBlock = { type: "code", lang, content: [] };
      }
      continue;
    }

    if (currentBlock && currentBlock.type === "code") {
      currentBlock.content.push(line);
      continue;
    }

    // 2. Table Block Parsing
    if (trimmed.startsWith("|")) {
      if (currentBlock && currentBlock.type === "table") {
        currentBlock.rows.push(line);
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: "table", rows: [line] };
      }
      continue;
    }

    if (currentBlock && currentBlock.type === "table") {
      // Table ended (line doesn't start with |)
      blocks.push(currentBlock);
      currentBlock = null;
    }

    // 3. Regular block / text accumulation
    if (!currentBlock) {
      currentBlock = { type: "text", content: [] };
    }
    currentBlock.content.push(line);
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function parseInlineMarkdown(text, isUser) {
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={index}
          className={`font-bold ${
            isUser ? "text-white" : "text-foreground font-black tracking-wide"
          }`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic opacity-90">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className={`px-1.5 py-0.5 rounded text-[11.5px] font-mono font-medium ${
            isUser
              ? "bg-white/20 text-white"
              : "bg-muted text-teal-600 dark:text-sky-400 border border-border/50"
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function CodeBlock({ lang, content }) {
  const codeText = content.join("\n");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy code");
    }
  };

  return (
    <div className="my-3.5 overflow-hidden rounded-xl border border-border/80 bg-zinc-950 text-zinc-100 shadow-md">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
        <span className="uppercase font-semibold tracking-wider">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Clipboard size={11} />}
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] font-mono leading-relaxed custom-scrollbar">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

function TableBlock({ rows }) {
  // Filter out divider rows e.g. |---|---|
  const validRows = rows.filter((row) => !row.match(/^\s*\|?\s*:?-+:?\s*\|/));

  const parsedRows = validRows.map((row) => {
    const cells = row.split("|").map((cell) => cell.trim());
    if (row.startsWith("|")) cells.shift();
    if (row.endsWith("|")) cells.pop();
    return cells;
  });

  if (parsedRows.length === 0) return null;

  const headers = parsedRows[0];
  const bodyRows = parsedRows.slice(1);

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-border/60 shadow-sm max-w-full custom-scrollbar">
      <table className="min-w-full divide-y divide-border border-collapse text-[13px]">
        <thead className="bg-muted/60">
          <tr>
            {headers.map((cell, idx) => (
              <th
                key={idx}
                className="px-4 py-2 text-left font-black text-foreground tracking-tight border-r last:border-r-0 border-border/40"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {bodyRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-muted/40 even:bg-muted/20"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-4 py-2 text-left text-muted-foreground border-r last:border-r-0 border-border/40 font-medium"
                >
                  {cell}
                </td>
              ))}
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
      <div className="space-y-1.5 select-text">
        {text.split("\n").map((line, i) => (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">
            {parseInlineMarkdown(line, true)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3.5 select-text">
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return <CodeBlock key={idx} lang={block.lang} content={block.content} />;
        }
        if (block.type === "table") {
          return <TableBlock key={idx} rows={block.rows} />;
        }

        return (
          <div key={idx} className="space-y-2">
            {block.content.map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={i} className="h-1" />;

              // Blockquotes
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={i}
                    className="pl-4 border-l-2 py-1.5 px-3 rounded-r-xl my-2 text-[13px] border-cyan-500 bg-cyan-500/5 text-muted-foreground"
                  >
                    {parseInlineMarkdown(trimmed.slice(2), false)}
                  </blockquote>
                );
              }

              // Headers
              if (trimmed.startsWith("### ")) {
                return (
                  <h4
                    key={i}
                    className="font-bold text-[14px] mt-4 mb-1.5 text-primary font-black tracking-tight"
                  >
                    {parseInlineMarkdown(trimmed.slice(4), false)}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
                const sliceIndex = trimmed.startsWith("## ") ? 3 : 2;
                return (
                  <h3
                    key={i}
                    className="font-bold text-[15px] mt-5 mb-2.5 pb-1.5 border-b text-foreground border-border/60"
                  >
                    {parseInlineMarkdown(trimmed.slice(sliceIndex), false)}
                  </h3>
                );
              }

              // Bullet lists
              if (trimmed.match(/^[•\-\*] /)) {
                return (
                  <div key={i} className="flex items-start gap-2.5 pl-2 my-0.5">
                    <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse" />
                    <span className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px] font-medium text-foreground">
                      {parseInlineMarkdown(trimmed.slice(2), false)}
                    </span>
                  </div>
                );
              }

              // Numbered lists
              const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
              if (numMatch) {
                const num = numMatch[1];
                const listContent = numMatch[2];
                return (
                  <div key={i} className="flex items-start gap-2 pl-2 my-0.5">
                    <span className="font-mono text-[12px] font-bold text-primary mr-2 select-none w-4 text-right">
                      {num}.
                    </span>
                    <span className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px] font-medium text-foreground">
                      {parseInlineMarkdown(listContent, false)}
                    </span>
                  </div>
                );
              }

              return (
                <p
                  key={i}
                  className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px] font-medium text-foreground"
                >
                  {parseInlineMarkdown(line, false)}
                </p>
              );
            })}
          </div>
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
        ${
          copied
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
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
      <div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 shadow-md border border-white/10 mt-1">
        <Bot size={15} className="text-white" />
        <span className="absolute -inset-0.5 rounded-xl animate-ping bg-cyan-500/20" />
      </div>

      <div className="flex flex-col gap-1.5 items-start">
        <span className="text-[10px] font-bold text-muted-foreground px-1 tracking-wider uppercase font-mono">
          CORE INTELLIGENCE
        </span>
        <div className="bg-muted/50 border border-border/60 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
                  className="block h-2.5 w-2.5 rounded-full bg-primary"
                />
              ))}
            </div>
            <span className="text-[12px] font-mono text-muted-foreground">
              Analyzing ledger parameters...
            </span>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all shadow-sm"
            >
              <Square size={8} className="fill-current text-red-500" />
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
      {/* Brand logo container */}
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-background shadow-md border border-border relative z-10 hover:scale-105 transition-transform duration-300">
          <img src="/logo-icon.png" className="w-12 h-12 object-cover" alt="SplitEase" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl z-0"
        />
      </div>

      <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight leading-tight">
        How can SplitEase AI help you?
      </h2>
      <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed mb-8">
        Unlock real-time debt simplifications, budget analytics, anomalies detection, and advanced
        trip calculations.
      </p>

      {/* Suggested prompts grid */}
      <div className="w-full grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_PROMPTS.map(
          ({ icon: Icon, title, subtitle, prompt, iconColor, iconBg, color }) => (
            <button
              key={title}
              type="button"
              onClick={() => onSuggestionClick(prompt)}
              className={`group relative flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:bg-muted/40 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0`}
            >
              {/* Background Hover Glow */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`}
              />

              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} border border-border/40`}
              >
                <Icon size={16} />
              </span>
              <span className="flex-1 min-w-0 relative z-10">
                <span className="block text-[13px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                  {title}
                </span>
                <span className="block text-[11px] text-muted-foreground mt-0.5 leading-normal">
                  {subtitle}
                </span>
              </span>
              <ArrowUpRight
                size={14}
                className="shrink-0 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary relative z-10"
              />
            </button>
          )
        )}
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
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/60 backdrop-blur-md px-3 py-3 sm:px-4 sm:py-4 md:px-8 xl:px-12">
      <div className="mx-auto max-w-3xl">
        {/* Commander panel */}
        <div
          className={`rounded-2xl border bg-card shadow-sm relative overflow-hidden transition-all duration-300 ${
            loading
              ? "border-border/30"
              : "border-border/80 focus-within:border-primary/40 focus-within:shadow-[0_0_20px_rgba(8,145,178,0.06)]"
          }`}
        >
          {/* Neon inner edge highlight in dark mode */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          {/* Commander Badge */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/20 bg-muted/20">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-widest">
                COMMANDER MODULE v3.5
              </span>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground">SYSTEM SECURE</span>
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask about spend trends, cross-group balances, anomalies, or planning..."
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-40 custom-scrollbar animate-none focus:ring-0 focus:outline-none"
            style={{ minHeight: "50px", maxHeight: "160px" }}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-3 border-t border-border/10">
            {/* Char progress */}
            <div className="flex items-center gap-2.5">
              <div className="h-0.5 w-12 rounded-full bg-border overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barColor}`}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                {charCount}
                <span className="opacity-30">/{MAX}</span>
              </span>
              <span className="hidden sm:block text-[9px] text-muted-foreground/50 font-mono">
                [Enter] Send · [Shift+Enter] Line
              </span>
            </div>

            {/* Action buttons */}
            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-background text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-all shadow-sm hover:scale-[1.01]"
              >
                <Square size={10} className="fill-current text-red-500 animate-pulse" />
                Abort
              </button>
            ) : (
              <button
                type="button"
                onClick={() => askAI(prompt)}
                disabled={!canSend}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide transition-all duration-200 shadow-sm
                  ${
                    canSend
                      ? "bg-primary text-white shadow-cyan-500/10 hover:shadow-cyan-500/20 hover:scale-[1.01] hover:-translate-y-px active:translate-y-0 cursor-pointer"
                      : "bg-muted text-muted-foreground/40 cursor-not-allowed border border-border/20"
                  }`}
              >
                <Send size={12} />
                Engage
              </button>
            )}
          </div>
        </div>

        {/* Console footer */}
        <p className="mt-2.5 text-center text-[9px] font-mono text-muted-foreground/40 tracking-wider">
          SYSTEM STATUS: ONLINE · SECURITY LEVEL: ELEVATED · CONTEXT WINDOW: MAXIMUM
        </p>
      </div>
    </div>
  );
}
