"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Send, Bot, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import React from "react";

// --- Main Page Component ---
export default function AiPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef(null);

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, loading]);
  
  const askAI = async (currentPrompt = prompt) => {
    const trimmedPrompt = currentPrompt.trim();
    if (!trimmedPrompt || loading) return;

    setLoading(true);

    const userMessage = { role: "user", content: trimmedPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");

    try {
      const res = await api.post("/ai/query", { prompt: trimmedPrompt });
      const aiText = res.data?.text || "I'm sorry, I couldn't find an answer.";
      setMessages((prev) => [...prev, { role: "ai", content: aiText }]);
    } catch (err) {
      console.error("AI error:", err);
      toast.error("The AI is currently unavailable. Please try again later.");
      // Rollback the user message on error
      setMessages((prev) => prev.filter((msg) => msg !== userMessage));
    } finally {
      setLoading(false);
    }
  };
  
  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    askAI(suggestion);
  };


  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full filter blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <main className="w-full max-w-3xl mx-auto flex flex-col h-screen p-4 sm:p-6 z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-6 text-center"
        >
          <Sparkles className="h-8 w-8 text-emerald-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">SplitEase AI</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your intelligent trip and expense assistant.</p>
          </div>
        </motion.div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Messages Area */}
          <div ref={scrollAreaRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
            <AnimatePresence>
              {messages.length > 0 ? (
                messages.map((m, i) => <ChatMessage key={i} message={m} />)
              ) : (
                <EmptyState onSuggestionClick={handleSuggestionClick} />
              )}
              {loading && <ThinkingIndicator />}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            askAI={askAI}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}

// --- Reusable Child Components ---

/**
 * Renders a single chat message for either the user or the AI.
 */
const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
          <Bot size={18} />
        </div>
      )}
      <div
        className={`px-4 py-3 rounded-2xl max-w-[85%] sm:max-w-[75%] whitespace-pre-wrap ${
          isUser
            ? "bg-emerald-500 text-white rounded-br-lg"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
};

/**
 * Renders the text input and send button area.
 */
const ChatInput = ({ prompt, setPrompt, askAI, loading }) => {
  const inputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [prompt]);
  
  const handleSend = () => askAI(prompt);
  
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="relative">
        <textarea
          ref={inputRef}
          rows="1"
          className="w-full resize-none border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow duration-200"
          placeholder="How much did I spend in my Kolkata trip?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{ maxHeight: "150px" }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !prompt.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-emerald-500 text-white transition-all duration-200 hover:bg-emerald-600 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * Renders the "Thinking..." animation for the AI.
 */
const ThinkingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3"
  >
    <div className="flex-shrink-0 h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
      <Bot size={18} />
    </div>
    <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-bl-lg flex items-center gap-2">
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="h-2 w-2 bg-gray-400 rounded-full" />
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }} className="h-2 w-2 bg-gray-400 rounded-full" />
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} className="h-2 w-2 bg-gray-400 rounded-full" />
    </div>
  </motion.div>
);

/**
 * Renders the initial view before any messages are sent.
 */
const EmptyState = ({ onSuggestionClick }) => {
  const suggestions = [
    "How much did I spend on the Goa trip?",
    "How many members are in the 'Kolkata Trip' group?",
    "Who owes money in the Bhopal group?",
    "What is the capital of Japan?",
  ];

  return (
    <div className="text-center text-gray-500 dark:text-gray-400 py-10 px-4">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Welcome to your AI Assistant!</h2>
      <p className="mb-6">Ask me anything about your trips or expenses. Here are some ideas:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s)}
            className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors text-left"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};