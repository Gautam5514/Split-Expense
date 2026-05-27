"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { FileText, PlusCircle, Loader2 } from "lucide-react";

import NotepadItem from "./NotepadItem";
import AddStepForm from "./AddStepForm";
import CreateNotepadModal from "./CreateNotepadModal";

export default function NotepadSection({ groupId }) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notepads, setNotepads] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleCreateNotepad = async (title) => {
    if (!title) return;
    try {
      setCreating(true);
      const res = await api.post("/notepads", { groupId, title });
      setNotepads((prev) => [...prev, res.data]);
      toast.success("Notepad created successfully!");
      setIsModalOpen(false);
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

  const handleDeleteStep = async () => {
    toast("Delete step feature is coming soon!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center text-muted-foreground py-20">
        <Loader2 className="animate-spin mr-3" />
        <span>Loading Notepads...</span>
      </div>
    );
  }

  return (
    <>
      <CreateNotepadModal
        isOpen={isModalOpen}
        onConfirm={handleCreateNotepad}
        onCancel={() => setIsModalOpen(false)}
        creating={creating}
      />

      <section className="bg-card border border-border rounded p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
            <FileText size={22} className="text-primary" />
            <span>Group Notepads</span>
          </h2>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg shadow"
          >
            <PlusCircle size={16} />
            New Notepad
          </button>
        </div>

        <div className="space-y-6">
          {notepads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted">
              <p className="font-semibold text-lg text-foreground">No Notepads Yet</p>
              <p className="text-sm mt-1 text-muted-foreground">
                Click 'New Notepad' to start planning!
              </p>
            </div>
          ) : (
            notepads.map((notepad, index) => (
              <motion.div
                key={notepad._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-muted border border-border rounded-xl p-5 hover:border-primary/50 transition"
              >
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {notepad.title}
                </h3>

                {notepad.steps.length > 0 && (
                  <div className="space-y-3 mb-5">
                    {notepad.steps.map((step) => (
                      <NotepadItem
                        key={step._id}
                        step={step}
                        onDelete={() => handleDeleteStep(notepad._id, step._id)}
                      />
                    ))}
                  </div>
                )}

                <AddStepForm
                  onAdd={(step) => handleAddStep(notepad._id, step)}
                />
              </motion.div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
