"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import ChatInput from "./ChatInput";

export default function ChatWindow({ activeFriend }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [me, setMe] = useState(null);
  const bottomRef = useRef(null);

  // 🎨 Helper: consistent pastel colors for avatar initials
  const getColorForName = (name) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-rose-500",
    ];
    const index = name
      ? name.charCodeAt(0) % colors.length
      : Math.floor(Math.random() * colors.length);
    return colors[index];
  };

  // 🧠 Load my profile + conversation
  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await api.get("/users/me");
        setMe(userRes.data);

        if (activeFriend) {
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

  // 🧩 Real-time message updates
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

    return () => socket.off("newMessage");
  }, [conversationId]);

  // 🧩 Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeFriend)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a friend to start chatting 💬
      </div>
    );

  // ✅ Determine sender/receiver
  const isMine = (msg) => me && msg.sender === me._id;

  return (
    <div className="flex flex-col w-3/4 h-full bg-[#efeae2]">
      {/* 💬 Header */}
      <div className="border-b p-4 flex items-center gap-3 bg-[#f0f2f5] sticky top-0 z-10">
        {activeFriend.imageUrl ? (
          <img
            src={activeFriend.imageUrl}
            alt={activeFriend.name}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold uppercase ${getColorForName(
              activeFriend.name
            )}`}
          >
            {activeFriend.name?.charAt(0) || "?"}
          </div>
        )}

        <div>
          <p className="font-medium text-gray-900">{activeFriend.name}</p>
          <p className="text-xs text-gray-500">{activeFriend.email}</p>
        </div>
      </div>

      {/* 💌 Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#efeae2]">
        {messages.map((m, index) => {
          const mine = isMine(m);
          return (
            <div
              key={m._id || index}
              className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
            >
              {/* If message is from other user, show avatar before bubble */}
              {!mine && (
                <div className="shrink-0 mr-2">
                  {m.sender?.imageUrl ? (
                    <img
                      src={m.sender.imageUrl}
                      alt={m.sender.name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-semibold uppercase ${getColorForName(
                        m.sender?.name || "?"
                      )}`}
                    >
                      {m.sender?.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`relative p-3 rounded-2xl shadow-sm max-w-[75%] leading-relaxed ${
                  mine
                    ? "bg-[#d9fdd3] text-gray-900 rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none"
                }`}
              >
                {m.mediaUrl && (
                  <div className="mb-2">
                    {m.mediaType === "image" ? (
                      <img
                        src={m.mediaUrl}
                        alt="media"
                        className="rounded-lg max-h-64 object-cover"
                      />
                    ) : (
                      <video
                        src={m.mediaUrl}
                        controls
                        className="rounded-lg max-h-64 object-cover"
                      />
                    )}
                  </div>
                )}

                {m.text && (
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                )}

                {m.createdAt && (
                  <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}></div>
      </div>

      {/* ✍️ Input */}
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
  );
}
