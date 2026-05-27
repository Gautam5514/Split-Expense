import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

export default function AddStepForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onAdd({ title, notes, date });
      setTitle("");
      setNotes("");
      setDate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4 border-t border-border pt-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a new step (e.g., Book flight tickets)"
        className="w-full bg-input border border-input text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="bg-input border border-input text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-input border border-input text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Adding...
          </>
        ) : (
          <>
            <Plus size={16} /> Add Step
          </>
        )}
      </button>
    </form>
  );
}
