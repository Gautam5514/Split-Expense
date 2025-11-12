"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileText } from "lucide-react";
import OcrReceipt from "./OcrReceipt"; // <--- 1. Import the new component

export default function OcrViewModal({ ocrText, imageUrl, onClose }) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 120, damping: 15 }}
                    className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-gray-100"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                        <div className="flex items-center gap-2">
                            <FileText className="text-indigo-400" size={20} />
                            <h2 className="text-lg font-semibold">OCR Receipt Details</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Image Preview */}
                        {imageUrl && (
                            <div className="rounded-lg overflow-hidden border border-gray-800 shadow-lg">
                                <img
                                    src={imageUrl}
                                    alt="Receipt"
                                    className="w-full max-h-80 object-contain bg-black"
                                />
                            </div>
                        )}

                        {/* Formatted OCR Text */}
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 shadow-inner">
                            {/* --- 2. Replace the old <p> tag with the new component --- */}
                            <OcrReceipt text={ocrText} />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}