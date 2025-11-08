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

  const fetchOptions = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await api.get(`/groups/${groupId}/available-users`, {
        params: { q: debounced, limit: 10 },
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
  }, [debounced, groupId]);

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
      className="w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6 space-y-5 text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-400">
          <UserPlus size={18} />
          Add Members
        </h3>
        {selected.length > 0 && (
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
          >
            Add {selected.length} {selected.length > 1 ? "Members" : "Member"}
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-500" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-gray-800 text-gray-100 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-700 placeholder:text-gray-500 transition-all"
        />
      </div>

      {/* Hint */}
      {!query && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Mail size={14} className="text-emerald-400" />
          Try searching by user email or name.
        </div>
      )}

      {/* Results Section */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Searching users…
          </div>
        ) : options.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {options.map((u, idx) => (
                <motion.li
                  key={u._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:bg-gray-800/80 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.name || "User"}
                        className="w-10 h-10 rounded-full object-cover border border-gray-700 shadow-sm"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-700/30 flex items-center justify-center text-emerald-400 font-semibold text-sm shadow-inner">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                      <p className="font-medium text-gray-100 truncate">
                        {u.name || "Unnamed User"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggle(u.email)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                        selectedSet.has(u.email)
                          ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
                          : "border-gray-700 text-gray-400 hover:bg-gray-800"
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
          <div className="p-4 text-sm text-gray-500 text-center">
            No users found.
          </div>
        )}
      </div>

      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
          {selected.slice(0, 5).map((email) => (
            <motion.div
              key={email}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 px-3 py-1 rounded-full text-xs"
            >
              {email}
              <button
                onClick={() => toggle(email)}
                className="text-emerald-400 hover:text-emerald-300 transition"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
          {selected.length > 5 && (
            <span className="text-xs text-gray-400">
              +{selected.length - 5} more selected
            </span>
          )}
        </div>
      )}
    </motion.form>
  );
}
