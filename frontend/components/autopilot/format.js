export const money = (minor, currency = "INR") => {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : undefined, { style: "currency", currency, minimumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
};

export const STAGES = ["Understand", "Plan", "Review", "Execute", "Verify"];

// Where a run sits on the five-stage pipeline: `at` is the active stage,
// `tone` colours it. Terminal-bad states stop on the stage that failed.
export function stageFor(status) {
  switch (status) {
    case "planning": return { at: 1, tone: "active" };
    case "clarification_required": return { at: 1, tone: "warn" };
    case "waiting_approval": return { at: 2, tone: "active" };
    case "running": return { at: 3, tone: "active" };
    case "completed": return { at: 5, tone: "done" };
    case "partial_success": return { at: 3, tone: "warn" };
    case "failed": return { at: 3, tone: "bad" };
    case "rejected": return { at: 2, tone: "bad" };
    case "cancelled": return { at: 2, tone: "bad" };
    default: return { at: 0, tone: "active" };
  }
}

export const STATUS = {
  planning: { label: "Preparing your plan", dot: "bg-sky-500" },
  clarification_required: { label: "Needs a detail", dot: "bg-amber-500" },
  waiting_approval: { label: "Awaiting your approval", dot: "bg-cyan-500" },
  running: { label: "Executing approved steps", dot: "bg-sky-500" },
  completed: { label: "Completed & verified", dot: "bg-emerald-500" },
  partial_success: { label: "Partly completed", dot: "bg-amber-500" },
  failed: { label: "Needs attention", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", dot: "bg-zinc-400" },
  rejected: { label: "Rejected", dot: "bg-zinc-400" },
};

export const PEOPLE_COLORS = [
  "bg-cyan-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-sky-500", "bg-fuchsia-500", "bg-lime-500",
];
export const initials = (name = "?") => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
