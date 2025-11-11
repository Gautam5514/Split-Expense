"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import ChatInput from "./ChatInput";

export default function GroupChatWindow({ activeGroup }) {
  const [messages, setMessages] = useState([]);
  const [me, setMe] = useState(null);
  const bottomRef = useRef(null);

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
    return colors[name?.charCodeAt(0) % colors.length];
  };

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isMine = (msg) => msg.sender._id === me?._id;

  if (!activeGroup)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a group to start chatting 💬
      </div>
    );

  return (
    <div className="flex flex-col w-3/4 h-full bg-[#efeae2]">
      <div className="border-b p-4 bg-[#f0f2f5] sticky top-0 z-10">
        <p className="font-medium text-gray-900">{activeGroup.name}</p>
        <p className="text-xs text-gray-500">
          {activeGroup.members?.length || 0} members
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((m) => {
          const mine = isMine(m);
          return (
            <div
              key={m._id}
              className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
            >
              {!mine && (
                <div className="mr-2 shrink-0">
                  {m.sender.imageUrl ? (
                    <img
                      src={m.sender.imageUrl}
                      alt={m.sender.name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-semibold uppercase ${getColorForName(
                        m.sender.name
                      )}`}
                    >
                      {m.sender.name?.charAt(0)}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`p-3 rounded-2xl max-w-[70%] shadow-sm ${
                  mine
                    ? "bg-[#d9fdd3] text-gray-900 rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none"
                }`}
              >
                {!mine && (
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    {m.sender.name}
                  </p>
                )}
                {m.text && <p>{m.text}</p>}
                {m.mediaUrl && (
                  <img
                    src={m.mediaUrl}
                    alt="media"
                    className="rounded-lg mt-2 max-h-64 object-cover"
                  />
                )}
                <span className="text-[10px] text-gray-500 float-right mt-1">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}></div>
      </div>

      <ChatInput conversationId={activeGroup._id} isGroup />
    </div>
  );
}
