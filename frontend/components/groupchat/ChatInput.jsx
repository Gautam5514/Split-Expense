"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import socket from "@/lib/socket";
import { Paperclip, Send, X, Loader2 } from "lucide-react";

export default function ChatInput({ conversationId, isGroup = false }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleTyping = () => {
    const userId = localStorage.getItem("userId");
    if (!conversationId) return;
    if (isGroup) {
      socket.emit("groupTyping", { groupId: conversationId, userId });
    } else {
      socket.emit("typing", { conversationId, userId });
    }
  };

  const sendMessage = async () => {
    if ((!text && !file) || loading) return;
    try {
      setLoading(true);
      const base64 = file ? await fileToBase64(file) : null;

      if (isGroup) {
        await api.post(`/groups/${conversationId}/message`, {
          text,
          file: base64,
        });
        // ✅ We don't manually append message — socket will handle it.
      } else {
        const res = await api.post("/chat/message", {
          conversationId,
          text,
          file: base64,
        });
        socket.emit("sendMessage", res.data.data);
      }

      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("sendMessage error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t bg-[#f0f2f5] p-3 flex items-center gap-3">
      <label
        htmlFor="fileUpload"
        className="cursor-pointer text-gray-600 hover:text-gray-800"
      >
        <Paperclip className="w-5 h-5" />
      </label>

      <input
        type="file"
        id="fileUpload"
        ref={fileInputRef}
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files[0];
          if (f) setFile(f);
        }}
      />

      {file && (
        <div className="flex items-center gap-2 bg-white border px-3 py-1 rounded-full">
          <p className="text-sm text-gray-700 max-w-[150px] truncate">
            {file.name}
          </p>
          <button
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
      )}

      <input
        type="text"
        value={text}
        placeholder="Type a message..."
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          } else {
            handleTyping();
          }
        }}
        className="flex-1 px-4 py-2 rounded-full border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
      />

      <button
        onClick={sendMessage}
        disabled={loading}
        className={`bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition ${
          loading ? "opacity-70" : ""
        }`}
      >
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
      </button>
    </div>
  );
}
