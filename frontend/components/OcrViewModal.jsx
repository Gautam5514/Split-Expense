"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ImageIcon } from "lucide-react";

export default function OcrViewModal({ imageUrl, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <ImageIcon className="text-primary" size={18} />
              <h2 className="text-base font-semibold">Receipt</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Image only */}
          <div className="p-4">
            {imageUrl ? (
              <div className="rounded-xl overflow-hidden border border-border shadow-lg">
                <img
                  src={imageUrl}
                  alt="Receipt"
                  className="w-full object-contain bg-black max-h-[75vh]"
                />
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-10">No image available.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}