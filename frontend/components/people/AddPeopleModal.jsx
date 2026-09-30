"use client";

import { useState } from "react";
import { X, Loader2, UserPlus, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "@/lib/toast";
import PeoplePicker from "@/components/people/PeoplePicker";
import { addPeopleToGroup, describeAddResult } from "@/lib/people";

// "Add people" sheet on the group page (creator only).
export default function AddPeopleModal({ groupId, onClose, onDone, onShareLink }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!selected.length) return;
    try {
      setSaving(true);
      const result = await addPeopleToGroup(groupId, selected);
      toast.success(describeAddResult(result));
      onDone?.(result);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add people");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] sm:p-4" onClick={() => !saving && onClose?.()}>
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[420px] max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-card shadow-xl">
        <div className="flex items-center justify-between pl-5 pr-4 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold text-foreground">Add people</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          <PeoplePicker groupId={groupId} selected={selected} onChange={setSelected} />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          {onShareLink && (
            <button type="button" onClick={onShareLink}
              className="h-11 flex items-center justify-center gap-1.5 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
              <Link2 size={15} /> Link
            </button>
          )}
          <button type="button" onClick={submit} disabled={saving || !selected.length}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus size={15} />}
            {selected.length ? `Add ${selected.length}` : "Add"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
