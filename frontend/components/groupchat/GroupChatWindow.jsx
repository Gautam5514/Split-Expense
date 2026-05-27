"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import ChatInput from "./ChatInput";
import VoicePlayer from "../chat/VoicePlayer";
import { Search, MoreVertical, X, AlertCircle, Loader2, RotateCw, Info, ArrowLeft } from "lucide-react";

export default function GroupChatWindow({ activeGroup, onBack }) {
  const [messages, setMessages] = useState([]);
  const [me, setMe] = useState(null);
  const bottomRef = useRef(null);

  // Search states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Message Info Modal states
  const [infoMessage, setInfoMessage] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Color generator for group member names
  const getMemberColor = (name) => {
    const colors = [
      "text-orange-500",
      "text-pink-500",
      "text-teal-600",
      "text-blue-500",
      "text-teal-600",
      "text-red-500",
      "text-cyan-600",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const getAvatarColor = (name) => {
    const colors = ["bg-orange-500", "bg-pink-500", "bg-cyan-600", "bg-blue-500", "bg-teal-600", "bg-emerald-600", "bg-sky-600"];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  // Helper to convert file to base64 for retrying uploads
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  // Load profile and messages
  useEffect(() => {
    const init = async () => {
      if (!activeGroup) return;
      try {
        const userRes = await api.get("/users/me");
        setMe(userRes.data);
        const res = await api.get(`/groups/${activeGroup._id}/messages`);
        setMessages(res.data || []);

        // Reset search states on active group switch
        setShowSearch(false);
        setSearchQuery("");
      } catch (err) {
        console.error("Error loading group chat:", err);
      }
    };
    init();
  }, [activeGroup]);

  // Connect socket and mark seen on active group join
  useEffect(() => {
    if (!activeGroup) return;
    connectSocket();
    socket.emit("joinGroup", activeGroup._id);

    // Automatically mark all messages in this group as seen on open
    api.post(`/groups/${activeGroup._id}/mark-seen`).catch(console.error);

    socket.on("newGroupMessage", (msg) => {
      if (msg.groupId === activeGroup._id) {
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

        // Mark incoming messages as seen in database
        const incoming = msg.sender !== me?._id && msg.sender?._id !== me?._id;
        if (incoming) {
          api.post(`/groups/${activeGroup._id}/mark-seen`).catch(console.error);
        }
      }
    });

    socket.on("groupMessagesSeen", ({ groupId, userId }) => {
      if (groupId === activeGroup._id) {
        setMessages((prev) =>
          prev.map((m) => {
            const currentSeenBy = m.seenBy || [];
            if (!currentSeenBy.includes(userId)) {
              return { ...m, seenBy: [...currentSeenBy, userId] };
            }
            return m;
          })
        );
      }
    });

    return () => {
      socket.emit("leaveGroup", activeGroup._id);
      socket.off("newGroupMessage");
      socket.off("groupMessagesSeen");
    };
  }, [activeGroup, me]);

  // Scroll to bottom
  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, searchQuery]);

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

  // Retry failed group message transmission
  const retrySendMessage = async (msg) => {
    const tempId = msg._id;
    setMessages((prev) =>
      prev.map((m) => (m._id === tempId ? { ...m, status: "sending" } : m))
    );

    try {
      const base64 = msg._rawFile ? await fileToBase64(msg._rawFile) : null;
      const res = await api.post(`/groups/${activeGroup._id}/message`, {
        text: msg._rawText || msg.text,
        file: base64,
      });

      handleSend(res.data, tempId);
    } catch (err) {
      console.error("❌ retry group message failed:", err);
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
    }
  };

  // Case-insensitive log search filter
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

  // Handles clicking a bubble to view message read-info details
  const handleBubbleClick = (m) => {
    if (isMine(m) && !m._id.toString().startsWith("temp-") && m.status !== "failed") {
      setInfoMessage(m);
      setShowInfoModal(true);
    }
  };

  if (!activeGroup)
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-muted/40 border-l border-border h-full">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-3">Select a group</h1>
          <p className="text-muted-foreground text-sm">
            Choose a group from the left panel to read messages and continue chatting.
          </p>
        </div>
      </div>
    );

  const totalMembers = activeGroup.members?.length || 1;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col relative bg-background overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 w-full h-full wa-bg-pattern z-0 pointer-events-none opacity-40"></div>

      {/* HEADER */}
      <div className="h-16 bg-muted/90 px-4 flex items-center justify-between border-b border-border shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back Arrow for Mobile/Tablet */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 hover:bg-background rounded-full transition mr-1 cursor-pointer shrink-0"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-3 cursor-pointer min-w-0">
            {activeGroup.members?.[0]?.photoURL ? (
              <img
                src={activeGroup.members[0].photoURL}
                alt={activeGroup.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-bold shrink-0 ${getAvatarColor(activeGroup.name)}`}>
                {activeGroup.name?.charAt(0)}
              </div>
            )}
            <div className="flex min-w-0 flex-col justify-center">
              <span className="truncate text-foreground text-base font-semibold leading-tight">
                {activeGroup.name}
              </span>
              <span className="text-[13px] text-muted-foreground leading-tight truncate max-w-[300px]">
                {activeGroup.members?.map(m => m.name).join(", ") || "Tap for info"}
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
              showSearch ? "bg-primary/10 text-primary animate-in" : "hover:bg-background hover:text-foreground"
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
            placeholder="Search in group history..."
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 z-10 custom-scrollbar flex flex-col gap-3">
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
              {/* Optional: Avatar on the side for incoming group messages */}
              {!mine && (
                <div className="mr-1 shrink-0 self-start mt-1">
                  {m.sender.imageUrl ? (
                    <img
                      src={m.sender.imageUrl}
                      alt={m.sender.name}
                      className="w-8 h-8 rounded-full object-cover border border-border/20 shadow-sm"
                    />
                  ) : (
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold ${getAvatarColor(m.sender.name)} shadow-sm`}>
                      {m.sender.name?.charAt(0)}
                    </div>
                  )}
                </div>
              )}

              {/* Failed message retry action */}
              {mine && isFailed && (
                <button
                  onClick={() => retrySendMessage(m)}
                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full transition shrink-0 active:scale-95 shadow-sm"
                  title="Failed to send. Tap to retry"
                >
                  <RotateCw className="w-3.5 h-3.5 animate-spin-hover" />
                </button>
              )}

              <div
                onClick={() => handleBubbleClick(m)}
                className={`relative max-w-[85%] sm:max-w-[65%] px-2.5 py-1.5 shadow-sm text-sm leading-relaxed transition-all
                  ${mine
                    ? "bg-primary/20 rounded-xl rounded-tr-none text-foreground border border-primary/10"
                    : "bg-card rounded-xl rounded-tl-none text-foreground border border-border/40"
                  } ${isSending ? "opacity-75 animate-pulse-slow" : ""} ${
                    isFailed ? "border-red-500/30 shadow-red-500/5 bg-red-500/5" : ""
                  } ${mine && !isOptimistic && !isFailed ? "cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110 active:scale-[0.99] duration-150" : ""}`}
                title={mine && !isOptimistic && !isFailed ? "Click to view message seen info" : undefined}
              >
                {/* Sender Name (Only for incoming in groups) */}
                {!mine && (
                  <p className={`text-[13px] font-semibold mb-1 ${getMemberColor(m.sender.name)}`}>
                    {m.sender.name}
                  </p>
                )}

                {/* Voice Messages Rendering */}
                {m.text === "[Voice Message]" ? (
                  isSending || !m.mediaUrl ? (
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

                {/* Text content highlight */}
                {m.text !== "[Voice Message]" && (
                  <div className="flex flex-col gap-1 min-w-0">
                    {m.text && (
                      <span className="whitespace-pre-wrap break-words text-[14.2px] pb-1 pr-10">
                        {highlightText(m.text, searchQuery)}
                      </span>
                    )}
                  </div>
                )}

                {/* Status Ticks Indicators */}
                <div className="absolute bottom-1 right-2 flex items-center gap-1.5 select-none shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono leading-none">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  
                  {mine && (
                    <span className="text-[10px] font-semibold leading-none shrink-0 flex items-center">
                      {isSending ? (
                        <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        // Seen Ticks Calculation
                        m.seenBy?.length === totalMembers ? (
                          // Read by everyone: Blue ticks
                          <span className="text-blue-500 dark:text-blue-400 font-bold font-mono tracking-tighter text-[11px]" title={`Seen by all ${totalMembers} members`}>✓✓</span>
                        ) : m.seenBy?.length > 1 ? (
                          // Read by some: Gray ticks
                          <span className="text-muted-foreground/80 font-bold font-mono tracking-tighter text-[11px]" title={`Delivered and read by ${m.seenBy.length - 1} other members`}>✓✓</span>
                        ) : (
                          // Read by sender only (delivered to group): Gray single tick
                          <span className="text-muted-foreground/60 font-semibold text-[11px]" title="Delivered to group server">✓</span>
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
            No matching messages found in group log.
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      {/* INPUT */}
      <div className="z-20 flex-shrink-0 border-t border-border">
        <ChatInput
          conversationId={activeGroup._id}
          onSend={handleSend}
          me={me}
        />
      </div>

      {/* 🚀 SMART USE-CASE: MESSAGE INFO DETAILS GLASSMORPHIC MODAL */}
      {showInfoModal && infoMessage && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-card/90 backdrop-blur-lg border border-border/80 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-foreground font-semibold text-base">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>Message Info</span>
              </div>
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setInfoMessage(null);
                }}
                className="p-1.5 hover:bg-muted rounded-full transition"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview bubble */}
            <div className="bg-muted/40 border border-border/30 rounded-2xl p-3.5 mb-4 shrink-0 overflow-hidden text-sm relative">
              <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1 block">Sent Message Preview</span>
              {infoMessage.text === "[Voice Message]" ? (
                <div className="italic text-muted-foreground text-xs flex items-center gap-1.5 py-1">
                  <span>🎙️ Voice Message Note</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-foreground/90">
                  {infoMessage.text}
                </div>
              )}
              {infoMessage.mediaUrl && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <span>📎 Media Attached</span>
                </div>
              )}
            </div>

            {/* Seen lists */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              
              {/* 1. READ BY SECTION */}
              <div>
                <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Read By ({activeGroup.members.filter(member => member._id !== me?._id && infoMessage.seenBy?.includes(member._id)).length})</span>
                </h3>
                
                <div className="space-y-2">
                  {activeGroup.members
                    .filter(member => member._id !== me?._id && infoMessage.seenBy?.includes(member._id))
                    .map(member => (
                      <div key={member._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition duration-150 border border-border/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {member.photoURL ? (
                            <img
                              src={member.photoURL}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover border border-border/20"
                            />
                          ) : (
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold ${getAvatarColor(member.name)}`}>
                              {member.name?.charAt(0)}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate leading-tight">{member.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate leading-normal">{member.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full shadow-inner border border-emerald-500/10 flex items-center gap-0.5 shrink-0 select-none">
                          ✓✓ Read
                        </span>
                      </div>
                    ))}
                  {activeGroup.members.filter(member => member._id !== me?._id && infoMessage.seenBy?.includes(member._id)).length === 0 && (
                    <p className="text-xs italic text-muted-foreground/60 pl-2">No one has read this message yet.</p>
                  )}
                </div>
              </div>

              {/* 2. DELIVERED TO SECTION */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Delivered To ({activeGroup.members.filter(member => member._id !== me?._id && !infoMessage.seenBy?.includes(member._id)).length})
                </h3>
                
                <div className="space-y-2">
                  {activeGroup.members
                    .filter(member => member._id !== me?._id && !infoMessage.seenBy?.includes(member._id))
                    .map(member => (
                      <div key={member._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition duration-150 border border-border/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {member.photoURL ? (
                            <img
                              src={member.photoURL}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover border border-border/20 grayscale opacity-80"
                            />
                          ) : (
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold bg-muted-foreground/50 opacity-80`}>
                              {member.name?.charAt(0)}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0 opacity-70">
                            <span className="text-sm font-medium text-foreground truncate leading-tight">{member.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate leading-normal">{member.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-muted/80 text-muted-foreground font-semibold px-2 py-0.5 rounded-full border border-border/40 shrink-0 select-none">
                          ✓ Delivered
                        </span>
                      </div>
                    ))}
                  {activeGroup.members.filter(member => member._id !== me?._id && !infoMessage.seenBy?.includes(member._id)).length === 0 && (
                    <p className="text-xs italic text-muted-foreground/60 pl-2">Everyone in this group has read this message.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border/50 pt-3 mt-4 shrink-0 flex justify-end">
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setInfoMessage(null);
                }}
                className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold shadow-md active:scale-95 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
