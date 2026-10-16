/**
 * "Connect an AI app (Claude, ChatGPT...) to SplitEase" - client helpers.
 *
 * The AI app sends the browser to the normal /login page as
 *   /login?mcp_request=<opaque id>
 * The login/signup pages call captureMcpRequest() (via <McpConnectGate/>), the
 * user signs in or signs up exactly as usual, and the gate then completes the
 * connection with ONE call to the API, which returns the URL that sends the
 * browser back to the AI app (carrying a one-time code, never a token).
 *
 * The id is remembered in sessionStorage so it survives /login <-> /register
 * navigation and the Google redirect/popup; it is cleared on success, expiry
 * or cancel.
 */
import { api } from "@/lib/api";

const KEY = "splitease_mcp_request";
const DONE_KEY = "splitease_mcp_request_done";
const ID_RE = /^[A-Za-z0-9_-]{16,100}$/;

/** Dispatched by the login/signup pages after a successful sign-in. */
export const MCP_SIGNED_IN_EVENT = "splitease:mcp-signed-in";

const read = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const readDone = () => {
  try {
    return sessionStorage.getItem(DONE_KEY);
  } catch {
    return null;
  }
};
const write = (value) => {
  try {
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode etc. - the URL param still works for this page view */
  }
};

/** The pending request id (from ?mcp_request= or storage), or null. */
export function captureMcpRequest() {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("mcp_request");
  if (fromUrl !== null) {
    // An id we already finished/expired/cancelled must not come back to life
    // just because it is still sitting in the address bar.
    if (fromUrl === readDone()) return null;
    if (ID_RE.test(fromUrl)) {
      write(fromUrl);
      return fromUrl;
    }
    write(null); // junk in the URL: behave like a normal login
    return null;
  }
  const stored = read();
  return stored && ID_RE.test(stored) ? stored : null;
}

/** True when a connect request is waiting (pages use this to skip their own redirects). */
export function hasMcpRequest() {
  return !!captureMcpRequest();
}

/** Forget the request for good (finished, expired or cancelled) and tidy the URL. */
export function clearMcpRequest() {
  const id = captureMcpRequest();
  try {
    if (id) sessionStorage.setItem(DONE_KEY, id);
  } catch {
    /* ignore */
  }
  write(null);
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("mcp_request")) {
      url.searchParams.delete("mcp_request");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  } catch {
    /* ignore */
  }
}

/** Called by login/signup pages instead of navigating away. Returns true if it took over. */
export function notifyMcpSignedIn() {
  if (!hasMcpRequest()) return false;
  window.dispatchEvent(new Event(MCP_SIGNED_IN_EVENT));
  return true;
}

/** Only ever navigate to a well-formed absolute URL returned by our API. */
export function safeRedirect(value) {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const u = new URL(value);
    const scheme = u.protocol.replace(":", "").toLowerCase();
    if (["javascript", "data", "vbscript", "file", "blob", "about"].includes(scheme)) return null;
    return u.href;
  } catch {
    return null;
  }
}

export async function fetchMcpRequestInfo(id) {
  const { data } = await api.get(`/oauth/requests/${encodeURIComponent(id)}`);
  return data;
}

/** Approve/deny. Resolves to the URL to send the browser to. */
export async function finishMcpConnect(id, approve = true) {
  const { data } = await api.post(`/oauth/requests/${encodeURIComponent(id)}/decision`, { approve });
  const url = safeRedirect(data?.redirectUrl);
  if (!url) throw Object.assign(new Error("Unexpected response from the server."), { kind: "bad_response" });
  return url;
}
