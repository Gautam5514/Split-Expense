"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import socket from "@/lib/socket";
import { Paperclip, Send, Smile, Mic, Plus, X, Loader2 } from "lucide-react";

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
    const userId = localStorage.getItem("userId"); // Ensure this logic matches your auth storage
    if (!conversationId) return;
    if (isGroup) {
      socket.emit("groupTyping", { groupId: conversationId, userId });
    } else {
      socket.emit("typing", { conversationId, userId });
    }
  };

  const sendMessage = async () => {
    if ((!text.trim() && !file) || loading) return;
    try {
      setLoading(true);
      const base64 = file ? await fileToBase64(file) : null;

      if (isGroup) {
        // Group logic: Socket usually handles the append via "newGroupMessage" event
        await api.post(`/groups/${conversationId}/message`, {
          text,
          file: base64,
        });
      } else {
        // 1-on-1 logic
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  return (
    <div className="flex flex-col w-full bg-muted/95 px-4 py-3">
      {/* File Preview Pill */}
      {file && (
        <div className="flex items-center justify-between bg-muted p-2 mb-2 rounded-lg mx-2 shadow-sm border-l-4 border-green-500 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground truncate max-w-[200px]">
              {file.name}
            </span>
          </div>
          <button
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-1 hover:bg-muted-foreground/20 rounded-full transition"
          >
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
          <label
            htmlFor="fileUpload"
            className="p-2 hover:bg-background rounded-full transition cursor-pointer"
            title="Attach"
          >
            <Plus className="w-5 h-5" />
          </label>
        </div>

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

        {/* Input Field */}
        <div className="flex-1 bg-input rounded-xl px-4 py-2 border border-input focus-within:border-primary/40 shadow-sm">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="w-full resize-none bg-transparent text-foreground focus:outline-none text-[15px] placeholder:text-muted-foreground py-1"
            style={{ minHeight: "24px", maxHeight: "100px" }}
          />
        </div>

        {/* Right Icons (Mic or Send) */}
        <div className="flex items-center pb-1">
          {text.trim() || file ? (
            <button
              onClick={sendMessage}
              disabled={loading}
              className="p-2 text-primary hover:bg-background rounded-full transition disabled:opacity-60"
              title="Send"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
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
