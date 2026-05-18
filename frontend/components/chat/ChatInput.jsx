"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import socket from "@/lib/socket";
import { Paperclip, Send, Smile, Mic, Plus, X } from "lucide-react";

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
    <div className="flex flex-col w-full">
      {/* File Preview (Pops up above input if file selected) */}
      {file && (
        <div className="flex items-center justify-between bg-muted p-2 mb-2 rounded-lg mx-2 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center gap-2 overflow-hidden">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
          </div>
          <button onClick={() => setFile(null)} className="p-1 hover:bg-muted-foreground/20 rounded-full">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3 w-full">
        {/* Left Icons */}
        <div className="flex items-center gap-1 pb-1 text-muted-foreground">
          <button className="p-2 hover:bg-background rounded-full transition" title="Emoji">
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-background rounded-full transition"
            title="Attach"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <input
          type="file"
          hidden
          ref={fileInputRef}
          accept="image/*,video/*"
          onChange={handleFileSelect}
        />

        {/* Input Field */}
        <div className="flex-1 bg-input rounded-xl px-4 py-2 border border-input focus-within:border-primary/40 shadow-sm">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="w-full resize-none bg-transparent text-foreground focus:outline-none text-[15px] placeholder:text-muted-foreground max-h-[100px] py-1"
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Right Icons (Mic or Send) */}
        <div className="flex items-center pb-1">
          {text.trim() || file ? (
            <button
              onClick={sendMessage}
              className="p-2 text-primary hover:bg-background rounded-full transition"
              title="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button className="p-2 text-muted-foreground hover:bg-background rounded-full transition" title="Voice message">
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
