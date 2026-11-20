import { runActivity, activityHeadline } from "@/components/autopilot/activity";

const G = "g".repeat(24);
const ev = (type, data = {}, at = "2026-11-21T10:00:00.000Z") => ({ type, at, data });
const expense = { id: "s1", type: "create_expense", requiresApproval: true, payload: { groupId: G, name: "Dinner", currency: "INR", amountMinor: 120000 } };
const group = { id: "s0", type: "create_group", requiresApproval: true, payload: { name: "Goa Trip", currency: "INR" } };
const texts = (run) => runActivity(run).map((x) => `${x.state}:${x.text}`);

test("while planning it says so, and a stalled plan is called out", () => {
  expect(texts({ status: "planning", events: [ev("run.started"), ev("planning.started")] })).toEqual(["done:Read your request", "now:Working out a plan"]);
  expect(texts({ status: "planning", stale: true, events: [] })[1]).toMatch(/^bad:Stopped before a plan was ready/);
});

test("a plan waiting for approval lists what it will do, then asks for the OK", () => {
  const run = { status: "waiting_approval", plan: { steps: [group, expense] }, results: [], events: [ev("run.started"), ev("plan.ready")] };
  expect(texts(run)).toEqual([
    "done:Read your request", "done:Planned 2 steps",
    "todo:Create the group “Goa Trip”", "todo:Add “Dinner” ₹1,200",
    "wait:Waiting for your OK",
  ]);
});

test("after approval each step moves from now to done, ending with the ledger check", () => {
  const base = { plan: { steps: [group, expense] }, events: [ev("run.started"), ev("plan.ready"), ev("plan.approved")] };
  expect(texts({ ...base, status: "running", results: [{ stepId: "s0", verified: true }] })).toEqual([
    "done:Read your request", "done:Planned 2 steps", "done:You approved it",
    "done:Created the group “Goa Trip”", "now:Add “Dinner” ₹1,200",
  ]);
  const finished = { ...base, status: "completed", results: [{ stepId: "s0", verified: true }, { stepId: "s1", verified: true }], events: [...base.events, ev("step.verified", { stepId: "s1" }, "2026-11-21T10:00:05.000Z"), ev("run.completed")] };
  expect(texts(finished).slice(-3)).toEqual(["done:Created the group “Goa Trip”", "done:Added “Dinner” ₹1,200", "done:Checked against your ledger"]);
  expect(runActivity(finished).find((x) => x.id === "s1").at).toBe("2026-11-21T10:00:05.000Z");
});

test("a question that only reads the ledger is not dressed up as a plan", () => {
  const run = { status: "completed", plan: { steps: [{ id: "r1", type: "read_summary", payload: { groupId: G } }] }, results: [{ stepId: "r1", verified: true }], events: [ev("run.started"), ev("run.completed")] };
  expect(texts(run)).toEqual(["done:Read your request", "done:Worked out who owes whom"]);
});

test("stopping part-way, declining and being replaced each say what happened to the user's data", () => {
  const plan = { steps: [group, expense] };
  expect(texts({ status: "partial_success", plan, results: [{ stepId: "s0", verified: true }], events: [ev("plan.approved"), ev("run.failed")] }).slice(-2))
    .toEqual(["bad:Couldn’t finish: add “Dinner” ₹1,200", "bad:Stopped here. Finished steps are saved"]);
  expect(texts({ status: "rejected", plan, results: [], events: [ev("plan.rejected")] }).slice(-1)).toEqual(["bad:You said not now. Nothing was changed"]);
  expect(texts({ status: "cancelled", plan, results: [], events: [ev("run.superseded")] }).slice(-1)).toEqual(["done:Continued in your next message"]);
  expect(texts({ status: "clarification_required", plan: { steps: [] }, events: [ev("clarification.required")] }).slice(-1)).toEqual(["wait:Needs a detail from you"]);
});

test("the headline says what the agent is doing and never names a model", () => {
  expect(activityHeadline({ connection: "loading" })).toEqual({ text: "Getting ready…", tone: "busy" });
  expect(activityHeadline({ busy: true })).toEqual({ text: "Understanding your request…", tone: "busy" });
  expect(activityHeadline({ run: { status: "waiting_approval" } })).toEqual({ text: "Plan ready. Waiting for your OK", tone: "wait" });
  expect(activityHeadline({ run: { status: "running" } }).tone).toBe("busy");
  expect(activityHeadline({ run: { status: "completed" } }).tone).toBe("ok");
  expect(activityHeadline({}).text).toBe("Ready when you are");
  expect(activityHeadline({ connection: "error", run: { status: "running" } }).tone).toBe("wait");
});
