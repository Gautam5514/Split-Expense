import { Trash2, Calendar, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function NotepadItem({ step, onDelete }) {
  // Format the date for better readability
  const formattedDate = step.date
    ? new Date(step.date).toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start justify-between bg-gray-900/70 border border-gray-700/60 rounded-lg p-3 text-sm transition-all hover:border-purple-500/50 hover:bg-gray-900"
    >
      <div className="flex-1 space-y-2">
        <p className="font-semibold text-gray-100">{step.title}</p>
        
        {step.notes && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FileText size={12} className="flex-shrink-0" />
            <p className="break-words">{step.notes}</p>
          </div>
        )}
        
        {formattedDate && (
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Calendar size={12} />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>
      
      <button
        onClick={onDelete}
        className="ml-4 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
        aria-label="Delete step"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
}