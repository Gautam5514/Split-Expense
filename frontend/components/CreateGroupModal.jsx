"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { X, Plane, Home, Loader2, Check, Plus } from "lucide-react";

// Mirrors splitApp/app/create-group.jsx so web and app offer the same
// trip/roommate group-type picker (same ids, copy, gradients, suggestions).
const TYPES = [
  {
    id: "trip",
    title: "Trip Split",
    desc: "Travel, outings & one-off events",
    Icon: Plane,
    gradient: ["#6366F1", "#8B5CF6"],
  },
  {
    id: "roommate",
    title: "Roommate Split",
    desc: "Rent, bills & shared household costs",
    Icon: Home,
    gradient: ["#0891B2", "#14B8A6"],
  },
];

const SUGGESTIONS = {
  trip: ["Goa Trip", "Weekend Getaway", "Office Offsite", "Birthday Bash"],
  roommate: ["Flat 304", "Apartment Bills", "Hostel Room", "PG Expenses"],
};

const PLACEHOLDER = {
  trip: "e.g. Goa Trip",
  roommate: "e.g. Flat 304",
};

/**
 * Shared create-group modal used by both /dashboard and /users so the two
 * pages stay in sync instead of each keeping its own duplicated form.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onCreated: (createdGroup) => void   // called with the full API response data
 */
export default function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const [type, setType] = useState("trip");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const active = TYPES.find((t) => t.id === type) || TYPES[0];
  const [g1, g2] = active.gradient;

  const reset = () => {
    setType("trip");
    setName("");
    setNameError("");
    setCreating(false);
  };

  const handleClose = () => {
    if (creating) return;
    reset();
    onClose?.();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Group name is required.");
      return;
    }
    if (trimmed.length < 2) {
      setNameError("Must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Must be under 100 characters.");
      return;
    }
    setNameError("");
    try {
      setCreating(true);
      const res = await api.post("/groups", { name: trimmed, groupType: type });
      toast.success("Group created successfully!");
      const created = res.data;
      reset();
      onClose?.();
      onCreated?.(created);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field === "name") setNameError(data.message);
      else toast.error(data?.message || "Error creating group");
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-bold text-foreground">Create New Group</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-5 space-y-5">
          {/* Live gradient preview */}
          <div
            className="rounded-xl p-4 flex items-center gap-3 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          >
            <div className="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-white font-black text-lg">
              {name.trim() ? name.trim().charAt(0).toUpperCase() : <active.Icon size={20} />}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">
                {name.trim() || "Untitled group"}
              </p>
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/85 bg-white/15 px-2 py-0.5 rounded-full">
                {active.title}
              </span>
            </div>
          </div>

          {/* Name input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">Group name</label>
              <span className="text-[10px] text-muted-foreground">{name.length}/100</span>
            </div>
            <input
              autoFocus
              value={name}
              maxLength={100}
              placeholder={PLACEHOLDER[type]}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              className={`w-full rounded-xl bg-background text-foreground border p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                nameError ? "border-destructive focus:ring-destructive" : "border-border"
              }`}
            />
            {nameError && <p className="text-destructive text-xs mt-1">{nameError}</p>}

            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTIONS[type].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setName(s);
                    if (nameError) setNameError("");
                  }}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Group type</label>
            {TYPES.map((t) => {
              const selected = t.id === type;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
                    style={{ background: `linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[1]})` }}
                  >
                    <t.Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
                    {selected && <Check size={12} className="text-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={creating}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
              {creating ? "Creating…" : `Create ${active.title}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
