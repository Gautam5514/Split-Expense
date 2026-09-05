"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { X, Users, Loader2 } from "lucide-react";

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
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
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
      const res = await api.post("/groups", { name: trimmed });
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
        className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Create New Group</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Give it a name to get started</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 pt-5 space-y-4">
          <div>
            <input
              autoFocus
              value={name}
              maxLength={100}
              placeholder="e.g. Goa Trip"
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              className={`w-full rounded-xl bg-background text-foreground border p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                nameError ? "border-destructive focus:ring-destructive/40" : "border-border"
              }`}
            />
            {nameError && <p className="text-destructive text-xs mt-1.5">{nameError}</p>}
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
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              {creating ? "Creating…" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
