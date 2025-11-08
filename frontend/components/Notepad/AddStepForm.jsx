import { useState } from "react";
import { PlusCircle, Loader2 } from "lucide-react";

export default function AddStepForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onAdd({ title, notes, date });
    setTitle("");
    setNotes("");
    setDate("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a step (e.g., Go to train station)"
        className="bg-gray-900/60 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm outline-none focus:border-purple-500"
      />
      <div className="flex gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-gray-900/60 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm flex-1"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="bg-gray-900/60 border border-gray-700 text-gray-300 rounded-md px-3 py-2 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-all"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <PlusCircle size={16} />
          )}
          Add
        </button>
      </div>
    </form>
  );
}
