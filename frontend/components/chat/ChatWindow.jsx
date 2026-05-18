"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import ChatInput from "./ChatInput";
import { Search, MoreVertical } from "lucide-react";

export default function ChatWindow({ activeFriend }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [me, setMe] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastActive, setLastActive] = useState(null);
  const bottomRef = useRef(null);

  // Avatar color helper
  const getColorForName = (name) => {
    const colors = ["bg-teal-500", "bg-emerald-500", "bg-cyan-600", "bg-blue-600", "bg-indigo-500"];
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
          const exists = prev.some((m) => m._id === msg._id);
          return exists ? prev : [...prev, msg];
        });
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
      socket.off("userStatus");
    };
  }, [conversationId, activeFriend]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

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

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background relative overflow-hidden">

      {/* Background Pattern */}
      <div className="absolute inset-0 wa-bg-pattern pointer-events-none opacity-40"></div>

      {/* HEADER */}
      <div className="h-16 bg-muted/90 px-4 flex items-center justify-between 
       border-b border-border z-10 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer">
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
            <span className="truncate text-foreground text-base font-semibold leading-tight">{activeFriend.name}</span>
            <span className="text-[13px] text-muted-foreground leading-tight">
              {isOnline ? "online" : formatLastSeen(lastActive)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="Search">
            <Search className="w-4 h-4" />
          </button>
          <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MESSAGES - auto-fit height */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:p-6 z-10 custom-scrollbar">
        {messages.map((m, index) => {
          const mine = isMine(m);
          return (
            <div
              key={m._id || index}
              className={`flex w-full mb-1 ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[65%] px-2 py-1.5 shadow-sm text-sm leading-relaxed
              ${mine
                    ? "bg-primary/20 rounded-lg rounded-tr-none text-foreground"
                    : "bg-card rounded-lg rounded-tl-none text-foreground"
                  }`}
              >
                {/* IMAGE/VIDEO */}
                {m.mediaUrl && (
                  <div className="mb-1 overflow-hidden rounded-md">
                    {m.mediaType === "image" ? (
                      <img
                        src={m.mediaUrl}
                        alt="media"
                        className="w-full max-h-[300px] object-cover"
                      />
                    ) : (
                      <video
                        controls
                        src={m.mediaUrl}
                        className="w-full max-h-[300px] object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Text & Time */}
                <div className="flex flex-wrap items-end gap-2">
                  {m.text && (
                    <span className="whitespace-pre-wrap break-words text-[14.2px] pb-1">
                      {m.text}
                    </span>
                  )}
                  <span
                    className={`text-[11px] ml-auto min-w-fit ${mine ? "text-muted-foreground" : "text-muted-foreground"
                      }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef}></div>
      </div>

      {/* INPUT AREA (fixed bottom) */}
      <div className="bg-muted/95 px-4 py-3 z-20 flex-shrink-0 border-t border-border">
        <ChatInput
          conversationId={conversationId}
          onSend={(msg) =>
            setMessages((prev) => {
              const exists = prev.some((m) => m._id === msg._id);
              return exists ? prev : [...prev, msg];
            })
          }
        />
      </div>
    </section>
  );
}
