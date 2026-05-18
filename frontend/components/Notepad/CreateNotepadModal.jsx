"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

export default function CreateNotepadModal({ isOpen, onConfirm, onCancel, creating }) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (isOpen) setTitle("");
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) onConfirm(title);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Create New Notepad
              </h3>
              <button
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5">
                <label className="text-sm text-muted-foreground mb-2 block">
                  Notepad Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Trip to the Mountains"
                  className="w-full bg-input border border-input rounded-lg px-4 py-2.5 text-foreground shadow-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex justify-end items-center gap-3 p-4 border-t border-border bg-muted">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg hover:bg-muted/80"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || !title.trim()}
                  className="flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Notepad"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
