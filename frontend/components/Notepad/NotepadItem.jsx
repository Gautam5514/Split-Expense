import { Trash2, Calendar } from "lucide-react";

export default function NotepadItem({ step, onDelete }) {
  return (
    <div className="flex justify-between items-center bg-gray-900/70 border border-gray-700/60 rounded-lg px-4 py-2 text-sm">
      <div className="flex flex-col">
        <span className="text-gray-100 font-medium">{step.title}</span>
        {step.date && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar size={10} /> {step.date}
          </span>
        )}
        {step.notes && <p className="text-xs text-gray-400">{step.notes}</p>}
      </div>
      <button
        onClick={onDelete}
        className="text-gray-500 hover:text-red-400 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
