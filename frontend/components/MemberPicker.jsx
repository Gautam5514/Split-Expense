"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import useDebounce from "@/hooks/useDebounce";
import toast from "react-hot-toast";
import { Loader2, Search, UserPlus, Mail, Check, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MemberPicker({ groupId, onSubmit, exclude = [] }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 400);
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
        params: { q: searchTerm, limit: 10 },
      });
      const data = (res.data || []).filter((u) => !exclude.includes(u.email));
      setOptions(data);
    } catch {
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
    <motion.form
      layout
      onSubmit={submit}
      className="w-full bg-card border border-border rounded p-6 space-y-5 text-foreground"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
          <UserPlus size={18} />
          Add Members
        </h3>

        {selected.length > 0 && (
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
          >
            Add {selected.length} {selected.length > 1 ? "Members" : "Member"}
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-4 text-muted-foreground" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-input text-foreground rounded-lg pl-10 pr-4 py-3 
          border border-input shadow-sm focus:outline-none focus:ring-2 
          focus:ring-primary transition-all"
        />
      </div>

      {!hasSearch && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Mail size={14} className="text-primary" />
          Search a name or email to find users.
        </div>
      )}

      {/* Results */}
      <AnimatePresence initial={false}>
        {hasSearch && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="bg-muted border border-border rounded-xl p-3"
          >
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 size={16} className="animate-spin mr-2" />
                Searching users...
              </div>
            ) : options.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {options.map((u) => (
                    <motion.li
                      key={u._id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative bg-card border border-border hover:border-primary/50 
                      rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex items-center gap-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.name || "User"}
                              className="w-10 h-10 rounded-full object-cover border border-border shadow-sm"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {u.name || "Unnamed User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggle(u.email)}
                          className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${selectedSet.has(u.email)
                              ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
                              : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                        >
                          {selectedSet.has(u.email) ? (
                            <Check size={16} />
                          ) : (
                            <Plus size={16} />
                          )}
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No users found for &quot;{query.trim()}&quot;.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {selected.slice(0, 5).map((email) => (
            <motion.div
              key={email}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 bg-primary/10 text-primary 
              border border-primary/20 px-3 py-1 rounded-full text-xs"
            >
              {email}
              <button
                onClick={() => toggle(email)}
                className="text-primary hover:text-primary/80 transition"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}

          {selected.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{selected.length - 5} more selected
            </span>
          )}
        </div>
      )}
    </motion.form>
  );
}
