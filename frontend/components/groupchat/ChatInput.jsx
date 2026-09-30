"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import socket from "@/lib/socket";
import { Paperclip, Send, Smile, Mic, Plus, X, Check, Loader2 } from "lucide-react";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄"]
  },
  {
    name: "Gestures",
    icon: "👍",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🍕", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "🔥", "✨", "🌟", "💥", "💭", "💬"]
  },
  {
    name: "Objects",
    icon: "🚀",
    emojis: ["🚀", "✈️", "🚗", "🚲", "🛵", "🛹", "💡", "🔦", "🔋", "🔌", "💻", "🖥️", "📱", "⌚", "🔑", "🔒", "🔓", "✏️", "✒️", "📝", "📁", "📂", "📅", "🎉", "🎈", "🎁", "💵", "💸", "💳", "🛒", "📚", "🔔", "📣", "🎤", "📷"]
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🍑", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🌽", "🥕", "🥔", "🥐", "🥯", "🍞", "🧀", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🍜", "🍝", "🍣", "🧁", "🍩", "🍪", "🎂", "☕", "🍵", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾"]
  }
];

export default function ChatInput({ conversationId, onSend, me }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const emojiPickerRef = useRef(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Outside click listener for emoji picker
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showEmojiPicker]);

  // Recording timer cleanup
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleTyping = () => {
    if (!conversationId || !me) return;
    socket.emit("groupTyping", { groupId: conversationId, userId: me._id });
  };

  // Handle standard/image message transmission (Optimistic update included)
  const sendMessage = async () => {
    if ((!text.trim() && !file) || loading) return;

    const tempId = "temp-" + Date.now();
    const localPreviewUrl = file ? URL.createObjectURL(file) : null;
    const isImage = file && file.type.startsWith("image/");

    const optimisticMsg = {
      _id: tempId,
      groupId: conversationId,
      sender: me ? { _id: me._id, name: me.name, imageUrl: me.imageUrl || me.photoURL } : { _id: "me", name: "You" },
      text: text.trim(),
      mediaUrl: localPreviewUrl,
      mediaType: file ? (isImage ? "image" : "video") : null,
      createdAt: new Date().toISOString(),
      status: "sending",
      _rawText: text.trim(),
      _rawFile: file,
      seenBy: [me?._id || "me"]
    };

    // Trigger parent visual updates instantly
    onSend(optimisticMsg);

    // Reset input fields instantly for premium visual response
    setText("");
    setFile(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      setLoading(true);
      const base64 = optimisticMsg._rawFile ? await fileToBase64(optimisticMsg._rawFile) : null;
      
      const res = await api.post(`/groups/${conversationId}/message`, {
        text: optimisticMsg._rawText,
        file: base64,
      });

      // Update state with confirmed API message (response data is populated message directly)
      onSend(res.data, tempId);
    } catch (err) {
      console.error("❌ send group message failed:", err);
      // Update state with failed tag
      onSend({ ...optimisticMsg, status: "failed" }, tempId);
    } finally {
      setLoading(false);
    }
  };

  // Handle voice message upload (Optimistic updates included)
  const sendVoiceMessage = async (base64Audio) => {
    const tempId = "temp-" + Date.now();
    const optimisticMsg = {
      _id: tempId,
      groupId: conversationId,
      sender: me ? { _id: me._id, name: me.name, imageUrl: me.imageUrl || me.photoURL } : { _id: "me", name: "You" },
      text: "[Voice Message]",
      mediaUrl: null,
      mediaType: "video", // Cloudinary resource_type "video" for audio
      createdAt: new Date().toISOString(),
      status: "sending",
      seenBy: [me?._id || "me"]
    };

    onSend(optimisticMsg);

    try {
      const res = await api.post(`/groups/${conversationId}/message`, {
        text: "[Voice Message]",
        file: base64Audio,
      });

      onSend(res.data, tempId);
    } catch (err) {
      console.error("❌ send group voice message failed:", err);
      onSend({ ...optimisticMsg, status: "failed" }, tempId);
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

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  // Emoji Click handler targeting caret position
  const handleEmojiClick = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const nextText = currentVal.substring(0, start) + emoji + currentVal.substring(end);
    setText(nextText);

    // Refocus and place cursor directly after inserted emoji
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    }, 15);
  };

  // Browser MediaRecorder Recording Controls
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          await sendVoiceMessage(base64Audio);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      isCancelledRef.current = false;

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone capture failed:", err);
      alert("Microphone permission is required to record voice notes.");
    }
  };

  const stopRecording = (shouldCancel = false) => {
    if (!mediaRecorderRef.current || !isRecording) return;
    isCancelledRef.current = shouldCancel;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatRecordingTime = (time) => {
    const min = Math.floor(time / 60);
    const sec = time % 60;
    return `${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex flex-col w-full relative bg-muted/95 px-4 py-3">
      
      {/* Premium Collapsible native Emoji Picker Panel */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-16 left-2 z-50 w-[290px] sm:w-[340px] h-[280px] bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
        >
          {/* Emojis list grid */}
          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar select-none">
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-2">
              {EMOJI_CATEGORIES[activeCategoryIdx].emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xl sm:text-2xl hover:bg-muted rounded-lg active:scale-90 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Emojis navigation categories footer */}
          <div className="h-11 bg-muted/60 border-t border-border/60 flex items-center justify-around shrink-0 px-2">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategoryIdx(idx)}
                className={`flex-1 h-8 flex items-center justify-center rounded-lg transition-colors text-lg ${
                  activeCategoryIdx === idx
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title={cat.name}
              >
                <span className="mr-1 text-base">{cat.icon}</span>
                <span className="hidden sm:inline text-xs">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Preview Pill */}
      {file && (
        <div className="flex items-center justify-between bg-muted p-2 mb-2 rounded-lg mx-2 shadow-sm border-l-4 border-emerald-500 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
          </div>
          <button
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-1 hover:bg-muted-foreground/20 rounded-full"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Dynamic Voice Recording Action Banner */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-muted/80 backdrop-blur-md rounded-xl py-2.5 px-4 border border-emerald-500/30 shadow-md w-full animate-pulse-slow">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-foreground">
              Recording Voice...
            </span>
            <span className="text-xs bg-red-500/10 text-red-500 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full font-mono">
              {formatRecordingTime(recordingTime)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Cancel Trigger */}
            <button
              onClick={() => stopRecording(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-background rounded-lg border border-border/40 hover:text-foreground transition-all active:scale-95 shadow-sm"
              title="Cancel recording"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            {/* Confirm Send Trigger */}
            <button
              onClick={() => stopRecording(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all active:scale-95 shadow-md font-semibold"
              title="Send recording"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Input strip */
        <div className="flex items-end gap-2 w-full animate-in fade-in duration-150">
          {/* Unified pill: emoji + attach + textarea all in one surface */}
          <div className="flex flex-1 items-end gap-0.5 rounded-[26px] border border-border bg-card pl-1.5 pr-2 py-1.5 shadow-sm transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(8,145,178,0.08)]">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                showEmojiPicker ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              }`}
              title="Emoji Picker"
            >
              <Smile className="w-[19px] h-[19px]" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
              title="Attach File"
            >
              <Plus className="w-[19px] h-[19px]" />
            </button>

            <input
              type="file"
              hidden
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileSelect}
            />

            <textarea
              rows={1}
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              className="flex-1 min-w-0 resize-none bg-transparent text-foreground focus:outline-none text-[14.5px] placeholder:text-muted-foreground/70 max-h-[100px] py-2 custom-scrollbar"
              style={{ minHeight: "24px" }}
            />
          </div>

          {/* Send / Mic - a distinct circular accent button, not tucked inside the pill */}
          {text.trim() || file ? (
            <button
              onClick={sendMessage}
              disabled={loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110 hover:scale-105 active:scale-95 disabled:opacity-60"
              title="Send message"
            >
              {loading ? (
                <Loader2 className="animate-spin w-[19px] h-[19px]" />
              ) : (
                <Send className="w-[19px] h-[19px] translate-x-[-1px]" />
              )}
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:border-emerald-500/40 hover:text-emerald-500 hover:scale-105 active:scale-95"
              title="Record voice message"
            >
              <Mic className="w-[19px] h-[19px]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
