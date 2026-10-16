/**
 * OAuth 2.1 configuration for the remote MCP endpoint.
 *
 * Required in production:
 *   API_PUBLIC_URL   Public ORIGIN of this API, e.g. https://api.splitease.tech
 *                    (no path: the OAuth discovery documents live at the root).
 * Optional:
 *   APP_PUBLIC_URL   Public origin of the website (default: first https entry of
 *                    FRONTEND_URL, else https://splitease.tech).
 *   OAUTH_LOGIN_URL  Full URL of the login page the browser is sent to
 *                    (default: <APP_PUBLIC_URL>/login, the normal SplitEase login).
 *
 * If API_PUBLIC_URL is missing/invalid in production, OAuth is DISABLED (not a
 * crash): the API keeps serving everything else and the legacy token-paste
 * flow for /mcp keeps working. A loud warning is logged at boot.
 */

export const OAUTH_SCOPES = ["splitease"];
export const MCP_PATH = "/mcp";

const stripTrailingSlash = (s) => s.replace(/\/+$/, "");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function pickAppUrl(env, isProd) {
  if (env.APP_PUBLIC_URL?.trim()) return stripTrailingSlash(env.APP_PUBLIC_URL.trim());
  const candidates = (env.FRONTEND_URL || "")
    .split(",")
    .map((s) => stripTrailingSlash(s.trim()))
    .filter(Boolean);
  if (isProd) {
    const pub = candidates.find((c) => {
      try {
        const u = new URL(c);
        return u.protocol === "https:" && !LOCAL_HOSTS.has(u.hostname);
      } catch {
        return false;
      }
    });
    return pub || "https://splitease.tech";
  }
  return candidates[0] || "http://localhost:3000";
}

export function loadOAuthConfig(env = process.env) {
  const isProd = env.NODE_ENV === "production";
  let raw = env.API_PUBLIC_URL?.trim() ? stripTrailingSlash(env.API_PUBLIC_URL.trim()) : "";
  if (!raw && !isProd) raw = `http://localhost:${env.PORT || 8080}`;
  if (!raw) return { enabled: false, reason: "API_PUBLIC_URL is not set" };

  let issuerUrl;
  try {
    issuerUrl = new URL(raw);
  } catch {
    return { enabled: false, reason: "API_PUBLIC_URL is not a valid URL" };
  }
  if (issuerUrl.pathname !== "/" || issuerUrl.search || issuerUrl.hash) {
    return { enabled: false, reason: "API_PUBLIC_URL must be an origin only (no path, query or fragment)" };
  }
  if (issuerUrl.protocol !== "https:" && !LOCAL_HOSTS.has(issuerUrl.hostname)) {
    return { enabled: false, reason: "API_PUBLIC_URL must use https" };
  }

  const appUrl = pickAppUrl(env, isProd);
  const loginRaw = env.OAUTH_LOGIN_URL?.trim() || `${appUrl}/login`;
  let loginUrl;
  try {
    loginUrl = new URL(loginRaw);
  } catch {
    return { enabled: false, reason: "OAUTH_LOGIN_URL / APP_PUBLIC_URL is not a valid URL" };
  }
  if (!["https:", "http:"].includes(loginUrl.protocol) || (isProd && loginUrl.protocol !== "https:")) {
    return { enabled: false, reason: "The login page URL must use https in production" };
  }

  return {
    enabled: true,
    issuerUrl,
    resourceUrl: new URL(MCP_PATH, issuerUrl),
    loginUrl: loginUrl.href,
    scopes: OAUTH_SCOPES,
  };
}
