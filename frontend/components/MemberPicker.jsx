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
  const [activeTab, setActiveTab] = useState("search"); // "search" | "email"
  const [manualEmail, setManualEmail] = useState("");

  const addManualEmail = (e) => {
    e?.preventDefault();
    const email = manualEmail.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (exclude.includes(email)) {
      toast.error("This user is already in the group.");
      return;
    }

    if (selected.includes(email)) {
      toast.error("This email is already selected.");
      return;
    }

    setSelected((prev) => [...prev, email]);
    setManualEmail("");
    toast.success("Email added to list!");
  };

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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      >
        {/* Main Glass Modal */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full sm:max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border/50 bg-card/95 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl max-h-[88dvh] overflow-y-auto"
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer z-10"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="border-b border-border px-5 pt-3 pb-4 sm:p-6 bg-gradient-to-r from-cyan-500/5 to-teal-500/5">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="text-cyan-600 dark:text-cyan-400" size={22} />
              <h2 className="text-xl font-bold text-foreground">
                Add Group Members
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Add friends to your trip instantly by email or search for registered members.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-border px-6 bg-muted/30">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 pb-3 pt-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "search"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search size={14} /> Add from Search
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`flex items-center gap-2 pb-3 pt-3 text-xs sm:text-sm font-bold border-b-2 transition-all ml-6 cursor-pointer ${
                activeTab === "email"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail size={14} /> Send Email
            </button>
          </div>

          <div className="p-6 space-y-5">
            {activeTab === "search" ? (
              <>
                {/* Search Input Box */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 text-muted-foreground/60" size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email address..."
                    className="w-full bg-muted/60 text-foreground text-sm rounded-xl pl-10 pr-4 py-3 border border-border focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all outline-none"
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
                    <Mail size={14} className="text-cyan-600 dark:text-cyan-400 animate-pulse" />
                    <span>Search name or email to view matching registered SplitEase users.</span>
                  </div>
                )}

                {/* Results Grid - Spacious List View */}
                <div className="max-h-[240px] min-h-[160px] overflow-y-auto custom-scrollbar pr-1">
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
              </>
            ) : (
              <>
                {/* Manual Email Input */}
                <form onSubmit={addManualEmail} className="flex gap-2.5">
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="Enter friend's email address..."
                    className="flex-grow bg-muted/60 text-foreground text-sm rounded-xl px-4 py-3 border border-border focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:opacity-95 transition cursor-pointer shrink-0"
                  >
                    <Plus size={16} /> Add Email
                  </button>
                </form>

                {/* Info details */}
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Mail size={16} className="text-cyan-600 dark:text-cyan-400 animate-pulse" />
                    <span>How Invite by Email works</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
                    <li>Enter any email — registered or not — and tap <strong>Add Email</strong>.</li>
                    <li><strong>Already on SplitEase?</strong> They&apos;ll be added to the group instantly.</li>
                    <li><strong>Not registered?</strong> We&apos;ll automatically send them a personalised invitation email with a direct join link.</li>
                  </ul>
                </div>
                <div className="min-h-[60px]" />
              </>
            )}

            {/* Selected Chips panel */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/80">
                {selected.slice(0, 6).map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 dark:text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    <span className="max-w-[150px] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggle(email); }}
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition cursor-pointer"
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
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-95 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-600/15"
              >
                Add {selected.length} {selected.length === 1 ? "Member" : "Members"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
  );
}
