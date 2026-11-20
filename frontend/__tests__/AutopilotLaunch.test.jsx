import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { api } from "@/lib/api";

const mockPush = jest.fn();
let mockPath = "/dashboard";
let mockToken = "test-token";
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => mockPath }));
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: mockToken, loading: false }) }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn() } }));
let mockUid = "user-1";
jest.mock("@/lib/firebaseClient", () => ({ auth: { get currentUser() { return { uid: mockUid }; } } }));

const Launch = require("@/components/autopilot/AutopilotLaunch");
const { resetAutopilotCaps } = require("@/components/autopilot/useAutopilotSession");
const { resetBriefing } = require("@/components/autopilot/briefing");

const data = {
  "/agent/capabilities": { enabled: true, ai: { mode: "ai", label: "Groq" } },
  "/agent/groups": [{ _id: "a".repeat(24), name: "Goa Trip" }, { _id: "b".repeat(24), name: "Flat" }],
  "/balances/summary": { totalOwed: 1200, totalOwe: 450, perGroup: {} },
  "/agent/runs": [{ _id: "c".repeat(24), status: "waiting_approval", message: "Dinner" }],
};
// Small slices: effects (which arm the next timer) only run when each act() ends.
const flush = async (ms) => { for (let t = 0; t < ms; t += 100) await act(async () => { await jest.advanceTimersByTimeAsync(100); }); };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); mockUid = "user-1"; resetAutopilotCaps(); resetBriefing();
  mockPath = "/dashboard"; mockToken = "test-token";
  window.matchMedia = () => ({ matches: false });
  api.get.mockImplementation((url) => Promise.resolve({ data: data[url] }));
});
afterEach(() => { cleanup(); jest.useRealTimers(); });

test("first open of the day: a wordless blur, then it hands over to the workspace", async () => {
  const view = render(<Launch.default />);
  act(() => Launch.launchAutopilot());
  expect(mockPush).toHaveBeenCalledWith("/autopilot");
  const overlay = screen.getByRole("status", { name: "Opening Autopilot" });
  expect(overlay.textContent).toBe(""); // nothing to read
  // It warms up the workspace's data while it plays.
  expect(api.get.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining(["/agent/groups", "/balances/summary", "/agent/runs"]));
  // It waits for the page it is opening before clearing.
  await flush(2000);
  expect(screen.getByRole("status")).toBeInTheDocument();
  mockPath = "/autopilot";
  view.rerender(<Launch.default />);
  await flush(800);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("only once per user in 24 hours: later opens go straight to the page", async () => {
  render(<Launch.default />);
  act(() => Launch.launchAutopilot({ stay: true }));
  fireEvent.click(screen.getByRole("status")); // a tap skips it
  await flush(700);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  act(() => Launch.launchAutopilot());
  expect(mockPush).toHaveBeenCalledWith("/autopilot");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  // 24 hours later it plays again.
  jest.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1000);
  act(() => Launch.launchAutopilot({ stay: true }));
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("the limit is per user: someone else on the same browser still gets their first open", () => {
  render(<Launch.default />);
  act(() => Launch.launchAutopilot({ stay: true }));
  cleanup();
  mockUid = "user-2";
  render(<Launch.default />);
  act(() => Launch.launchAutopilot({ stay: true }));
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("a page that never arrives can't keep it on screen", async () => {
  render(<Launch.default />);
  act(() => Launch.launchAutopilot());
  await flush(4800);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("reduced motion: go straight there with no blur", () => {
  window.matchMedia = () => ({ matches: true });
  render(<Launch.default />);
  act(() => Launch.launchAutopilot());
  expect(mockPush).toHaveBeenCalledWith("/autopilot");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
