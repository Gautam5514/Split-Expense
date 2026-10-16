import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";

// The real /login and /register pages with <McpConnectGate/> inside: proves the
// AI-app connect flow reuses them and that normal logins are unchanged.
const pushMock = jest.fn();
const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, replace: replaceMock }) }));
let authState = { token: null, loading: false, setToken: jest.fn() };
jest.mock("@/context/AuthContext", () => ({ useAuth: () => authState }));
const signInWithPopup = jest.fn();
jest.mock("firebase/auth", () => ({
  signInWithPopup: (...a) => signInWithPopup(...a),
  signInWithEmailAndPassword: jest.fn(),
  signInWithCustomToken: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/lib/firebaseClient", () => ({ auth: { currentUser: null }, googleProvider: {} }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/lib/adminApi", () => ({ adminApi: { post: jest.fn() }, setAdminToken: jest.fn() }));
jest.mock("@/lib/toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/AuthVisual", () => ({ __esModule: true, default: () => null }));
import { api } from "@/lib/api";

const ID = "abcdefghijklmnopqrstuvwxyz012345";
const CALLBACK = "https://claude.example/callback?code=sec_abc&state=xyz";
const googleUser = { user: { displayName: "Alice", getIdToken: async () => "firebase-id-token" } };

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  authState = { token: null, loading: false, setToken: jest.fn() };
  signInWithPopup.mockResolvedValue(googleUser);
  api.get.mockResolvedValue({ data: { clientName: "My AI App", redirectHost: "claude.example", scopes: ["splitease"] } });
  api.post.mockImplementation((url) =>
    Promise.resolve(url.includes("/oauth/requests/") ? { data: { redirectUrl: CALLBACK, approved: true } } : { data: {} }),
  );
  jest.spyOn(console, "error").mockImplementation((m) => {
    if (!String(m).includes("Not implemented: navigation")) process.stderr.write(`${m}\n`);
  });
});
afterEach(() => console.error.mockRestore());

const googleButton = () => screen.findByRole("button", { name: /google/i });

describe.each([
  ["login", LoginPage, "/login"],
  ["register", RegisterPage, "/register"],
])("%s page opened by an AI app", (_name, Page, path) => {
  beforeEach(() => window.history.pushState({}, "", `${path}?mcp_request=${ID}`));

  test("shows the connect banner on the normal page", async () => {
    render(<Page />);
    expect(await screen.findByText(/wants to connect to your splitease account/i)).toBeInTheDocument();
  });

  test("Google sign-in connects straight away and does NOT redirect to /users", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await screen.findByText(/wants to connect/i);
    await user.click(await googleButton());
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/oauth/requests/${ID}/decision`, { approve: true }));
    expect(await screen.findByText(/connected to my ai app/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    // normal provisioning (referral attribution etc.) still ran first
    expect(api.post).toHaveBeenCalledWith("/auth/google", expect.objectContaining({ token: "firebase-id-token" }));
    const order = api.post.mock.calls.map((c) => c[0]);
    expect(order.indexOf("/auth/google")).toBeLessThan(order.findIndex((u) => u.includes("/oauth/requests/")));
  });

  test("a signed-in token does not trigger the usual redirect to /users while connecting", async () => {
    authState = { token: "t", loading: false, setToken: jest.fn() };
    render(<Page />);
    await screen.findByText(/connect my ai app|connect .* to splitease/i, {}, { timeout: 2000 }).catch(() => {});
    expect(replaceMock).not.toHaveBeenCalledWith("/users");
  });
});

describe("normal logins are unchanged", () => {
  beforeEach(() => window.history.pushState({}, "", "/login"));

  test("no banner, and Google sign-in still goes to /users", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    expect(screen.queryByText(/wants to connect/i)).not.toBeInTheDocument();
    await user.click(await googleButton());
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/users"));
    expect(api.get).not.toHaveBeenCalled();
  });

  test("a signed-in visitor is still redirected to /users", async () => {
    authState = { token: "t", loading: false, setToken: jest.fn() };
    render(<LoginPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/users"));
  });

  test("a pending group invite still wins for normal logins", async () => {
    localStorage.setItem("pendingInvite", "INV123");
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(await googleButton());
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/join/INV123"));
  });
});
