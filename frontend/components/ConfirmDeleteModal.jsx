"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ConfirmDeleteModal({ isOpen, onConfirm, onCancel, title, description }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-destructive" size={22} />
            </div>

            {/* Title */}
            <h2 className="text-lg font-extrabold text-foreground text-center">
              {title || "Delete this trip?"}
            </h2>

            {/* Description */}
            <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
              {description ||
                "This action cannot be undone. All expenses, notes, group messages, and member data will be permanently removed."}
            </p>

            {/* Warning pill */}
            <div className="mt-4 flex items-center gap-2 bg-destructive/5 border border-destructive/15 rounded-xl px-4 py-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium">
                After deletion, your data cannot be recovered.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-semibold text-sm shadow transition cursor-pointer"
              >
                <Trash2 size={14} />
                Yes, Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
