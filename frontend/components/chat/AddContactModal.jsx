"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, MessageSquarePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import useDebounce from "@/hooks/useDebounce";
import toast from "@/lib/toast";

export default function AddContactModal({ onClose, onSelectContact }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingConvoId, setAddingConvoId] = useState(null);

  const fetchUsers = async (search) => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/users", {
        params: { q: search, limit: 12 },
      });
      setResults(res.data?.items || []);
    } catch (err) {
      console.error("fetchUsers error:", err);
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(debouncedQuery);
  }, [debouncedQuery]);

  const handleStartChat = async (user) => {
    try {
      setAddingConvoId(user._id);
      
      // Call getOrCreateConversation in the backend
      await api.post("/chat", { otherEmail: user.email });
      
      toast.success(`Chat started with ${user.name}! 💬`);
      
      // Callback to parent to refresh the contact list and select this user
      onSelectContact({
        _id: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        unread: 0,
        lastMessage: "",
        lastMessageAt: new Date(),
      });
      
      onClose();
    } catch (err) {
      console.error("Start chat error:", err);
      toast.error(err.response?.data?.message || "Failed to start conversation");
    } finally {
      setAddingConvoId(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-5 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageSquarePlus className="text-violet-500" size={20} />
                Start new conversation
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Find anyone on SplitEase to start chatting</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-muted-foreground/60" size={16} />
              <input
                type="text"
                placeholder="Search name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-slate-900/50 text-foreground text-sm rounded-xl pl-10 pr-4 py-3 border border-border focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-0.5 rounded bg-muted/60"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results Window */}
            <div className="max-h-[300px] min-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Loader2 size={24} className="animate-spin text-primary mb-2" />
                  Searching global database...
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {results.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between py-3 hover:bg-foreground/5 rounded-xl px-2 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {u.imageUrl ? (
                          <img
                            src={u.imageUrl}
                            alt={u.name || "Contact"}
                            className="w-10 h-10 rounded-full object-cover border border-border shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shadow-inner">
                            {u.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartChat(u)}
                        disabled={addingConvoId !== null}
                        className="flex items-center gap-1 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-60 shadow-sm cursor-pointer animate-pulse"
                      >
                        {addingConvoId === u._id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          "Chat"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="text-center py-16 text-xs text-muted-foreground italic">
                  No users found matching &quot;{query}&quot;
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs text-center px-4">
                  <MessageSquarePlus className="text-muted-foreground/30 mb-2" size={32} />
                  <p className="font-semibold text-foreground/75">Find friends to chat</p>
                  <p className="mt-1 text-muted-foreground/60">Type a name or email address in the search box above.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
