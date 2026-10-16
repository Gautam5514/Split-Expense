// Pure-logic tests for the MCP OAuth building blocks: PKCE, redirect-URI and
// registration validation, and environment configuration.
import crypto from "node:crypto";
import { pkceMatches, assertSafeRedirectUri, normalizeClientRegistration, isOAuthAccessToken, sha256hex } from "../services/oauth/provider.js";
import { loadOAuthConfig } from "../config/oauthConfig.js";

describe("pkceMatches (RFC 7636 S256)", () => {
  // Test vector from RFC 7636 Appendix B.
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

  test("accepts the RFC test vector", () => {
    expect(pkceMatches(verifier, challenge)).toBe(true);
  });
  test("rejects a different verifier", () => {
    expect(pkceMatches(verifier.replace("d", "e"), challenge)).toBe(false);
  });
  test("rejects the challenge used as a verifier (plain-method downgrade)", () => {
    expect(pkceMatches(challenge, challenge)).toBe(false);
  });
  test.each([
    ["too short", "a".repeat(42)],
    ["too long", "a".repeat(129)],
    ["illegal chars", "a".repeat(43) + "!"],
    ["empty", ""],
    ["undefined", undefined],
    ["number", 12345],
    ["array", [verifier]],
  ])("rejects malformed verifier: %s", (_n, v) => {
    expect(pkceMatches(v, challenge)).toBe(false);
  });
  test("rejects empty / missing challenge", () => {
    expect(pkceMatches(verifier, "")).toBe(false);
    expect(pkceMatches(verifier, undefined)).toBe(false);
  });
  test("round-trips a random verifier", () => {
    const v = crypto.randomBytes(48).toString("base64url");
    const c = crypto.createHash("sha256").update(v).digest("base64url");
    expect(pkceMatches(v, c)).toBe(true);
  });
});

describe("assertSafeRedirectUri", () => {
  test.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "http://localhost:3118/callback",
    "http://127.0.0.1/cb",
    "http://[::1]:8080/cb",
    "cursor://anysphere.cursor-retrieval/oauth/mcp/callback",
    "vscode://ms-vscode.mcp/callback",
    "com.example.app:/oauth2redirect",
  ])("allows %s", (uri) => {
    expect(() => assertSafeRedirectUri(uri)).not.toThrow();
  });

  test.each([
    ["javascript:alert(1)", /scheme/i],
    ["data:text/html,<script>1</script>", /scheme/i],
    ["vbscript:x", /scheme/i],
    ["file:///etc/passwd", /scheme/i],
    ["http://evil.example/cb", /localhost/i],
    ["http://localhost.evil.example/cb", /localhost/i],
    ["https://app.example/cb#frag", /fragment/i],
    ["https://user:pw@app.example/cb", /credentials/i],
    ["not a url", /invalid/i],
    ["", /non-empty/i],
    ["https://a.example/" + "x".repeat(2100), /length/i],
    [42, /non-empty/i],
  ])("rejects %s", (uri, msg) => {
    expect(() => assertSafeRedirectUri(uri)).toThrow(msg);
  });
});

describe("normalizeClientRegistration", () => {
  const base = { client_id: "cid", client_id_issued_at: 1, redirect_uris: ["https://app.example/cb"] };

  test("defaults to a public PKCE client and strips unknown/secret fields", () => {
    const rec = normalizeClientRegistration({ ...base, client_secret: "should-not-be-kept", jwks_uri: "https://x" });
    expect(rec.token_endpoint_auth_method).toBe("none");
    expect(rec.client_secret).toBeUndefined();
    expect(rec.jwks_uri).toBeUndefined();
    expect(rec.grant_types).toEqual(["authorization_code", "refresh_token"]);
    expect(rec.client_name).toBe("Unnamed application");
  });
  test("keeps the secret for client_secret_post clients", () => {
    const rec = normalizeClientRegistration({ ...base, token_endpoint_auth_method: "client_secret_post", client_secret: "s3", client_secret_expires_at: 99 });
    expect(rec.client_secret).toBe("s3");
    expect(rec.client_secret_expires_at).toBe(99);
  });
  test("sanitises client_name (control chars, angle brackets, length)", () => {
    const rec = normalizeClientRegistration({ ...base, client_name: "  <b>Evil</b>\u0000\n App " + "x".repeat(300) });
    expect(rec.client_name).not.toMatch(/[<>\u0000\n]/);
    expect(rec.client_name.length).toBeLessThanOrEqual(100);
    expect(rec.client_name.startsWith("bEvil/b App")).toBe(true);
  });
  test("a whitespace-only name falls back to the default", () => {
    expect(normalizeClientRegistration({ ...base, client_name: "   \n " }).client_name).toBe("Unnamed application");
  });
  test.each([
    ["no redirect_uris", { redirect_uris: [] }],
    ["too many redirect_uris", { redirect_uris: Array.from({ length: 11 }, (_, i) => `https://a.example/${i}`) }],
    ["unsafe redirect", { redirect_uris: ["http://evil.example/cb"] }],
    ["client_secret_basic", { token_endpoint_auth_method: "client_secret_basic" }],
    ["private_key_jwt", { token_endpoint_auth_method: "private_key_jwt" }],
    ["implicit grant", { grant_types: ["implicit"] }],
    ["password grant", { grant_types: ["authorization_code", "password"] }],
    ["token response type", { response_types: ["token"] }],
  ])("rejects %s", (_n, patch) => {
    expect(() => normalizeClientRegistration({ ...base, ...patch })).toThrow();
  });
});

describe("token helpers", () => {
  test("isOAuthAccessToken recognises only our prefix and sane lengths", () => {
    expect(isOAuthAccessToken("seat_abc")).toBe(true);
    expect(isOAuthAccessToken("seat_")).toBe(false);
    expect(isOAuthAccessToken("serf_abc")).toBe(false); // refresh tokens are not bearer credentials
    expect(isOAuthAccessToken("eyJhbGciOi...")).toBe(false); // a Firebase JWT
    expect(isOAuthAccessToken("seat_" + "a".repeat(300))).toBe(false);
    expect(isOAuthAccessToken(undefined)).toBe(false);
  });
  test("sha256hex is stable hex", () => {
    expect(sha256hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("loadOAuthConfig", () => {
  test("production without API_PUBLIC_URL disables OAuth instead of crashing", () => {
    const c = loadOAuthConfig({ NODE_ENV: "production" });
    expect(c.enabled).toBe(false);
    expect(c.reason).toMatch(/API_PUBLIC_URL/);
  });
  test("development falls back to localhost with the local site", () => {
    const c = loadOAuthConfig({ PORT: "5000" });
    expect(c.enabled).toBe(true);
    expect(c.issuerUrl.href).toBe("http://localhost:5000/");
    expect(c.resourceUrl.href).toBe("http://localhost:5000/mcp");
    expect(c.loginUrl).toBe("http://localhost:3000/login");
  });
  test("production config derives everything from API_PUBLIC_URL / FRONTEND_URL", () => {
    const c = loadOAuthConfig({
      NODE_ENV: "production",
      API_PUBLIC_URL: "https://api.splitease.tech/",
      FRONTEND_URL: "http://localhost:3000, https://splitease.tech",
    });
    expect(c.enabled).toBe(true);
    expect(c.issuerUrl.origin).toBe("https://api.splitease.tech");
    expect(c.resourceUrl.href).toBe("https://api.splitease.tech/mcp");
    expect(c.loginUrl).toBe("https://splitease.tech/login");
  });
  test("production never uses a localhost FRONTEND_URL for the login page", () => {
    const c = loadOAuthConfig({ NODE_ENV: "production", API_PUBLIC_URL: "https://api.splitease.tech", FRONTEND_URL: "http://localhost:3000" });
    expect(c.loginUrl).toBe("https://splitease.tech/login");
  });
  test("APP_PUBLIC_URL / OAUTH_LOGIN_URL overrides win", () => {
    expect(loadOAuthConfig({ API_PUBLIC_URL: "https://api.x.test", APP_PUBLIC_URL: "https://app.x.test" }).loginUrl).toBe("https://app.x.test/login");
    expect(loadOAuthConfig({ API_PUBLIC_URL: "https://api.x.test", OAUTH_LOGIN_URL: "https://app.x.test/connect" }).loginUrl).toBe("https://app.x.test/connect");
  });
  test.each([
    ["has a path", "https://api.splitease.tech/v1"],
    ["has a query", "https://api.splitease.tech/?x=1"],
    ["plain http in prod host", "http://api.splitease.tech"],
    ["garbage", "not a url"],
  ])("disables OAuth when API_PUBLIC_URL %s", (_n, url) => {
    expect(loadOAuthConfig({ NODE_ENV: "production", API_PUBLIC_URL: url }).enabled).toBe(false);
  });
  test("production requires an https login page", () => {
    const c = loadOAuthConfig({ NODE_ENV: "production", API_PUBLIC_URL: "https://api.splitease.tech", OAUTH_LOGIN_URL: "http://splitease.tech/login" });
    expect(c.enabled).toBe(false);
  });
});
