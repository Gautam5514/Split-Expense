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
  api.get.mockRejectedValueOnce(new Error("offline"));
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
