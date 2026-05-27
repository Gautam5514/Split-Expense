"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import ChatInput from "./ChatInput";
import VoicePlayer from "./VoicePlayer";
import { Search, MoreVertical, X, AlertCircle, Loader2, RotateCw, ArrowLeft } from "lucide-react";

export default function ChatWindow({ activeFriend, onBack }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [me, setMe] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastActive, setLastActive] = useState(null);
  const bottomRef = useRef(null);

  // Search states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Avatar color helper
  const getColorForName = (name) => {
    const colors = ["bg-teal-500", "bg-emerald-500", "bg-cyan-600", "bg-blue-600", "bg-cyan-700"];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const formatLastSeen = (date) => {
    if (!date) return "Offline";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `last seen today at ${time}`;
    return `last seen ${d.toLocaleDateString()} at ${time}`;
  };

  // Helper to convert file to base64 for retrying uploads
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await api.get("/users/me");
        setMe(userRes.data);

        if (activeFriend) {
          setIsOnline(activeFriend.isOnline || false);
          setLastActive(activeFriend.lastActive || null);

          const convo = await api.post("/chat/conversation", {
            otherEmail: activeFriend.email,
          });
          setConversationId(convo.data._id);

          const msgs = await api.get(`/chat/messages/${convo.data._id}`);
          setMessages(msgs.data || []);
          
          // Clear search when switching active friends
          setShowSearch(false);
          setSearchQuery("");
        }
      } catch (err) {
        console.error("Error loading chat:", err);
      }
    };
    init();
  }, [activeFriend]);

  useEffect(() => {
    connectSocket();
    if (!conversationId) return;
    socket.emit("joinConversation", conversationId);

    socket.on("newMessage", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => {
          // Remove any local optimistic message matching text and sender to avoid duplicates
          const cleaned = prev.filter(
            (m) =>
              !(
                m._id.toString().startsWith("temp-") &&
                m.text === msg.text &&
                (m.sender === msg.sender || m.sender?._id === msg.sender?._id || m.sender?._id === msg.sender)
              )
          );
          const exists = cleaned.some((m) => m._id === msg._id);
          return exists ? cleaned : [...cleaned, msg];
        });

        // Trigger real-time seen confirmation for incoming messages
        const incoming = msg.sender !== me?._id && msg.sender?._id !== me?._id;
        if (incoming && activeFriend) {
          api.post("/chat/reset-unread", { otherUserId: activeFriend._id }).catch(console.error);
        }
      }
    });

    socket.on("messagesSeen", ({ conversationId: seenConvoId, seenBy }) => {
      if (seenConvoId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            // Update seenBy list for own messages when the recipient sees them
            if (m.sender === me?._id || m.sender?._id === me?._id) {
              const currentSeenBy = m.seenBy || [];
              if (!currentSeenBy.includes(seenBy)) {
                return { ...m, seenBy: [...currentSeenBy, seenBy] };
              }
            }
            return m;
          })
        );
      }
    });

    socket.on("userStatus", ({ userId, online, lastActive }) => {
      if (activeFriend && userId === activeFriend._id) {
        setIsOnline(online);
        if (!online) setLastActive(lastActive);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("messagesSeen");
      socket.off("userStatus");
    };
  }, [conversationId, activeFriend, me]);

  useEffect(() => {
    // Keep thread scrolled to the bottom on new messages (unless searching is active)
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, searchQuery]);

  if (!activeFriend)
    return (
      <div className="relative flex-1 hidden md:flex flex-col items-center justify-center bg-muted/40 border-l border-border h-full">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-3">Select a conversation</h1>
          <p className="text-muted-foreground text-sm">
            Choose a contact from the left panel to read messages and continue chatting.
          </p>
        </div>
        <div className="absolute bottom-8 text-muted-foreground text-xs flex items-center gap-2">
          <span className="opacity-60">Private trip conversations</span>
        </div>
      </div>
    );

  const isMine = (msg) => me && (msg.sender === me._id || msg.sender?._id === me._id);

  // Optimistic handler callback
  const handleSend = (msg, tempIdToReplace) => {
    setMessages((prev) => {
      if (tempIdToReplace) {
        return prev.map((m) => (m._id === tempIdToReplace ? msg : m));
      }
      const exists = prev.some((m) => m._id === msg._id);
      if (exists) return prev;
      return [...prev, msg];
    });
  };

  // Resubmit a failed message
  const retrySendMessage = async (msg) => {
    const tempId = msg._id;
    setMessages((prev) =>
      prev.map((m) => (m._id === tempId ? { ...m, status: "sending" } : m))
    );

    try {
      const base64 = msg._rawFile ? await fileToBase64(msg._rawFile) : null;
      const res = await api.post("/chat/message", {
        conversationId,
        text: msg._rawText || msg.text,
        file: base64,
      });

      handleSend(res.data.data, tempId);
      socket.emit("sendMessage", res.data.data);
    } catch (err) {
      console.error("❌ retry send message failed:", err);
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
    }
  };

  // Case-insensitive log search filtering
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    if (m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }
    return false;
  });

  // Dynamic Highlight query search helper (supports safe regex characters)
  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-200 dark:bg-amber-900/60 font-semibold px-0.5 rounded text-amber-950 dark:text-amber-100 shadow-sm"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 wa-bg-pattern pointer-events-none opacity-40"></div>

      {/* HEADER */}
      <div className="h-16 bg-muted/90 px-4 flex items-center justify-between border-b border-border z-10 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="md:hidden mr-1 p-1.5 hover:bg-background/80 rounded-lg text-muted-foreground hover:text-foreground transition shrink-0 cursor-pointer"
              title="Back to contacts"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 cursor-pointer min-w-0">
            {activeFriend.imageUrl ? (
              <img
                src={activeFriend.imageUrl}
                alt={activeFriend.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-bold ${getColorForName(
                  activeFriend.name
                )}`}
              >
                {activeFriend.name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <span className="truncate text-foreground text-base font-semibold leading-tight">
                {activeFriend.name}
              </span>
              <span className="text-[13px] text-muted-foreground leading-tight">
                {isOnline ? "online" : formatLastSeen(lastActive)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
            className={`rounded-lg p-2 transition ${
              showSearch ? "bg-primary/10 text-primary" : "hover:bg-background hover:text-foreground"
            }`}
            title="Search logs"
          >
            <Search className="w-4 h-4" />
          </button>
          <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toggleable Log Search Bar Dropdown */}
      {showSearch && (
        <div className="bg-muted/90 backdrop-blur-md px-4 py-2 border-b border-border z-20 flex items-center gap-3 animate-in slide-in-from-top duration-200">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search in chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-foreground w-full text-sm focus:outline-none placeholder:text-muted-foreground py-1"
            autoFocus
          />
          {searchQuery.trim() && (
            <span className="text-xs bg-background/80 border border-border px-2.5 py-0.5 rounded-full text-muted-foreground shrink-0 font-medium font-mono animate-in zoom-in-95 duration-150">
              {filteredMessages.length} matches
            </span>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
            className="p-1.5 hover:bg-background rounded-full transition shrink-0"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:p-6 z-10 custom-scrollbar flex flex-col gap-3">
        {filteredMessages.map((m, index) => {
          const mine = isMine(m);
          const isOptimistic = m._id.toString().startsWith("temp-");
          const isFailed = m.status === "failed";
          const isSending = m.status === "sending";

          return (
            <div
              key={m._id || index}
              className={`flex w-full mb-1 items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
            >
              {/* Failed message retry actions */}
              {mine && isFailed && (
                <button
                  onClick={() => retrySendMessage(m)}
                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full transition shrink-0 active:scale-90"
                  title="Failed to send. Tap to retry"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                className={`relative max-w-[85%] sm:max-w-[65%] px-2.5 py-1.5 shadow-sm text-sm leading-relaxed transition-all ${
                  mine
                    ? "bg-primary/20 rounded-xl rounded-tr-none text-foreground border border-primary/10"
                    : "bg-card rounded-xl rounded-tl-none text-foreground border border-border/40"
                } ${isSending ? "opacity-70 animate-pulse-slow" : ""} ${
                  isFailed ? "border-red-500/30 shadow-red-500/5 bg-red-500/5" : ""
                }`}
              >
                {/* Voice Messages Rendering */}
                {m.text === "[Voice Message]" ? (
                  isSending || !m.mediaUrl ? (
                    /* Pulsing voice skeleton loader */
                    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[260px] animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-emerald-600/30 flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 bg-muted-foreground/20 rounded w-3/4"></div>
                        <div className="h-1 bg-muted-foreground/10 rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <VoicePlayer mediaUrl={m.mediaUrl} isMine={mine} />
                  )
                ) : (
                  /* Standard Image/Media attachments */
                  m.mediaUrl && (
                    <div className="mb-1.5 overflow-hidden rounded-lg border border-border/30 relative">
                      {m.mediaType === "image" ? (
                        <img
                          src={m.mediaUrl}
                          alt="attached media"
                          className="w-full max-h-[300px] object-cover hover:scale-[1.02] transition-transform duration-200"
                        />
                      ) : (
                        <video
                          controls
                          src={m.mediaUrl}
                          className="w-full max-h-[300px] object-cover"
                        />
                      )}
                      
                      {/* Image loading overlays for optimistic previews */}
                      {isSending && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Text and runtime clocks */}
                {m.text !== "[Voice Message]" && (
                  <div className="flex flex-col gap-1 min-w-0">
                    {m.text && (
                      <span className="whitespace-pre-wrap break-words text-[14.2px] pb-1 pr-10">
                        {highlightText(m.text, searchQuery)}
                      </span>
                    )}
                  </div>
                )}

                {/* Status indicators */}
                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground select-none font-mono">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  
                  {mine && (
                    <span className="text-[10px] font-semibold select-none shrink-0">
                      {isSending ? (
                        <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        m.seenBy?.includes(activeFriend._id) || m.seenBy?.length > 1 ? (
                          <span className="text-blue-500 dark:text-blue-400 font-bold font-mono tracking-tighter text-[11px]" title="Seen">✓✓</span>
                        ) : (
                          <span className="text-muted-foreground font-semibold text-[11px]" title="Delivered">✓</span>
                        )
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredMessages.length === 0 && searchQuery.trim() && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
            No matching messages found in logs.
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      {/* INPUT AREA (fixed bottom) */}
      <div className="bg-muted/95 px-4 py-3 z-20 flex-shrink-0 border-t border-border">
        <ChatInput
          conversationId={conversationId}
          me={me}
          onSend={handleSend}
        />
      </div>
    </section>
  );
}
