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

  // 🧠 Load my profile + conversation
  useEffect(() => {
    const init = async () => {
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

  // 🧩 Auto-scroll
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
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-3 bg-[#f0f2f5] sticky top-0 z-10">
        <img
          src={activeFriend.photoURL || "/avatar.png"}
          alt="friend"
          className="w-9 h-9 rounded-full object-cover"
        />
        <div>
          <p className="font-medium text-gray-900">{activeFriend.name}</p>
          <p className="text-xs text-gray-500">{activeFriend.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#efeae2]">
        {messages.map((m, index) => {
          const mine = isMine(m);
          return (
            <div
              key={m._id || index}
              className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
            >
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

      {/* Input */}
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
