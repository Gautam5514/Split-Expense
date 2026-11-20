import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";

let mockToken = "test-token";
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: mockToken, loading: false }) }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock("@/lib/firebaseClient", () => ({ auth: { currentUser: { uid: "user-1" } } }));
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
const Workspace = require("@/components/autopilot/AutopilotWorkspace").default;
const { resetAutopilotCaps } = require("@/components/autopilot/useAutopilotSession");
const { resetBriefing } = require("@/components/autopilot/briefing");

const GOA = "a".repeat(24);
const RUN = "b".repeat(24);
const data = {
  "/agent/capabilities": { enabled: true, writesEnabled: true, ai: { mode: "ai", label: "Groq" }, features: ["edit_plan", "send_statement"] },
  "/agent/groups": [{ _id: GOA, name: "Goa Trip", groupType: "trip", settings: { currency: "INR" } }],
  "/agent/runs": [{ _id: RUN, message: "Dinner 1200 paid by me", status: "waiting_approval", createdAt: new Date().toISOString(), groupId: GOA }],
  "/balances/summary": { totalOwed: 1200, totalOwe: 450, perGroup: { [GOA]: 600 } },
  "/agent/monitors": { rules: [{ _id: "c".repeat(24), groupId: GOA, thresholds: [75, 90], enabled: true }], notices: [] },
};
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); resetAutopilotCaps(); resetBriefing(); mockToken = "test-token";
  Element.prototype.scrollTo = jest.fn();
  api.get.mockImplementation(url => (url in data ? Promise.resolve({ data: data[url] }) : url === `/agent/runs/${RUN}` ? Promise.resolve({ data: { ...data["/agent/runs"][0], writesEnabled: true, planVersion: 1, payloadHash: "f".repeat(64), plan: { steps: [{ id: "s1", type: "create_expense", requiresApproval: true, payload: {} }], clarifications: [], questions: [], notes: [] }, events: [] } }) : Promise.reject(new Error(`unexpected ${url}`))));
});
afterEach(cleanup);

test("shows groups with balances, earlier requests and budget alerts next to the conversation", async () => {
  render(<Workspace />);
  const groups = await screen.findByRole("listbox", { name: "Group Autopilot works in" });
  expect(await within(groups).findByText("Goa Trip")).toBeInTheDocument();
  expect(await within(groups).findByText("+₹600")).toBeInTheDocument();
  // It opens already knowing where the user stands, and offers the next move.
  expect(await screen.findByText(/You’re in 1 group\. ₹1,200 is owed to you and you owe ₹450\./)).toBeInTheDocument();
  const forYou = await screen.findByRole("region", { name: "For you right now" });
  expect(within(forYou).getByText("One plan is waiting for you")).toBeInTheDocument();
  expect(within(forYou).getByText("Collect in Goa Trip")).toBeInTheDocument();
  expect(await screen.findByText("75%")).toBeInTheDocument();
  expect(screen.queryByText("What I can do here")).not.toBeInTheDocument();
});

test("the message box shows where the request will land, and shortcuts step aside while typing", async () => {
  const user = userEvent.setup(); render(<Workspace />);
  await screen.findByText("Ready when you are");
  // No group chosen: the picker in the box says so, and offers the general shortcuts.
  expect(screen.getByRole("button", { name: "Group context" })).toHaveTextContent("All groups");
  expect(screen.getByRole("button", { name: "My total balance" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Group context" }));
  await user.click(within(screen.getAllByRole("listbox").at(-1)).getByText("Goa Trip"));
  expect(screen.getByRole("button", { name: "Group context" })).toHaveTextContent("Goa Trip");
  expect(await screen.findByRole("button", { name: "Who owes whom?" })).toBeInTheDocument();
  expect(screen.queryByText(/unless you say otherwise/)).not.toBeInTheDocument();
  // Typing clears the shortcuts out of the way and shows how to send.
  await user.type(screen.getByRole("textbox", { name: "Message Autopilot" }), "Dinner 1200");
  expect(screen.queryByRole("button", { name: "Who owes whom?" })).not.toBeInTheDocument();
  expect(screen.getByText("Enter")).toBeInTheDocument();
});

test("a library card fills an editable draft and sends nothing", async () => {
  const user = userEvent.setup(); render(<Workspace />);
  await screen.findByText("Ready when you are");
  await user.click(screen.getByRole("tab", { name: "Add bills" }));
  await user.click(screen.getByRole("button", { name: /Split a dinner/ }));
  expect(screen.getByRole("textbox", { name: "Message Autopilot" })).toHaveValue("Dinner 3600 paid by me, split equally");
  expect(api.post).not.toHaveBeenCalled();
});

test("an earlier request reopens with its plan ready to approve", async () => {
  const user = userEvent.setup(); render(<Workspace />);
  await user.click(await screen.findByRole("button", { name: /One plan is waiting for you/ }));
  expect(await screen.findByText("Ready for your approval")).toBeInTheDocument();
  // The header says what the agent is doing, never which model runs it.
  expect(screen.getByText("Plan ready. Waiting for your OK")).toBeInTheDocument();
  expect(screen.queryByText(/Groq/)).not.toBeInTheDocument();
  // And the side panel lists what it has done and what it will do.
  const feed = screen.getByRole("region", { name: "What Autopilot is doing" });
  expect(within(feed).getByText("Read your request")).toBeInTheDocument();
  expect(within(feed).getByText("Planned 1 step")).toBeInTheDocument();
  expect(within(feed).getByText("Waiting for your OK")).toBeInTheDocument();
  expect(screen.getAllByText("Dinner 1200 paid by me").length).toBeGreaterThan(0);
});

test("the side panel stays out of the way until there is work to show", async () => {
  const quiet = { ...data, "/agent/monitors": { rules: [], notices: [] } };
  api.get.mockImplementation(url => (url in quiet ? Promise.resolve({ data: quiet[url] }) : url.startsWith("/agent/runs/") ? Promise.resolve({ data: { ...data["/agent/runs"][0], writesEnabled: true, planVersion: 1, payloadHash: "f".repeat(64), plan: { steps: [{ id: "s1", type: "create_expense", requiresApproval: true, payload: {} }], clarifications: [], questions: [], notes: [] }, events: [] } }) : Promise.reject(new Error("x"))));
  const user = userEvent.setup(); render(<Workspace />);
  await screen.findByText("Ready when you are");
  expect(await screen.findByText("Collect in Goa Trip")).toBeInTheDocument();
  // Nothing asked yet: no side panel, no balance box, no empty budget box.
  expect(screen.queryByRole("complementary", { name: "What Autopilot is doing" })).not.toBeInTheDocument();
  expect(screen.queryByText("You’re owed")).not.toBeInTheDocument();
  expect(screen.queryByText(/Budget watch/i)).not.toBeInTheDocument();
  // Work starts: it appears with the activity.
  await user.click(screen.getByRole("button", { name: /One plan is waiting for you/ }));
  const panel = await screen.findByRole("complementary", { name: "What Autopilot is doing" });
  expect(within(panel).getByText("Read your request")).toBeInTheDocument();
});

test("side data failing never blocks the conversation", async () => {
  api.get.mockImplementation(url => (["/agent/capabilities", "/agent/groups"].includes(url) ? Promise.resolve({ data: data[url] }) : Promise.reject(new Error("down"))));
  const user = userEvent.setup(); render(<Workspace />);
  await screen.findByText("Ready when you are");
  expect(await screen.findByText("Couldn’t load your earlier requests.")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Message Autopilot" }), "Who owes whom?");
  await waitFor(() => expect(screen.getByRole("button", { name: "Send" })).toBeEnabled());
});

test("signed-out visitors are asked to sign in", () => {
  mockToken = null;
  render(<Workspace />);
  expect(screen.getByRole("heading", { name: "Sign in to use Autopilot" })).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});
