import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, ...p }) => <a href={href} {...p}>{children}</a> }));
jest.mock("framer-motion", () => {
  const React = require("react");
  const cache = {};
  return { motion: new Proxy({}, { get: (_t, tag) => cache[tag] ||= React.forwardRef(function Motion({ initial, animate, exit, transition, ...props }, ref) { return React.createElement(tag, { ...props, ref }); }) }) };
});
const PlanSteps = require("@/components/autopilot/PlanSteps").default;
const me = "a".repeat(24), aman = "b".repeat(24), rahul = "c".repeat(24);
const expenseRun = (extra = {}) => ({
  status: "waiting_approval", results: [],
  plan: { steps: [{ id: "step_1", action: 0, type: "create_expense", title: "Record “Dinner”", requiresApproval: true, payload: {
    groupId: "g".repeat(24), currency: "INR", name: "Dinner", amountMinor: 300000, payerId: me, splitType: "equal", category: "food",
    splits: [{ memberId: me, name: "You", shareMinor: 150000 }, { memberId: aman, name: "Aman", shareMinor: 150000 }],
    roster: [{ memberId: me, name: "You" }, { memberId: aman, name: "Aman" }, { memberId: rahul, name: "Rahul" }], ...extra } }] },
});

test("the plan card edits amount and people without retyping", async () => {
  const onEdit = jest.fn(); const user = userEvent.setup();
  render(<PlanSteps run={expenseRun()} groupName={() => "Flat"} onEdit={onEdit} />);
  expect(screen.getByText(/split equally · Food/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Edit amount or people/ }));
  const amount = screen.getByRole("textbox", { name: /Amount/ });
  await user.clear(amount); await user.type(amount, "4500");
  await user.click(screen.getByRole("button", { name: "Rahul" }));
  await user.click(screen.getByRole("button", { name: "Update plan" }));
  expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "step_1" }), { amount: "4500", excluded: [] });
});
test("Update plan stays disabled until something changes", async () => {
  const user = userEvent.setup();
  render(<PlanSteps run={expenseRun()} groupName={() => "Flat"} onEdit={jest.fn()} />);
  await user.click(screen.getByRole("button", { name: /Edit amount or people/ }));
  expect(screen.getByRole("button", { name: "Update plan" })).toBeDisabled();
});
test("no edit button without server support or after approval", () => {
  const { rerender } = render(<PlanSteps run={expenseRun()} groupName={() => "Flat"} />);
  expect(screen.queryByRole("button", { name: /Edit amount/ })).not.toBeInTheDocument();
  rerender(<PlanSteps run={{ ...expenseRun(), status: "running" }} groupName={() => "Flat"} onEdit={jest.fn()} />);
  expect(screen.queryByRole("button", { name: /Edit amount/ })).not.toBeInTheDocument();
});
test("overall balance and expense list render their results", () => {
  const run = { status: "completed", plan: { steps: [
    { id: "step_1", type: "read_overall", title: "Show your balance across all groups (no changes)", requiresApproval: false, payload: { groupId: null, currency: "INR" } },
    { id: "step_2", type: "list_expenses", title: "Show recent expenses (no changes)", requiresApproval: false, payload: { groupId: "g".repeat(24), currency: "INR" } },
  ] }, results: [
    { stepId: "step_1", verified: true, overall: { groups: [{ groupId: "g".repeat(24), name: "Goa", currency: "INR", balanceMinor: -120000 }], settledCount: 2, totals: { INR: { owedMinor: 0, oweMinor: 120000 } } } },
    { stepId: "step_2", verified: true, expenses: [{ id: "e1", title: "Taxi", amountMinor: 90000, paidBy: "Aman", category: "travel", date: "2026-11-01T00:00:00Z" }] },
  ] };
  render(<PlanSteps run={run} groupName={() => "Goa"} />);
  expect(screen.getByText("Goa")).toBeInTheDocument();
  expect(screen.getByText(/Settled up in 2 other groups/)).toBeInTheDocument();
  expect(screen.getByText("Taxi")).toBeInTheDocument();
  expect(screen.getByText(/Aman · Travel/)).toBeInTheDocument();
});
test("delete steps show a permanent-warning card with what will be lost", () => {
  const run = { status: "waiting_approval", results: [], plan: { steps: [{ id: "step_1", type: "delete_group", title: "Delete group “Goa Trip” permanently", requiresApproval: true, payload: { groupId: "g".repeat(24), name: "Goa Trip", currency: "INR", impact: { members: 3, expenses: 4, totalMinor: 500000 } } }] } };
  render(<PlanSteps run={run} groupName={() => "Goa Trip"} />);
  expect(screen.getByText(/Permanent. This can/)).toBeInTheDocument();
  expect(screen.getByText("₹5,000")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
});
