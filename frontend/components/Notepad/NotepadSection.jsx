"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { FileText, PlusCircle, Loader2, Trash2 } from "lucide-react";
import NotepadItem from "./NotepadItem";
import AddStepForm from "./AddStepForm";

export default function NotepadSection({ groupId }) {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notepads, setNotepads] = useState([]);

  const fetchNotepads = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/notepads/${groupId}`);
      setNotepads(res.data || []);
    } catch (e) {
      toast.error("Failed to load notepads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchNotepads();
  }, [groupId]);

  const handleCreateNotepad = async () => {
    const title = prompt("Enter Notepad title");
    if (!title) return;
    try {
      setCreating(true);
      const res = await api.post("/notepads", { groupId, title });
      setNotepads((prev) => [...prev, res.data]);
      toast.success("Notepad created!");
    } catch (e) {
      toast.error("Failed to create notepad");
    } finally {
      setCreating(false);
    }
  };

  const handleAddStep = async (notepadId, step) => {
    try {
      const res = await api.post(`/notepads/${notepadId}/steps`, step);
      setNotepads((prev) =>
        prev.map((np) => (np._id === notepadId ? res.data : np))
      );
    } catch (e) {
      toast.error("Failed to add step");
    }
  };

  const handleDeleteStep = async (notepadId, stepId) => {
    try {
      // Not implemented in backend yet, but we can extend later
      toast("Delete step feature coming soon");
    } catch (e) {
      toast.error("Failed to delete step");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center text-gray-400 py-10">
        <Loader2 className="animate-spin mr-2" /> Loading notepads…
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-purple-400">
          <FileText size={18} /> Group Notepads
        </h2>
        <button
          onClick={handleCreateNotepad}
          disabled={creating}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md transition-all"
        >
          {creating ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Creating…
            </>
          ) : (
            <>
              <PlusCircle size={16} /> New Notepad
            </>
          )}
        </button>
      </div>

      {/* Empty */}
      {notepads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No notepads yet. Create one to start planning!
        </div>
      ) : (
        notepads.map((notepad) => (
          <motion.div
            key={notepad._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">{notepad.title}</h3>

            {notepad.steps.length === 0 ? (
              <p className="text-gray-500 text-sm">No steps added yet.</p>
            ) : (
              <div className="space-y-2">
                {notepad.steps.map((step) => (
                  <NotepadItem
                    key={step._id}
                    step={step}
                    onDelete={() => handleDeleteStep(notepad._id, step._id)}
                  />
                ))}
              </div>
            )}

            <AddStepForm onAdd={(step) => handleAddStep(notepad._id, step)} />
          </motion.div>
        ))
      )}
    </section>
  );
}
