"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { getAuth } from "firebase/auth";
import socket from "@/lib/socket";
import { Paperclip, Send, Image, Smile } from "lucide-react";

export default function ChatInput({ conversationId, onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const sendMessage = async () => {
    if (!text.trim() && !file) return;
    try {
      const base64 = file ? await fileToBase64(file) : null;
      const res = await api.post("/chat/message", {
        conversationId,
        text: text.trim(),
        file: base64,
      });

      onSend(res.data.data);
      socket.emit("sendMessage", res.data.data);

      setText("");
      setFile(null);
    } catch (err) {
      console.error("❌ send message failed:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  return (
    <div className="w-full border-t bg-white p-3 flex items-center gap-3">
      {/* File attachment button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded-full hover:bg-gray-100 transition"
        title="Attach media"
      >
        <Paperclip className="w-5 h-5 text-gray-600" />
      </button>
      <input
        type="file"
        hidden
        ref={fileInputRef}
        accept="image/*,video/*"
        onChange={handleFileSelect}
      />

      {/* Message input */}
      <div className="flex-1 relative">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full resize-none text-gray-900 border border-gray-300 rounded-full py-2 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
        {file && (
          <span className="absolute right-10 top-2 text-xs text-blue-600 font-medium truncate max-w-[100px]">
            {file.name}
          </span>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={sendMessage}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition"
        title="Send message"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
