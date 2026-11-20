import { money } from "./format";

// What Autopilot did for one request, as a short list a person can read:
// "Read your request", "Planned 2 steps", "You approved it", "Added “Dinner” ₹1,200".
// Pure logic, no UI. THE SAME FILE BODY LIVES IN THE WEB APP AND THE MOBILE APP
// (frontend/components/autopilot/activity.js and splitApp/lib/autopilotActivity.js):
// change both together.

const READS = ["read_summary", "read_overall", "list_expenses"];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const quoted = (name) => (name ? ` “${name}”` : "");

// Each kind of step, said before it happens and after it has happened.
function stepWords(step) {
  const p = step?.payload || {};
  const amount = p.amountMinor !== undefined ? ` ${money(p.amountMinor, p.currency)}` : "";
  const people = Array.isArray(p.people) ? plural(p.people.length, "person").replace("persons", "people") : "people";
  switch (step?.type) {
    case "create_group": return [`Create the group${quoted(p.name)}`, `Created the group${quoted(p.name)}`];
    case "add_members": return [`Add ${people}`, `Added ${people}`];
    case "set_group_budget": return [`Set the budget${amount ? ` to${amount}` : ""}`, `Set the budget${amount ? ` to${amount}` : ""}`];
    case "create_expense": return [`Add${quoted(p.name)}${amount}`, `Added${quoted(p.name)}${amount}`];
    case "monitor_budget": return ["Turn on budget alerts", "Turned on budget alerts"];
    case "read_summary": return ["Work out who owes whom", "Worked out who owes whom"];
    case "read_overall": return ["Add up your balances", "Added up your balances"];
    case "list_expenses": return ["Look up the expenses", "Looked up the expenses"];
    case "delete_expense": return [`Delete${quoted(p.name)}${amount}`, `Deleted${quoted(p.name)}${amount}`];
    case "delete_group": return [`Delete the group${quoted(p.name)}`, `Deleted the group${quoted(p.name)}`];
    case "complete_group": return [`Mark${quoted(p.name) || " the group"} completed`, `Marked${quoted(p.name) || " the group"} completed`];
    case "send_statement": return ["Email everyone the statement", "Emailed everyone the statement"];
    default: return [step?.title || "Next step", step?.title || "Step done"];
  }
}

/**
 * The timeline for one run.
 * Each item: { id, text, state, at } where state is
 *   "done" (finished), "now" (happening), "todo" (will happen after approval),
 *   "wait" (needs the user), "bad" (stopped / declined).
 */
export function runActivity(run) {
  if (!run) return [];
  const status = run.status;
  const steps = run.plan?.steps || [];
  const events = run.events || [];
  const results = run.results || [];
  const has = (type) => events.some((e) => e.type === type);
  const when = (type, stepId) => [...events].reverse().find((e) => e.type === type && (!stepId || e.data?.stepId === stepId))?.at || null;
  const out = [];
  const add = (id, text, state, at = null) => out.push({ id, text, state, at });

  add("read", "Read your request", "done", when("run.started") || run.createdAt || null);
  if (status === "planning") {
    add("plan", run.stale ? "Stopped before a plan was ready. Nothing was changed" : "Working out a plan", run.stale ? "bad" : "now");
    return out;
  }
  const superseded = has("run.superseded");
  if (!steps.length) {
    if (status === "clarification_required") add("ask", "Needs a detail from you", "wait", when("clarification.required"));
    else if (superseded) add("replaced", "Continued in your next message", "done", when("run.superseded"));
    else if (status === "failed") add("failed", "Couldn’t make a plan. Nothing was changed", "bad", when("run.failed"));
    else if (status === "cancelled" || status === "rejected") add("cancelled", "Cancelled. Nothing was changed", "bad");
    return out;
  }

  const readOnly = steps.every((s) => READS.includes(s.type));
  if (!readOnly) add("plan", `Planned ${plural(steps.length, "step")}`, "done", when("plan.ready") || when("clarification.required"));

  const done = (s) => results.some((r) => r.stepId === s.id && r.verified);
  const waiting = status === "clarification_required" || status === "waiting_approval";
  const stopped = status === "failed" || status === "partial_success";
  const declined = status === "rejected" || has("plan.rejected");
  const dropped = !done(steps[0]) && (declined || superseded || status === "cancelled");

  if (has("plan.approved") && !dropped) add("approved", "You approved it", "done", when("plan.approved"));
  if (!dropped) {
    let current = status === "running" || stopped;
    for (const s of steps) {
      const [todo, past] = stepWords(s);
      if (done(s)) add(s.id, past, "done", when("step.verified", s.id));
      else if (current) { add(s.id, stopped ? `Couldn’t finish: ${todo.charAt(0).toLowerCase()}${todo.slice(1)}` : todo, stopped ? "bad" : "now"); current = false; }
      else add(s.id, todo, "todo");
    }
  }

  if (status === "clarification_required") add("ask", "Needs a detail from you", "wait", when("clarification.required"));
  else if (status === "waiting_approval") add("ok", "Waiting for your OK", "wait", when("plan.ready"));
  else if (superseded) add("replaced", "Continued in your next message", "done", when("run.superseded"));
  else if (declined) add("declined", "You said not now. Nothing was changed", "bad", when("plan.rejected"));
  else if (status === "cancelled") add("cancelled", results.length ? "Stopped here. Finished steps are saved" : "Cancelled. Nothing was changed", "bad", when("run.cancelled"));
  else if (stopped) add("stopped", results.length ? "Stopped here. Finished steps are saved" : "Stopped. Nothing was changed", "bad", when("run.failed"));
  else if (status === "completed" && !readOnly) add("verified", "Checked against your ledger", "done", when("run.completed"));
  return out.filter((item) => !(waiting && item.state === "now"));
}

/**
 * One line for "what is the agent doing right now", and how to colour it:
 * tone is "busy" (working), "wait" (needs the user) or "ok" (idle / done).
 * Never names a model or provider.
 */
export function activityHeadline({ connection = "ready", busy = false, run = null } = {}) {
  if (connection === "error") return { text: "Can’t connect right now", tone: "wait" };
  if (connection === "disabled") return { text: "Switched off", tone: "wait" };
  if (connection !== "ready") return { text: "Getting ready…", tone: "busy" };
  if (busy) return { text: "Understanding your request…", tone: "busy" };
  switch (run?.status) {
    case "planning": return run.stale ? { text: "That one stopped. Try again", tone: "wait" } : { text: "Working out a plan…", tone: "busy" };
    case "running": return run.stale ? { text: "Taking longer than usual", tone: "wait" } : { text: "Doing what you approved…", tone: "busy" };
    case "clarification_required": return { text: "Needs one detail from you", tone: "wait" };
    case "waiting_approval": return { text: "Plan ready. Waiting for your OK", tone: "wait" };
    case "completed": return { text: "Done. Ready for the next thing", tone: "ok" };
    case "partial_success": return { text: "Stopped part-way. Needs a look", tone: "wait" };
    case "failed": return { text: "That didn’t go through", tone: "wait" };
    default: return { text: "Ready when you are", tone: "ok" };
  }
}
