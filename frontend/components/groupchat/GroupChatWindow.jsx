"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import ChatInput from "./ChatInput";
import { Search, MoreVertical } from "lucide-react";

export default function GroupChatWindow({ activeGroup }) {
  const [messages, setMessages] = useState([]);
  const [me, setMe] = useState(null);
  const bottomRef = useRef(null);

  // Color generator for group member names
  const getMemberColor = (name) => {
    const colors = [
      "text-orange-500",
      "text-pink-500",
      "text-purple-500",
      "text-blue-500",
      "text-teal-600",
      "text-red-500",
      "text-indigo-500",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const getAvatarColor = (name) => {
    const colors = ["bg-orange-500", "bg-pink-500", "bg-purple-500", "bg-blue-500"];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  }

  useEffect(() => {
    const init = async () => {
      if (!activeGroup) return;
      const userRes = await api.get("/users/me");
      setMe(userRes.data);
      const res = await api.get(`/groups/${activeGroup._id}/messages`);
      setMessages(res.data || []);
    };
    init();
  }, [activeGroup]);

  useEffect(() => {
    if (!activeGroup) return;
    connectSocket();
    socket.emit("joinGroup", activeGroup._id);

    socket.on("newGroupMessage", (msg) => {
      if (msg.groupId === activeGroup._id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === msg._id);
          return exists ? prev : [...prev, msg];
        });
      }
    });

    return () => {
      socket.emit("leaveGroup", activeGroup._id);
      socket.off("newGroupMessage");
    };
  }, [activeGroup]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  const isMine = (msg) => msg.sender._id === me?._id;

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

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col relative bg-background overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 w-full h-full wa-bg-pattern z-0 pointer-events-none opacity-40"></div>

      {/* HEADER */}
      <div className="h-16 bg-muted/90 px-4 flex items-center justify-between border-b border-border shrink-0 z-10">
        <div className="flex items-center gap-3 cursor-pointer">
          {activeGroup.members?.[0]?.photoURL ? (
            <img
              src={activeGroup.members[0].photoURL}
              alt={activeGroup.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-bold ${getAvatarColor(activeGroup.name)}`}>
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="Search">
            <Search className="w-4 h-4" />
          </button>
          <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 z-10 custom-scrollbar flex flex-col space-y-1.5">
        {messages.map((m) => {
          const mine = isMine(m);

          return (
            <div
              key={m._id}
              className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
            >
              {/* Optional: Avatar on the side for incoming group messages */}
              {!mine && (
                <div className="mr-2 shrink-0 self-start mt-1">
                  {m.sender.imageUrl ? (
                    <img
                      src={m.sender.imageUrl}
                      alt={m.sender.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold ${getAvatarColor(m.sender.name)}`}>
                      {m.sender.name?.charAt(0)}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`relative max-w-[85%] sm:max-w-[65%] px-2 py-1.5 shadow-sm text-sm leading-relaxed
                ${mine
                    ? "bg-primary/20 rounded-lg rounded-tr-none text-foreground"
                    : "bg-card rounded-lg rounded-tl-none text-foreground"}`}
              >
                {/* Sender Name (Only for incoming in groups) */}
                {!mine && (
                  <p className={`text-[13px] font-semibold mb-1 ${getMemberColor(m.sender.name)}`}>
                    {m.sender.name}
                  </p>
                )}

                {/* Media */}
                {m.mediaUrl && (
                  <div className="mb-1 overflow-hidden rounded-md">
                    {/* Detect image vs video mostly by extension or if you save type in DB. 
                         For now assuming image unless known otherwise */}
                    <img
                      src={m.mediaUrl}
                      alt="media"
                      className="w-full max-h-[300px] object-cover"
                    />
                  </div>
                )}

                {/* Text & Time */}
                <div className="flex flex-wrap items-end gap-2">
                  {m.text && <span className="whitespace-pre-wrap break-words text-[14.2px] pb-1">{m.text}</span>}
                  <span className={`text-[11px] ml-auto min-w-fit ${mine ? "text-muted-foreground" : "text-muted-foreground"}`}>
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

      {/* INPUT */}
      {/* z-20 ensures input stays above background pattern */}
      <div className="z-20 flex-shrink-0 border-t border-border">
        <ChatInput conversationId={activeGroup._id} isGroup />
      </div>
    </section>
  );
}
