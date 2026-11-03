import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";

jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: "test-token", loading: false }) }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/components/group/GroupTypeIcon", () => ({ __esModule: true, default: () => <span /> }));
jest.mock("@/components/autopilot/PlanSteps", () => ({ __esModule: true, default: () => <span>Plan preview</span> }));
jest.mock("framer-motion", () => {
  const React = require("react");
  const cache = {};
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    useReducedMotion: () => true,
    motion: new Proxy({}, { get: (_target, tag) => cache[tag] ||= React.forwardRef(function Motion({ initial, animate, exit, transition, whileHover, whileTap, ...props }, ref) { return React.createElement(tag, { ...props, ref }); }) }),
  };
});
process.env.NEXT_PUBLIC_AUTOPILOT_ENABLED = "true";
const Widget = require("@/components/autopilot/AutopilotWidget").default;
const STORE = "autopilot.thread.v1";
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  Element.prototype.scrollTo = jest.fn();
  api.get.mockImplementation(url => Promise.resolve({ data: url === "/agent/groups" ? [] : { enabled: true } }));
});
afterEach(cleanup);

test("task shortcuts fill an editable draft without sending a request", async () => {
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  await user.click(screen.getByRole("button", { name: /Split a bill/ }));
  expect(screen.getByRole("textbox", { name: "Message Autopilot" })).toHaveValue("Dinner 3600 paid by me, split equally, leave out Rahul");
  expect(api.post).not.toHaveBeenCalled();
});
test("connection failures offer a retry and preserve the draft", async () => {
  // Down for the launch check and the first open, back for the retry.
  let failures = 2;
  api.get.mockImplementation(url => url === "/agent/capabilities" && failures-- > 0 ? Promise.reject(new Error("offline")) : Promise.resolve({ data: url === "/agent/groups" ? [] : { enabled: true } }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await user.click(screen.getByRole("button", { name: /Split a bill/ }));
  await user.click(await screen.findByRole("button", { name: "Retry connection" }));
  await screen.findByText("Plan together. You’re in control.");
  expect(screen.getByRole("textbox")).toHaveValue("Dinner 3600 paid by me, split equally, leave out Rahul");
});
test("opening does not erase saved conversation before restoration", async () => {
  sessionStorage.setItem(STORE, JSON.stringify({ thread: [{ id: 42, role: "user", text: "My saved trip request" }] }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  expect(await screen.findByText("My saved trip request")).toBeInTheDocument();
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem(STORE)).thread[0].id).toBe(42));
});
test("invalid browser storage does not block a fresh chat", async () => {
  sessionStorage.setItem(STORE, "broken-json");
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  expect(await screen.findByText("Plan together. You’re in control.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Plan a trip/ })).toBeEnabled();
});
test("IME Enter does not submit a message while composing", async () => {
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  const box = screen.getByRole("textbox");
  fireEvent.change(box, { target: { value: "Dinner 500" } });
  fireEvent.keyDown(box, { key: "Enter", isComposing: true });
  expect(api.post).not.toHaveBeenCalled();
});
test("the launcher stays hidden when the server reports Autopilot is off", async () => {
  api.get.mockImplementation(() => Promise.reject({ response: { status: 404, data: { code: "AUTOPILOT_DISABLED" } } }));
  render(<Widget />);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Open Autopilot" })).not.toBeInTheDocument());
});
test("typing “yes” approves the plan that is waiting instead of starting a new request", async () => {
  const waiting = { _id: "a".repeat(24), status: "waiting_approval", writesEnabled: true, planVersion: 1, payloadHash: "f".repeat(64), plan: { steps: [{ id: "step_1", type: "create_expense", requiresApproval: true, payload: {} }], clarifications: [], questions: [], notes: [] }, events: [] };
  api.post.mockImplementation(url => Promise.resolve({ data: url === "/agent/runs" ? waiting : { ...waiting, status: "completed" } }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  await user.type(screen.getByRole("textbox"), "Dinner 1200 paid by me equally{Enter}");
  await screen.findByText("Ready for your approval");
  await user.type(screen.getByRole("textbox"), "yes{Enter}");
  await waitFor(() => expect(api.post).toHaveBeenLastCalledWith(`/agent/runs/${waiting._id}/decision`, expect.objectContaining({ decision: "approve", approvedStepIds: ["step_1"] })));
  expect(api.post.mock.calls.filter(([url]) => url === "/agent/runs")).toHaveLength(1);
});
test("typing “no” rejects the waiting plan", async () => {
  const waiting = { _id: "b".repeat(24), status: "waiting_approval", writesEnabled: true, planVersion: 1, payloadHash: "e".repeat(64), plan: { steps: [{ id: "step_1", type: "create_expense", requiresApproval: true, payload: {} }], clarifications: [], questions: [], notes: [] }, events: [] };
  api.post.mockImplementation(url => Promise.resolve({ data: url === "/agent/runs" ? waiting : { ...waiting, status: "rejected" } }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  await user.type(screen.getByRole("textbox"), "Dinner 1200 paid by me equally{Enter}");
  await screen.findByText("Ready for your approval");
  await user.type(screen.getByRole("textbox"), "no{Enter}");
  await waitFor(() => expect(api.post).toHaveBeenLastCalledWith(`/agent/runs/${waiting._id}/decision`, expect.objectContaining({ decision: "reject", approvedStepIds: [] })));
});
test("a run that stopped making progress offers Resume and Stop", async () => {
  const stuck = { _id: "c".repeat(24), status: "running", stale: true, plan: { steps: [{ id: "step_1", type: "create_expense", requiresApproval: true, payload: {} }], clarifications: [], questions: [], notes: [] }, events: [] };
  sessionStorage.setItem(STORE, JSON.stringify({ thread: [{ id: 1, role: "agent", runId: stuck._id }] }));
  api.get.mockImplementation(url => Promise.resolve({ data: url === "/agent/groups" ? [] : url.startsWith("/agent/runs/") ? stuck : { enabled: true } }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  expect(await screen.findByRole("button", { name: /Resume/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Stop here" })).toBeInTheDocument();
});
test("rate limits get a friendly message, not “couldn't reach the server”", async () => {
  api.post.mockRejectedValue({ response: { status: 429, data: { code: "RATE_LIMITED" } } });
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  await user.type(screen.getByRole("textbox"), "Dinner 1200 paid by me equally{Enter}");
  expect(await screen.findByText(/going a little fast/)).toBeInTheDocument();
});
test("a large plan needs the Approve button, which names the amount", async () => {
  const big = { _id: "d".repeat(24), status: "waiting_approval", writesEnabled: true, planVersion: 1, payloadHash: "d".repeat(64), plan: { steps: [{ id: "step_1", type: "create_expense", requiresApproval: true, payload: { amountMinor: 6000000, currency: "INR" } }], clarifications: [], questions: [], notes: [] }, events: [] };
  api.post.mockImplementation(url => Promise.resolve({ data: url === "/agent/runs" ? big : { ...big, status: "completed" } }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  await user.type(screen.getByRole("textbox"), "Hotel 60000 paid by me equally{Enter}");
  expect(await screen.findByRole("button", { name: /Approve ₹60,000/ })).toBeInTheDocument();
  await user.type(screen.getByRole("textbox"), "yes{Enter}");
  expect(await screen.findByText(/large amount/)).toBeInTheDocument();
  expect(api.post.mock.calls.filter(([url]) => url.endsWith("/decision"))).toHaveLength(0);
});
test("a delete needs the red button: typing “yes” doesn't delete", async () => {
  const del = { _id: "e".repeat(24), status: "waiting_approval", writesEnabled: true, planVersion: 1, payloadHash: "e".repeat(64), plan: { steps: [{ id: "step_1", type: "delete_group", requiresApproval: true, payload: { name: "Goa Trip", currency: "INR", impact: { members: 3, expenses: 4, totalMinor: 500000 } } }], clarifications: [], questions: [], notes: [] }, events: [] };
  api.post.mockImplementation(url => Promise.resolve({ data: url === "/agent/runs" ? del : { ...del, status: "completed" } }));
  const user = userEvent.setup(); render(<Widget />);
  await user.click(screen.getByRole("button", { name: "Open Autopilot" }));
  await screen.findByText("Plan together. You’re in control.");
  await user.type(screen.getByRole("textbox"), "delete this group{Enter}");
  const button = await screen.findByRole("button", { name: /Delete permanently/ });
  await user.type(screen.getByRole("textbox"), "yes{Enter}");
  expect(await screen.findByText(/can't be undone/)).toBeInTheDocument();
  expect(api.post.mock.calls.filter(([url]) => url.endsWith("/decision"))).toHaveLength(0);
  await user.click(button);
  await waitFor(() => expect(api.post).toHaveBeenLastCalledWith(`/agent/runs/${del._id}/decision`, expect.objectContaining({ decision: "approve" })));
});
