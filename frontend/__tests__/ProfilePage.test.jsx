import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: "t", loading: false }) }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock("@/lib/firebaseClient", () => ({ auth: { onAuthStateChanged: (fn) => { fn(null); return () => {}; } } }));
jest.mock("@/lib/toast", () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn(), loading: jest.fn(() => "id") } }));
jest.mock("@/hooks/useCoins", () => ({ __esModule: true, default: () => 120 }));
jest.mock("@/components/Loader3D", () => ({ __esModule: true, default: () => <p>Loading</p> }));
jest.mock("@/components/profile/ReferralSection", () => ({ __esModule: true, default: () => <div>Rewards</div> }));
jest.mock("@/components/CoinBadge", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ui/TierBadge", () => ({ __esModule: true, default: () => null }));
jest.mock("framer-motion", () => {
  const React = require("react");
  const cache = {};
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: new Proxy({}, { get: (_t, tag) => cache[tag] ||= React.forwardRef(function M({ initial, animate, exit, transition, ...props }, ref) { return React.createElement(tag, { ...props, ref }); }) }),
  };
});
const Profile = require("@/app/profile/page").default;

const full = { name: "Gautam Pandit", email: "g@test.io", mobile: "+91 90000 00000", city: "Pune", state: "MH", timezone: "India Standard Time (IST)", profession: "Engineer", bio: "Splits everything.", upiId: "gautam@okaxis", upiQr: { url: "https://img.test/qr.png" }, profileImage: { url: "https://img.test/me.jpg" } };
const serve = (profile, summary = { totalOwed: 7179.93, totalOwe: 656.18, perGroup: { a: 1, b: 2, c: 0 } }) =>
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/profile" ? profile : url === "/balances/summary" ? summary : {} }));
beforeEach(() => { jest.clearAllMocks(); });
afterEach(cleanup);

test("shows who you are, where you stand and how to pay you", async () => {
  serve(full);
  const user = userEvent.setup(); render(<Profile />);
  const write = jest.spyOn(navigator.clipboard, "writeText"); // user-event provides the clipboard
  expect(await screen.findByText("Gautam Pandit")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Profile 100% complete" })).toBeInTheDocument();
  expect(await screen.findByText("₹7,179.93")).toBeInTheDocument();
  expect(screen.getByText("₹656.18")).toBeInTheDocument();
  expect(screen.getByText("Active groups").nextSibling).toHaveTextContent("3");
  const about = screen.getByRole("region", { name: "About you" });
  expect(within(about).getByText("Splits everything.")).toBeInTheDocument();
  expect(within(about).getByText("Pune, MH")).toBeInTheDocument();
  // A complete profile is not nagged.
  expect(screen.queryByText(/% complete$/)).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Copy UPI ID" }));
  expect(write).toHaveBeenCalledWith("gautam@okaxis");
  expect(await screen.findByText("Copied")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show your UPI QR code" }));
  expect(screen.getByRole("dialog", { name: "Your UPI QR code" })).toBeInTheDocument();
});

test("a missing detail is one tap away and opens the editor on that field", async () => {
  serve({ name: "Gautam", email: "g@test.io" });
  const user = userEvent.setup(); render(<Profile />);
  await screen.findByText("Gautam");
  expect(screen.getByText("13% complete")).toBeInTheDocument();
  expect(screen.getByText("Add your UPI ID")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Mobile number" }));
  await waitFor(() => expect(screen.getByPlaceholderText("+91 98765 43210")).toHaveFocus());
});

test("the page still works when balances can't be loaded", async () => {
  api.get.mockImplementation((url) => (url === "/profile" ? Promise.resolve({ data: full }) : Promise.reject(new Error("down"))));
  render(<Profile />);
  expect(await screen.findByText("Gautam Pandit")).toBeInTheDocument();
  expect(screen.queryByText("Owed to you")).not.toBeInTheDocument();
});
