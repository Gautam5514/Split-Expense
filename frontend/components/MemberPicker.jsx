"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import useDebounce from "@/hooks/useDebounce";
import toast from "react-hot-toast";
import { Loader2, Search, UserPlus, Mail, Check } from "lucide-react";
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
          Add Members to Group
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

      {/* Search Bar */}
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
          Try searching an email of a user you want to add.
        </div>
      )}

      {/* Results */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Searching users…
          </div>
        ) : options.length > 0 ? (
          <ul className="divide-y divide-gray-800 max-h-72 overflow-auto">
            <AnimatePresence>
              {options.map((u) => (
                <motion.li
                  key={u._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-3 hover:bg-gray-800/60 transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-100 truncate">
                      {u.name || "Unnamed User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggle(u.email)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      selectedSet.has(u.email)
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {selectedSet.has(u.email) ? (
                      <>
                        <Check size={12} />
                        Selected
                      </>
                    ) : (
                      "Select"
                    )}
                  </button>
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
          {selected.map((email) => (
            <span
              key={email}
              className="text-xs bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 px-3 py-1 rounded-full"
            >
              {email}
            </span>
          ))}
        </div>
      )}
    </motion.form>
  );
}
