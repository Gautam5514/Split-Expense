import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import McpConnectGate from "@/components/McpConnectGate";
import { MCP_SIGNED_IN_EVENT, captureMcpRequest, hasMcpRequest, notifyMcpSignedIn, safeRedirect } from "@/lib/mcpConnect";

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock, push: jest.fn() }) }));
let authState = { token: null, loading: false };
jest.mock("@/context/AuthContext", () => ({ useAuth: () => authState }));
const signOut = jest.fn(() => Promise.resolve());
jest.mock("firebase/auth", () => ({ signOut: (...a) => signOut(...a) }));
jest.mock("@/lib/firebaseClient", () => ({ auth: { currentUser: { email: "alice@example.com" } } }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/lib/toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
import { api } from "@/lib/api";
import toast from "@/lib/toast";

const ID = "abcdefghijklmnopqrstuvwxyz012345";
const INFO = { clientName: "My AI App", redirectHost: "claude.example", redirectScheme: "https", scopes: ["splitease"] };
const CALLBACK = "https://claude.example/callback?code=sec_abc&state=xyz";
const setUrl = (qs = "") => window.history.pushState({}, "", `/login${qs}`);
const fireSignedIn = () => act(async () => { window.dispatchEvent(new Event(MCP_SIGNED_IN_EVENT)); });

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockReset();
  api.post.mockReset();
  sessionStorage.clear();
  authState = { token: null, loading: false };
  setUrl(`?mcp_request=${ID}`);
  api.get.mockResolvedValue({ data: INFO });
  jest.spyOn(console, "error").mockImplementation((m) => {
    if (!String(m).includes("Not implemented: navigation")) process.stderr.write(`${m}\n`);
  });
});
afterEach(() => console.error.mockRestore());

describe("mcpConnect helpers", () => {
  test("captures a valid id from the URL and remembers it across pages", () => {
    expect(captureMcpRequest()).toBe(ID);
    setUrl(""); // e.g. navigated /login -> /register (link without the query)
    expect(captureMcpRequest()).toBe(ID);
    expect(hasMcpRequest()).toBe(true);
  });
  test.each([["too short", "abc"], ["bad chars", "a".repeat(20) + "<script>"], ["too long", "a".repeat(101)]])("ignores a %s id and clears any stored one", (_n, bad) => {
    sessionStorage.setItem("splitease_mcp_request", ID);
    setUrl(`?mcp_request=${encodeURIComponent(bad)}`);
    expect(captureMcpRequest()).toBeNull();
    expect(hasMcpRequest()).toBe(false);
  });
  test("a normal login (no param, nothing stored) is untouched", () => {
    setUrl("");
    sessionStorage.clear();
    expect(hasMcpRequest()).toBe(false);
    expect(notifyMcpSignedIn()).toBe(false);
  });
  test("notifyMcpSignedIn fires the event only when a request is pending", () => {
    const spy = jest.fn();
    window.addEventListener(MCP_SIGNED_IN_EVENT, spy);
    expect(notifyMcpSignedIn()).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(MCP_SIGNED_IN_EVENT, spy);
  });
  test.each([["javascript:alert(1)", null], ["data:text/html,x", null], ["not a url", null], [undefined, null], [{}, null], ["https://a.example/cb?code=1", "https://a.example/cb?code=1"], ["cursor://x/cb?code=1", "cursor://x/cb?code=1"]])("safeRedirect(%s)", (v, out) => {
    expect(safeRedirect(v)).toBe(out);
  });
});

describe("McpConnectGate - signed out visitor", () => {
  test("renders nothing for a normal login", async () => {
    setUrl("");
    const { container } = render(<McpConnectGate />);
    expect(container).toBeEmptyDOMElement();
    expect(api.get).not.toHaveBeenCalled();
  });

  test("shows a banner naming the app and where the browser returns", async () => {
    render(<McpConnectGate />);
    expect(await screen.findByText(/wants to connect to your splitease account/i)).toBeInTheDocument();
    expect(screen.getByText("My AI App")).toBeInTheDocument();
    expect(screen.getByText(/returns to claude\.example/i)).toBeInTheDocument();
  });

  test("after the page reports sign-in, connects directly (no extra click) and returns to the app", async () => {
    api.post.mockResolvedValue({ data: { redirectUrl: CALLBACK, approved: true } });
    render(<McpConnectGate />);
    await screen.findByText(/wants to connect/i);
    await fireSignedIn();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/oauth/requests/${ID}/decision`, { approve: true }));
    expect(await screen.findByText(/connected to my ai app/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to my ai app/i })).toHaveAttribute("href", CALLBACK);
    expect(sessionStorage.getItem("splitease_mcp_request")).toBeNull();
  });

  test("a sign-in that happens before the request details load still connects once they do", async () => {
    let resolveInfo;
    api.get.mockReturnValue(new Promise((r) => (resolveInfo = r)));
    api.post.mockResolvedValue({ data: { redirectUrl: CALLBACK } });
    render(<McpConnectGate />);
    await fireSignedIn();
    expect(api.post).not.toHaveBeenCalled();
    await act(async () => resolveInfo({ data: INFO }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  });

  test("two sign-in events connect only once", async () => {
    api.post.mockResolvedValue({ data: { redirectUrl: CALLBACK } });
    render(<McpConnectGate />);
    await screen.findByText(/wants to connect/i);
    await fireSignedIn();
    await fireSignedIn();
    await screen.findByText(/connected to/i);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  test("an expired link shows a notice and clears the stored request so login is normal", async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    render(<McpConnectGate />);
    expect(await screen.findByText(/connection link expired/i)).toBeInTheDocument();
    expect(hasMcpRequest()).toBe(false);
    expect(window.location.search).toBe(""); // stale id removed from the address bar
  });

  test("a 400 while connecting (expired between page load and sign-in) shows the expired notice", async () => {
    api.post.mockRejectedValue({ response: { status: 400 } });
    render(<McpConnectGate />);
    await screen.findByText(/wants to connect/i);
    await fireSignedIn();
    expect(await screen.findByText(/connection link expired/i)).toBeInTheDocument();
  });

  test("a server error offers Try again", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 500, data: { message: "Something went wrong. Please try again." } } });
    api.post.mockResolvedValueOnce({ data: { redirectUrl: CALLBACK } });
    const user = userEvent.setup();
    render(<McpConnectGate />);
    await screen.findByText(/wants to connect/i);
    await fireSignedIn(); // signed out at load -> sign-in event path
    expect(await screen.findByText(/couldn't connect/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText(/connected to my ai app/i)).toBeInTheDocument();
  });

  test("a 401 signs the user out and asks them to sign in again", async () => {
    api.post.mockRejectedValue({ response: { status: 401 } });
    render(<McpConnectGate />);
    await screen.findByText(/wants to connect/i);
    await fireSignedIn();
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/session expired/i));
    expect(await screen.findByText(/wants to connect/i)).toBeInTheDocument();
  });

  test("a malicious redirect from the server is never followed", async () => {
    api.post.mockResolvedValue({ data: { redirectUrl: "javascript:alert(1)" } });
    render(<McpConnectGate />);
    await screen.findByText(/wants to connect/i);
    await fireSignedIn();
    expect(await screen.findByText(/couldn't connect/i)).toBeInTheDocument();
    expect(screen.queryByText(/connected to/i)).not.toBeInTheDocument();
  });
});

describe("McpConnectGate - visitor already signed in on arrival", () => {
  beforeEach(() => { authState = { token: "t", loading: false }; });

  test("asks for one click instead of connecting silently", async () => {
    render(<McpConnectGate />);
    expect(await screen.findByRole("button", { name: /connect as alice@example\.com/i })).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("clicking Connect completes the connection", async () => {
    api.post.mockResolvedValue({ data: { redirectUrl: CALLBACK } });
    const user = userEvent.setup();
    render(<McpConnectGate />);
    await user.click(await screen.findByRole("button", { name: /connect as/i }));
    expect(api.post).toHaveBeenCalledWith(`/oauth/requests/${ID}/decision`, { approve: true });
    expect(await screen.findByText(/connected to my ai app/i)).toBeInTheDocument();
  });

  test("Cancel tells the app the user said no", async () => {
    api.post.mockResolvedValue({ data: { redirectUrl: "https://claude.example/callback?error=access_denied" } });
    const user = userEvent.setup();
    render(<McpConnectGate />);
    await user.click(await screen.findByRole("button", { name: /^cancel$/i }));
    expect(api.post).toHaveBeenCalledWith(`/oauth/requests/${ID}/decision`, { approve: false });
    expect(hasMcpRequest()).toBe(false);
  });

  test("'Use another account' signs out and shows the login banner", async () => {
    const user = userEvent.setup();
    render(<McpConnectGate />);
    await user.click(await screen.findByRole("button", { name: /use another account/i }));
    expect(signOut).toHaveBeenCalled();
    expect(await screen.findByText(/sign in or create an account to continue/i)).toBeInTheDocument();
  });

  test("an expired request sends a signed-in user on to the app instead of stranding them", async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    render(<McpConnectGate />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/users"));
  });
});

describe("a finished request cannot be revived by the address bar", () => {
  test("after clearing, the same ?mcp_request= id is ignored but a NEW id works", () => {
    const { clearMcpRequest } = require("@/lib/mcpConnect");
    expect(captureMcpRequest()).toBe(ID);
    clearMcpRequest();
    setUrl(`?mcp_request=${ID}`); // user presses Back / reloads an old link
    expect(captureMcpRequest()).toBeNull();
    const fresh = "ZYXWVUTSRQPONMLKJIHGFEDCBA987654";
    setUrl(`?mcp_request=${fresh}`);
    expect(captureMcpRequest()).toBe(fresh);
  });
});
