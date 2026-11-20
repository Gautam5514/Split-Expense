import { render, screen, cleanup, within } from "@testing-library/react";

jest.mock("@/lib/api", () => ({ api: { get: jest.fn(() => Promise.resolve({ data: { me: "", people: {} } })) } }));
jest.mock("framer-motion", () => {
  const React = require("react");
  const cache = {};
  return { motion: new Proxy({}, { get: (_t, tag) => cache[tag] ||= React.forwardRef(function M({ initial, animate, exit, transition, ...props }, ref) { return React.createElement(tag, { ...props, ref }); }) }) };
});
const PlanSteps = require("@/components/autopilot/PlanSteps").default;
afterEach(cleanup);

const G = "a".repeat(24), RAVI = "b".repeat(24), GAUTAM = "c".repeat(24);
const summaryRun = {
  status: "completed",
  plan: { steps: [{ id: "s1", type: "read_summary", title: "Explain balances and suggest settlements (no payment)", payload: { groupId: G, name: "Nov 2026", currency: "INR" } }] },
  results: [{
    stepId: "s1", verified: true,
    members: [{ id: RAVI, name: "Ravi Kumar" }, { id: GAUTAM, name: "Gautam Pandit" }],
    balances: { [RAVI]: 95.5, [GAUTAM]: -95.5 },
    settlements: [{ from: GAUTAM, to: RAVI, amount: 95.5 }],
    insights: { totalMinor: 47300, expenseCount: 8, averageMinor: 5913, categories: [{ name: "food", amountMinor: 30000 }], budget: null },
  }],
};

test("a balance question is shown as an answer: the payment first, then balances, then spending, with no plan-card chrome", () => {
  render(<PlanSteps run={summaryRun} groupName={() => "Nov 2026"} />);
  expect(screen.getByText("Balances · Nov 2026")).toBeInTheDocument();
  // No numbered step title or "Verified" badge for something that changed nothing.
  expect(screen.queryByText(/Explain balances and suggest settlements/)).not.toBeInTheDocument();
  expect(screen.queryByText("Verified")).not.toBeInTheDocument();

  const order = ["One payment settles it", "Net balances", "Spending"].map((t) => screen.getByText(t));
  expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText("gets back ₹95.50")).toBeInTheDocument();
  expect(screen.getByText("owes ₹95.50")).toBeInTheDocument();
  expect(screen.getByText("₹473")).toBeInTheDocument();
  expect(screen.getByText("8 expenses · ₹59.13 average")).toBeInTheDocument();
});

test("a step that changes something still shows as a plan card to review", () => {
  const run = { status: "waiting_approval", results: [], plan: { steps: [{ id: "s1", type: "create_expense", title: "Record “Dinner”", requiresApproval: true, payload: { groupId: G, name: "Dinner", currency: "INR", amountMinor: 120000, splitType: "equal", splits: [{ memberId: RAVI, name: "Ravi Kumar", shareMinor: 60000 }, { memberId: GAUTAM, name: "You", shareMinor: 60000 }] } }] } };
  render(<PlanSteps run={run} groupName={() => "Nov 2026"} />);
  const card = screen.getByText("Record “Dinner”").closest("li");
  expect(within(card).getByText("Proposed")).toBeInTheDocument();
  expect(within(card).getByText("Ravi Kumar")).toBeInTheDocument();
});
