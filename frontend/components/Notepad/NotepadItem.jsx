import { Trash2, Calendar, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function NotepadItem({ step, onDelete }) {
  const formattedDate = step.date
    ? new Date(step.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start justify-between bg-card border border-border rounded-lg p-3 text-sm hover:border-primary transition"
    >
      <div className="flex-1 space-y-2">
        <p className="font-semibold text-foreground">{step.title}</p>

        {step.notes && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText size={12} />
            <p className="break-words">{step.notes}</p>
          </div>
        )}

        {formattedDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={12} />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        className="ml-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
}
