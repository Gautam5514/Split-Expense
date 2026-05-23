"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import useDebounce from "@/hooks/useDebounce";
import toast from "@/lib/toast";
import { Loader2, Search, UserPlus, Mail, Check, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MemberPicker({ groupId, onSubmit, onClose, exclude = [] }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const searchTerm = debounced.trim();
  const hasSearch = query.trim().length > 0;

  const fetchOptions = async () => {
    if (!groupId || !searchTerm) {
      setOptions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/groups/${groupId}/available-users`, {
        params: { q: searchTerm, limit: 12 },
      });
      const data = (res.data || []).filter((u) => !exclude.includes(u.email));
      setOptions(data);
    } catch (err) {
      console.error("fetchOptions error:", err);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [searchTerm, groupId]);

  const toggle = (email) => {
    setSelected((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!selected.length) return toast.error("Select at least one user.");
    onSubmit?.(selected);
    setSelected([]);
    setQuery("");
  };

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        {/* Main Glass Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer z-10"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="border-b border-border p-6 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="text-violet-500" size={22} />
              <h2 className="text-xl font-bold text-foreground">
                Add Group Members
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Search for users by name or email, select them, and add them to this group.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Search Input Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-muted-foreground/60" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email address..."
                className="w-full bg-slate-100/50 dark:bg-slate-900/50 text-foreground text-sm rounded-xl pl-10 pr-4 py-3 border border-border focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-3.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Helper State */}
            {!hasSearch && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
                <Mail size={14} className="text-violet-500 animate-pulse" />
                <span>Search name or email to view matching registered SplitEase users.</span>
              </div>
            )}

            {/* Results Grid - Spacious List View for complete Name and Email Visibility */}
            <div className="max-h-[280px] min-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Loader2 size={24} className="animate-spin text-primary mb-2" />
                  Searching user catalog...
                </div>
              ) : options.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {options.map((u) => {
                    const isChecked = selectedSet.has(u.email);
                    return (
                      <div
                        key={u._id}
                        onClick={() => toggle(u.email)}
                        className="flex items-center justify-between py-3 px-2 hover:bg-foreground/5 rounded-xl transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.name || "User"}
                              className="w-10 h-10 rounded-full object-cover border border-border shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-inner">
                              {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                            </div>
                          )}

                          {/* Full Name & Email completely visible and readable */}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {u.name || "Unnamed User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        {/* Interactive select check circle */}
                        <div
                          className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isChecked
                              ? "bg-primary border-primary text-primary-foreground scale-110 shadow-sm"
                              : "border-border text-transparent hover:border-primary/50"
                          }`}
                        >
                          <Check size={14} className="stroke-[3px]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : hasSearch ? (
                <div className="text-center py-16 text-xs text-muted-foreground italic">
                  No registered users found matching &quot;{query}&quot;
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs text-center px-4">
                  <UserPlus className="text-muted-foreground/30 mb-2" size={32} />
                  <p className="font-semibold text-foreground/75">Select members to add</p>
                  <p className="mt-1 text-muted-foreground/60">Search for members in the search input above to begin.</p>
                </div>
              )}
            </div>

            {/* Selected Chips panel */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/80">
                {selected.slice(0, 6).map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20 px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    <span className="max-w-[150px] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggle(email); }}
                      className="text-violet-500 hover:text-violet-700 transition cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {selected.length > 6 && (
                  <span className="text-xs text-muted-foreground font-semibold flex items-center pl-1">
                    +{selected.length - 6} more selected
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-input rounded-xl hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={selected.length === 0}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                Add {selected.length} {selected.length === 1 ? "Member" : "Members"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
  );
}
