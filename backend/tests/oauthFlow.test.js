// End-to-end tests for the MCP OAuth flow over real HTTP: discovery, dynamic
// client registration, /authorize -> website consent -> /token, refresh
// rotation, revocation, and the protected /mcp endpoint - including the attack
// and edge cases. Storage is in-memory (no MongoDB in the sandbox); the real
// SDK routers, our provider, and the real MCP Streamable-HTTP transport run.
import { jest } from "@jest/globals";
import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { createMemoryOAuthStore } from "./helpers/memoryOAuthStore.js";

// ── mocks (the real Firebase / Mongo aren't available) ──────────────────────
const users = new Map(); // id -> { _id, name, email }
const verifyIdToken = jest.fn();
const fakeUserModel = {
  findById: (id) => ({ select: () => ({ lean: async () => users.get(String(id)) || null }) }),
  findOne: () => ({ select: () => ({ lean: async () => null }) }),
  exists: async ({ _id }) => (users.has(String(_id)) ? { _id } : null),
};
// "Firebase" auth: header `Bearer fb-<userId>` identifies the signed-in user.
const fakeAuthMiddleware = (req, res, next) => {
  const m = /^Bearer fb-(\w+)$/.exec(req.headers.authorization || "");
  if (!m || !users.has(m[1])) return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid or expired token." });
  req.user = { id: m[1], email: users.get(m[1]).email, name: users.get(m[1]).name };
  next();
};

// A tiny real McpServer so the real transport + identity plumbing is exercised.
const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
const buildSplitEaseMcpServer = (authedUser) => {
  const s = new McpServer({ name: "test-splitease", version: "0.0.0" });
  s.registerTool("get_me", { description: "who am i", inputSchema: {} }, async () => ({
    content: [{ type: "text", text: JSON.stringify(authedUser) }],
  }));
  return s;
};

jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => ({ verifyIdToken }) } }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: fakeUserModel }));
jest.unstable_mockModule("../middleware/authMiddleware.js", () => ({ authMiddleware: fakeAuthMiddleware }));
jest.unstable_mockModule("../services/mcpServer.js", () => ({ buildSplitEaseMcpServer }));

const { createOAuthStack } = await import("../services/oauth/setup.js");
const { createMcpRouter } = await import("../routes/mcpRoutes.js");

// ── harness ─────────────────────────────────────────────────────────────────
const LOGIN_URL = "http://localhost:3000/login";
const REDIRECT = "https://claude.example/callback";
const clock = { t: Date.parse("2026-10-16T10:00:00Z") };
const advance = (ms) => (clock.t += ms);
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

let server, base, store, stack;

async function boot(mcpOptions = {}) {
  store = createMemoryOAuthStore();
  const app = express();
  // Same global parsers the real app mounts before the routers.
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  stack = createOAuthStack({
    config: {
      enabled: true,
      issuerUrl: new URL(base),
      resourceUrl: new URL(`${base}/mcp`),
      loginUrl: LOGIN_URL,
      scopes: ["splitease"],
    },
    store,
    userExists: async (id) => users.has(String(id)),
    authMiddleware: fakeAuthMiddleware,
    now: () => clock.t,
    rateLimits: { sdk: false, api: false },
  });
  app.use("/api/oauth", stack.apiRouter);
  app.use(stack.authRouter);
  app.use("/mcp", createMcpRouter({ oauth: stack, ...mcpOptions }));
  return app;
}

beforeAll(async () => {
  await boot();
});
afterAll(async () => {
  await new Promise((r) => server.close(r));
});
beforeEach(() => {
  users.clear();
  users.set("u1", { _id: "u1", name: "Alice", email: "alice@example.com" });
  users.set("u2", { _id: "u2", name: "Bob", email: "bob@example.com" });
  verifyIdToken.mockReset();
  Object.values(store._dump).forEach((m) => m.clear());
  clock.t = Date.parse("2026-10-16T10:00:00Z");
});

const form = (obj) => new URLSearchParams(obj).toString();
const post = (path, body, headers = {}) =>
  fetch(base + path, { method: "POST", redirect: "manual", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const postForm = (path, body) =>
  fetch(base + path, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form(body) });

const pkce = () => {
  const verifier = crypto.randomBytes(48).toString("base64url");
  return { verifier, challenge: crypto.createHash("sha256").update(verifier).digest("base64url") };
};

async function register(extra = {}) {
  const res = await post("/register", { redirect_uris: [REDIRECT], client_name: "Claude", token_endpoint_auth_method: "none", ...extra });
  return { res, body: await res.json() };
}

/** Run /authorize and return the pending request id from the login redirect. */
async function startAuthorize(client, { challenge, state = "st123", extra = {} } = {}) {
  const q = {
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: REDIRECT,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    resource: `${base}/mcp`,
    ...extra,
  };
  const res = await fetch(`${base}/authorize?${form(q)}`, { redirect: "manual" });
  return res;
}
const requestIdFrom = (res) => new URL(res.headers.get("location")).searchParams.get("mcp_request");

const decide = (requestId, approve, user = "u1", body = {}) =>
  post(`/api/oauth/requests/${requestId}/decision`, { approve, ...body }, user ? { authorization: `Bearer fb-${user}` } : {});

/** Whole happy path up to an authorization code. */
async function getCode({ user = "u1", clientOverrides, state = "st123" } = {}) {
  const { body: client } = await register(clientOverrides);
  const { verifier, challenge } = pkce();
  const auth = await startAuthorize(client, { challenge, state });
  const requestId = requestIdFrom(auth);
  const dec = await decide(requestId, true, user);
  const { redirectUrl } = await dec.json();
  const code = new URL(redirectUrl).searchParams.get("code");
  return { client, verifier, challenge, requestId, code, redirectUrl };
}

const tokenReq = (client, body, withSecret = true) =>
  postForm("/token", {
    client_id: client.client_id,
    ...(withSecret && client.client_secret && { client_secret: client.client_secret }),
    ...body,
  });
const exchange = (ctx, extra = {}) =>
  tokenReq(ctx.client, { grant_type: "authorization_code", code: ctx.code, code_verifier: ctx.verifier, redirect_uri: REDIRECT, ...extra });

async function getTokens(opts) {
  const ctx = await getCode(opts);
  const res = await exchange(ctx);
  const tokens = await res.json();
  return { ...ctx, tokens, res };
}

const mcpCall = (token, body = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) =>
  fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });

// ════════════════════════════════════════════════════════════════════════════
describe("discovery", () => {
  test("protected-resource metadata points at our authorization server", async () => {
    const res = await fetch(`${base}/.well-known/oauth-protected-resource/mcp`);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.resource).toBe(`${base}/mcp`);
    expect(j.authorization_servers).toEqual([`${base}/`]);
  });

  test("authorization-server metadata advertises a safe feature set", async () => {
    const j = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    expect(j.authorization_endpoint).toBe(`${base}/authorize`);
    expect(j.token_endpoint).toBe(`${base}/token`);
    expect(j.registration_endpoint).toBe(`${base}/register`);
    expect(j.revocation_endpoint).toBe(`${base}/revoke`);
    expect(j.code_challenge_methods_supported).toEqual(["S256"]); // never "plain"
    expect(j.response_types_supported).toEqual(["code"]);
    expect(j.grant_types_supported).toEqual(["authorization_code", "refresh_token"]);
    expect(j.scopes_supported).toEqual(["splitease"]);
  });

  test("/mcp without credentials answers 401 + a WWW-Authenticate discovery hint", async () => {
    const res = await mcpCall(null);
    expect(res.status).toBe(401);
    const h = res.headers.get("www-authenticate");
    expect(h).toMatch(/^Bearer/);
    expect(h).toContain(`resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`);
    expect((await res.json()).error.message).toMatch(/missing splitease token/i);
  });
});

describe("dynamic client registration", () => {
  test("registers a public PKCE client", async () => {
    const { res, body } = await register();
    expect(res.status).toBe(201);
    expect(body.client_id).toBeTruthy();
    expect(body.client_secret).toBeUndefined();
    expect(body.redirect_uris).toEqual([REDIRECT]);
  });

  test("registers a confidential client_secret_post client with a secret", async () => {
    const { res, body } = await register({ token_endpoint_auth_method: "client_secret_post" });
    expect(res.status).toBe(201);
    expect(body.client_secret).toMatch(/^[0-9a-f]{64}$/);
  });

  test("accepts loopback and custom-scheme redirect URIs used by desktop/IDE clients", async () => {
    const { res } = await register({ redirect_uris: ["http://localhost:3118/cb", "cursor://anysphere.cursor-retrieval/oauth/callback"] });
    expect(res.status).toBe(201);
  });

  test.each([
    ["javascript: URI", { redirect_uris: ["javascript:alert(1)"] }],
    ["plain-http non-loopback URI", { redirect_uris: ["http://evil.example/cb"] }],
    ["fragment in URI", { redirect_uris: ["https://a.example/cb#x"] }],
    ["credentials in URI", { redirect_uris: ["https://u:p@a.example/cb"] }],
    ["no redirect_uris", { redirect_uris: [] }],
    ["11 redirect_uris", { redirect_uris: Array.from({ length: 11 }, (_, i) => `https://a.example/${i}`) }],
    ["implicit grant", { grant_types: ["implicit"] }],
    ["client_secret_basic", { token_endpoint_auth_method: "client_secret_basic" }],
  ])("rejects %s with a 400", async (_n, patch) => {
    const { res, body } = await register(patch);
    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_client_metadata");
  });

  test("rejects a non-JSON-object body", async () => {
    const res = await fetch(`${base}/register`, { method: "POST", headers: { "content-type": "application/json" }, body: "[1,2,3]" });
    expect(res.status).toBe(400);
  });

  test("stores a sanitised client name", async () => {
    const { body } = await register({ client_name: "<script>x</script>Evil\u0000" });
    expect(body.client_name).not.toMatch(/[<>\u0000]/);
  });
});

describe("/authorize", () => {
  let client;
  beforeEach(async () => {
    client = (await register()).body;
  });

  test("valid request parks the request and redirects the browser to the normal /login page", async () => {
    const { challenge } = pkce();
    const res = await startAuthorize(client, { challenge });
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location"));
    expect(loc.origin + loc.pathname).toBe(LOGIN_URL);
    expect(loc.searchParams.get("mcp_request")).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    // Nothing sensitive leaks into the website URL, and no code exists yet.
    expect([...loc.searchParams.keys()]).toEqual(["mcp_request"]);
    expect(store._dump.codes.size).toBe(0);
  });

  test("unknown client_id is a direct 400 (never a redirect)", async () => {
    const res = await fetch(`${base}/authorize?${form({ response_type: "code", client_id: "nope", redirect_uri: REDIRECT, code_challenge: "x", code_challenge_method: "S256" })}`, { redirect: "manual" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_client");
  });

  test("unregistered redirect_uri is a direct 400 (open-redirect protection)", async () => {
    const { challenge } = pkce();
    const res = await startAuthorize(client, { challenge, extra: { redirect_uri: "https://attacker.example/steal" } });
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
  });

  test.each([
    ["missing code_challenge", { code_challenge: undefined }, "invalid_request"],
    ["PKCE method 'plain'", { code_challenge_method: "plain" }, "invalid_request"],
    ["response_type=token", { response_type: "token" }, "invalid_request"],
    ["unsupported scope", { scope: "splitease admin" }, "invalid_scope"],
    ["foreign resource", { resource: "https://other.example/mcp" }, "invalid_target"],
  ])("%s -> error redirect to the client with state", async (_n, extra, errCode) => {
    const { challenge } = pkce();
    const q = { response_type: "code", client_id: client.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state: "keepme", resource: `${base}/mcp`, ...extra };
    Object.keys(q).forEach((k) => q[k] === undefined && delete q[k]);
    const res = await fetch(`${base}/authorize?${form(q)}`, { redirect: "manual" });
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location"));
    expect(loc.origin + loc.pathname).toBe(REDIRECT);
    expect(loc.searchParams.get("error")).toBe(errCode);
    expect(loc.searchParams.get("state")).toBe("keepme");
    expect(loc.searchParams.get("code")).toBeNull();
  });

  test("loopback clients may use an ephemeral port (RFC 8252)", async () => {
    const lb = (await register({ redirect_uris: ["http://127.0.0.1/cb"] })).body;
    const { challenge } = pkce();
    const res = await startAuthorize(lb, { challenge, extra: { redirect_uri: "http://127.0.0.1:54321/cb" } });
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")).origin + "/").toBe(new URL(LOGIN_URL).origin + "/");
  });

  test("a loopback host mismatch (localhost vs 127.0.0.1) is rejected", async () => {
    const lb = (await register({ redirect_uris: ["http://127.0.0.1/cb"] })).body;
    const { challenge } = pkce();
    const res = await startAuthorize(lb, { challenge, extra: { redirect_uri: "http://localhost:54321/cb" } });
    expect(res.status).toBe(400);
  });
});

describe("website consent API", () => {
  let client, requestId, challenge;
  beforeEach(async () => {
    client = (await register({ client_name: "My AI App" })).body;
    challenge = pkce().challenge;
    requestId = requestIdFrom(await startAuthorize(client, { challenge, state: "secret-state" }));
  });

  test("GET shows only what the consent screen needs (no secrets)", async () => {
    const res = await fetch(`${base}/api/oauth/requests/${requestId}`);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toEqual({ clientName: "My AI App", redirectHost: "claude.example", redirectScheme: "https", scopes: ["splitease"] });
    expect(JSON.stringify(j)).not.toMatch(/secret-state|challenge|client_id/);
  });

  test("GET for an unknown or malformed id is 404", async () => {
    expect((await fetch(`${base}/api/oauth/requests/does-not-exist`)).status).toBe(404);
    expect((await fetch(`${base}/api/oauth/requests/${"a".repeat(500)}`)).status).toBe(404);
  });

  test("GET after the 10 minute TTL is 404", async () => {
    advance(10 * MIN + 1000);
    const res = await fetch(`${base}/api/oauth/requests/${requestId}`);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("REQUEST_EXPIRED");
  });

  test("approving requires a signed-in SplitEase user", async () => {
    expect((await decide(requestId, true, null)).status).toBe(401);
    expect((await decide(requestId, true, "ghost")).status).toBe(401);
    // ...and the failed attempts did not consume the request.
    expect((await decide(requestId, true, "u1")).status).toBe(200);
  });

  test.each([["string", "true"], ["number", 1], ["missing", undefined], ["null", null]])("rejects non-boolean approve (%s)", async (_n, v) => {
    const res = await post(`/api/oauth/requests/${requestId}/decision`, { approve: v }, { authorization: "Bearer fb-u1" });
    expect(res.status).toBe(400);
  });

  test("approve returns a redirect to the client with code + the original state", async () => {
    const res = await decide(requestId, true);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.approved).toBe(true);
    const u = new URL(j.redirectUrl);
    expect(u.origin + u.pathname).toBe(REDIRECT);
    expect(u.searchParams.get("state")).toBe("secret-state");
    expect(u.searchParams.get("code")).toMatch(/^sec_/);
  });

  test("deny returns access_denied + state and mints no code", async () => {
    const j = await (await decide(requestId, false)).json();
    expect(j.approved).toBe(false);
    const u = new URL(j.redirectUrl);
    expect(u.searchParams.get("error")).toBe("access_denied");
    expect(u.searchParams.get("state")).toBe("secret-state");
    expect(u.searchParams.get("code")).toBeNull();
    expect(store._dump.codes.size).toBe(0);
  });

  test("a request can be decided only once (replay -> 400)", async () => {
    expect((await decide(requestId, true)).status).toBe(200);
    const again = await decide(requestId, true);
    expect(again.status).toBe(400);
    expect(store._dump.codes.size).toBe(1);
  });

  test("two simultaneous approvals mint exactly one code", async () => {
    const [a, b] = await Promise.all([decide(requestId, true), decide(requestId, true)]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(store._dump.codes.size).toBe(1);
  });

  test("expired requests cannot be approved", async () => {
    advance(11 * MIN);
    const res = await decide(requestId, true);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("REQUEST_EXPIRED");
  });

  test("identity comes only from the verified login - a spoofed body userId is ignored", async () => {
    const res = await decide(requestId, true, "u1", { userId: "u2", user: { id: "u2" } });
    const code = new URL((await res.json()).redirectUrl).searchParams.get("code");
    const rec = [...store._dump.codes.values()][0];
    expect(rec.userId).toBe("u1");
    expect(code).toBeTruthy();
  });
});

describe("/token - authorization_code", () => {
  test("happy path: code + verifier -> bearer tokens that work on /mcp as the right user", async () => {
    const { tokens, res } = await getTokens();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.expires_in).toBe(3600);
    expect(tokens.scope).toBe("splitease");
    expect(tokens.access_token).toMatch(/^seat_/);
    expect(tokens.refresh_token).toMatch(/^serf_/);

    const r = await mcpCall(tokens.access_token, { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "get_me", arguments: {} } });
    expect(r.status).toBe(200);
    const out = await r.json();
    expect(JSON.parse(out.result.content[0].text)).toMatchObject({ id: "u1", email: "alice@example.com" });
  });

  test("a different user's login yields that user's identity", async () => {
    const { tokens } = await getTokens({ user: "u2" });
    const out = await (await mcpCall(tokens.access_token, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_me", arguments: {} } })).json();
    expect(JSON.parse(out.result.content[0].text).id).toBe("u2");
  });

  test("tokens are stored only as hashes", async () => {
    const { tokens } = await getTokens();
    const stored = JSON.stringify([...store._dump.tokens.values()]);
    expect(stored).not.toContain(tokens.access_token);
    expect(stored).not.toContain(tokens.refresh_token);
  });

  test("a code is single-use: replay -> invalid_grant", async () => {
    const ctx = await getCode();
    expect((await exchange(ctx)).status).toBe(200);
    const again = await exchange(ctx);
    expect(again.status).toBe(400);
    expect((await again.json()).error).toBe("invalid_grant");
  });

  test("a wrong verifier fails AND burns the code (no guessing)", async () => {
    const ctx = await getCode();
    const bad = await exchange(ctx, { code_verifier: pkce().verifier });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("invalid_grant");
    const retry = await exchange(ctx); // the correct verifier now fails too
    expect(retry.status).toBe(400);
  });

  test.each([
    ["too short", "short"],
    ["illegal characters", "!".repeat(50)],
  ])("a %s code_verifier is rejected", async (_n, v) => {
    const ctx = await getCode();
    const res = await exchange(ctx, { code_verifier: v });
    expect((await res.json()).error).toBe("invalid_grant");
  });

  test("missing code_verifier -> invalid_request (PKCE is mandatory)", async () => {
    const ctx = await getCode();
    const res = await tokenReq(ctx.client, { grant_type: "authorization_code", code: ctx.code, redirect_uri: REDIRECT });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  test("redirect_uri mismatch -> invalid_grant", async () => {
    const ctx = await getCode({ clientOverrides: { redirect_uris: [REDIRECT, "https://claude.example/other"] } });
    const res = await exchange(ctx, { redirect_uri: "https://claude.example/other" });
    expect((await res.json()).error).toBe("invalid_grant");
  });

  test("expired code (5 min) -> invalid_grant", async () => {
    const ctx = await getCode();
    advance(5 * MIN + 1000);
    expect((await (await exchange(ctx)).json()).error).toBe("invalid_grant");
  });

  test("a code stolen by another client cannot be redeemed", async () => {
    const ctx = await getCode();
    const other = (await register({ client_name: "Mallory" })).body;
    const res = await tokenReq(other, { grant_type: "authorization_code", code: ctx.code, code_verifier: ctx.verifier, redirect_uri: REDIRECT });
    expect((await res.json()).error).toBe("invalid_grant");
  });

  test("garbage / unknown code -> invalid_grant", async () => {
    const { body: client } = await register();
    const res = await tokenReq(client, { grant_type: "authorization_code", code: "sec_nope", code_verifier: pkce().verifier });
    expect((await res.json()).error).toBe("invalid_grant");
  });

  test("resource must match the authorization request", async () => {
    const ctx = await getCode();
    const res = await exchange(ctx, { resource: "https://other.example/mcp" });
    expect((await res.json()).error).toBe("invalid_target");
  });

  test("the matching resource is accepted", async () => {
    const ctx = await getCode();
    expect((await exchange(ctx, { resource: `${base}/mcp` })).status).toBe(200);
  });

  test("two simultaneous redemptions of one code: exactly one wins", async () => {
    const ctx = await getCode();
    const [a, b] = await Promise.all([exchange(ctx), exchange(ctx)]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
  });

  test("account deleted between approval and token exchange -> invalid_grant", async () => {
    const ctx = await getCode();
    users.delete("u1");
    expect((await (await exchange(ctx)).json()).error).toBe("invalid_grant");
  });

  test.each(["password", "client_credentials", "implicit", ""])("unsupported grant_type '%s'", async (g) => {
    const { body: client } = await register();
    const res = await tokenReq(client, { grant_type: g });
    expect(res.status).toBe(400);
    expect(["unsupported_grant_type", "invalid_request"]).toContain((await res.json()).error);
  });

  test("GET /token is not allowed", async () => {
    expect((await fetch(`${base}/token`)).status).toBe(405);
  });

  describe("confidential client", () => {
    test("correct secret works; missing or wrong secret -> invalid_client", async () => {
      const ctx = await getCode({ clientOverrides: { token_endpoint_auth_method: "client_secret_post" } });
      const noSecret = await tokenReq(ctx.client, { grant_type: "authorization_code", code: ctx.code, code_verifier: ctx.verifier }, false);
      expect((await noSecret.json()).error).toBe("invalid_client");
      const wrong = await postForm("/token", { client_id: ctx.client.client_id, client_secret: "x".repeat(64), grant_type: "authorization_code", code: ctx.code, code_verifier: ctx.verifier });
      expect((await wrong.json()).error).toBe("invalid_client");
      // wrong-secret attempts happen BEFORE the code is touched, so it is still redeemable.
      expect((await exchange(ctx)).status).toBe(200);
    });
  });
});

describe("/token - refresh_token", () => {
  test("rotates: new pair works, the old refresh token is dead", async () => {
    const t = await getTokens();
    const res = await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token });
    expect(res.status).toBe(200);
    const next = await res.json();
    expect(next.access_token).not.toBe(t.tokens.access_token);
    expect(next.refresh_token).not.toBe(t.tokens.refresh_token);
    expect((await mcpCall(next.access_token)).status).toBe(200);
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).json()).error).toBe("invalid_grant");
  });

  test("reusing a rotated refresh token later revokes the whole family (theft detection)", async () => {
    const t = await getTokens();
    const next = await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).json();
    advance(60 * 1000); // beyond the retry grace window
    const replay = await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token });
    expect((await replay.json()).error).toBe("invalid_grant");
    // attacker AND victim are now logged out: even the newest tokens are dead
    expect((await mcpCall(next.access_token)).status).toBe(401);
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: next.refresh_token })).json()).error).toBe("invalid_grant");
  });

  test("an immediate retry of a just-rotated token (lost response) is refused but does NOT revoke the family", async () => {
    const t = await getTokens();
    const next = await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).json();
    const retry = await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token });
    expect(retry.status).toBe(400);
    expect((await mcpCall(next.access_token)).status).toBe(200);
  });

  test("two simultaneous refreshes: exactly one succeeds", async () => {
    const t = await getTokens();
    const go = () => tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token });
    const [a, b] = await Promise.all([go(), go()]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
  });

  test("another client cannot use the refresh token", async () => {
    const t = await getTokens();
    const other = (await register({ client_name: "Mallory" })).body;
    const res = await tokenReq(other, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token });
    expect((await res.json()).error).toBe("invalid_grant");
    // and the rightful client is unaffected
    expect((await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).status).toBe(200);
  });

  test("an access token is not accepted as a refresh token (and vice versa on /mcp)", async () => {
    const t = await getTokens();
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.access_token })).json()).error).toBe("invalid_grant");
    expect((await mcpCall(t.tokens.refresh_token)).status).toBe(401);
  });

  test("scope can be narrowed but never widened", async () => {
    const t = await getTokens();
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token, scope: "splitease admin" })).json()).error).toBe("invalid_scope");
    expect((await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token, scope: "splitease" })).status).toBe(200);
  });

  test("refresh token expires after 30 days", async () => {
    const t = await getTokens();
    advance(31 * DAY);
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).json()).error).toBe("invalid_grant");
  });

  test("a sliding refresh keeps a regularly-used connection alive past 30 days total", async () => {
    let t = await getTokens();
    let refresh = t.tokens.refresh_token;
    for (let i = 0; i < 3; i++) {
      advance(20 * DAY);
      const res = await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: refresh });
      expect(res.status).toBe(200);
      refresh = (await res.json()).refresh_token;
    }
  });

  test("deleted account: refresh fails and the family is revoked", async () => {
    const t = await getTokens();
    users.delete("u1");
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).json()).error).toBe("invalid_grant");
    users.set("u1", { _id: "u1", name: "Alice", email: "alice@example.com" });
    expect((await mcpCall(t.tokens.access_token)).status).toBe(401);
  });

  test.each([["garbage", "serf_nope"], ["wrong prefix", "nope"], ["empty-ish", "x"]])("%s refresh token -> invalid_grant", async (_n, rt) => {
    const { body: client } = await register();
    expect((await (await tokenReq(client, { grant_type: "refresh_token", refresh_token: rt })).json()).error).toBe("invalid_grant");
  });
});

describe("protected /mcp endpoint", () => {
  test("access token expires after 1 hour", async () => {
    const t = await getTokens();
    expect((await mcpCall(t.tokens.access_token)).status).toBe(200);
    advance(61 * MIN);
    const res = await mcpCall(t.tokens.access_token);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  test.each([
    ["random seat_ token", "seat_" + "A".repeat(43)],
    ["truncated token", "seat_"],
    ["oversized token", "seat_" + "A".repeat(500)],
  ])("%s -> 401 with discovery hint", async (_n, tok) => {
    const res = await mcpCall(tok);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  test("a token minted for a different resource is rejected (audience binding)", async () => {
    const t = await getTokens();
    for (const rec of store._dump.tokens.values()) rec.resource = "https://other.example/mcp";
    expect((await mcpCall(t.tokens.access_token)).status).toBe(401);
  });

  test("a valid token for a since-deleted user is rejected", async () => {
    const t = await getTokens();
    users.delete("u1");
    expect((await mcpCall(t.tokens.access_token)).status).toBe(401);
  });

  test("the token also works via the X-SplitEase-Token header", async () => {
    const t = await getTokens();
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-splitease-token": t.tokens.access_token },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(res.status).toBe(200);
  });

  test("legacy Firebase tokens keep working alongside OAuth", async () => {
    verifyIdToken.mockResolvedValue({ email: "alice@example.com" });
    fakeUserModel.findOne = () => ({ select: () => ({ lean: async () => users.get("u1") }) });
    const res = await mcpCall("a.firebase.jwt");
    expect(res.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith("a.firebase.jwt");
  });

  test("an invalid legacy token also gets the discovery hint", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad"));
    const res = await mcpCall("a.bad.jwt");
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  test("a seat_ token is never sent to Firebase", async () => {
    await mcpCall("seat_" + "B".repeat(43));
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});

describe("revocation", () => {
  test("revoking the refresh token kills the whole family", async () => {
    const t = await getTokens();
    const res = await postForm("/revoke", { client_id: t.client.client_id, token: t.tokens.refresh_token });
    expect(res.status).toBe(200);
    expect((await mcpCall(t.tokens.access_token)).status).toBe(401);
    expect((await (await tokenReq(t.client, { grant_type: "refresh_token", refresh_token: t.tokens.refresh_token })).json()).error).toBe("invalid_grant");
  });

  test("revoking the access token also works", async () => {
    const t = await getTokens();
    await postForm("/revoke", { client_id: t.client.client_id, token: t.tokens.access_token });
    expect((await mcpCall(t.tokens.access_token)).status).toBe(401);
  });

  test("revoking an unknown token is a quiet 200 (RFC 7009)", async () => {
    const { body: client } = await register();
    expect((await postForm("/revoke", { client_id: client.client_id, token: "whatever" })).status).toBe(200);
  });

  test("a client cannot revoke another client's tokens", async () => {
    const t = await getTokens();
    const other = (await register({ client_name: "Mallory" })).body;
    expect((await postForm("/revoke", { client_id: other.client_id, token: t.tokens.refresh_token })).status).toBe(200);
    expect((await mcpCall(t.tokens.access_token)).status).toBe(200);
  });

  test("'disconnect all apps' revokes only the caller's tokens", async () => {
    const a = await getTokens({ user: "u1" });
    const b = await getTokens({ user: "u2" });
    expect((await fetch(`${base}/api/oauth/connections`, { method: "DELETE" })).status).toBe(401);
    const del = await fetch(`${base}/api/oauth/connections`, { method: "DELETE", headers: { authorization: "Bearer fb-u1" } });
    expect(del.status).toBe(200);
    expect((await mcpCall(a.tokens.access_token)).status).toBe(401);
    expect((await mcpCall(b.tokens.access_token)).status).toBe(200);
  });
});

describe("rate limiting on /mcp", () => {
  test("anonymous probes are throttled with a JSON-RPC 429", async () => {
    const app = express();
    app.use("/mcp", createMcpRouter({ oauth: stack, anonRateLimitMax: 2 }));
    const s = await new Promise((r) => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
    try {
      const url = `http://127.0.0.1:${s.address().port}/mcp`;
      const hit = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      expect((await hit()).status).toBe(401);
      expect((await hit()).status).toBe(401);
      const limited = await hit();
      expect(limited.status).toBe(429);
      expect((await limited.json()).error.message).toMatch(/too many/i);
    } finally {
      await new Promise((r) => s.close(r));
    }
  });

  test("one user's burst does not throttle another credential", async () => {
    const app = express();
    app.use("/mcp", createMcpRouter({ oauth: stack, rateLimitMax: 2 }));
    const s = await new Promise((r) => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
    try {
      const url = `http://127.0.0.1:${s.address().port}/mcp`;
      const hit = (tok) => fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: "{}" });
      await hit("seat_" + "C".repeat(43));
      await hit("seat_" + "C".repeat(43));
      expect((await hit("seat_" + "C".repeat(43))).status).toBe(429);
      expect((await hit("seat_" + "D".repeat(43))).status).toBe(401); // different bucket: reaches auth
    } finally {
      await new Promise((r) => s.close(r));
    }
  });
});

describe("OAuth disabled (misconfigured env)", () => {
  test("/mcp still serves legacy tokens and seat_ tokens get a clean 401", async () => {
    const app = express();
    app.use("/mcp", createMcpRouter({ oauth: { enabled: false } }));
    const s = await new Promise((r) => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
    try {
      const url = `http://127.0.0.1:${s.address().port}/mcp`;
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer seat_abc" }, body: "{}" });
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).not.toContain("resource_metadata");
    } finally {
      await new Promise((r) => s.close(r));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// The strongest check: drive the flow with the MCP SDK's own client, i.e. what
// real connectors do (discovery, DCR, PKCE, code exchange, bearer on every call).
describe("compatibility with the official MCP SDK client", () => {
  test("connect -> login redirect -> approve -> finishAuth -> list tools -> call tool -> refresh", async () => {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const { UnauthorizedError } = await import("@modelcontextprotocol/sdk/client/auth.js");

    let clientInfo, tokens, codeVerifierSaved, redirectedTo;
    const authProvider = {
      get redirectUrl() { return REDIRECT; },
      get clientMetadata() {
        return { client_name: "SDK Test Client", redirect_uris: [REDIRECT], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" };
      },
      clientInformation: () => clientInfo,
      saveClientInformation: (i) => { clientInfo = i; },
      tokens: () => tokens,
      saveTokens: (t) => { tokens = t; },
      redirectToAuthorization: (url) => { redirectedTo = url; },
      saveCodeVerifier: (v) => { codeVerifierSaved = v; },
      codeVerifier: () => codeVerifierSaved,
    };

    const mkClient = () => new Client({ name: "sdk-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider });

    // 1) First connect has no token: the SDK discovers the server, registers, and asks us to open a browser.
    await expect(mkClient().connect(transport)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(clientInfo.client_id).toBeTruthy();
    const authUrl = new URL(redirectedTo.toString());
    expect(authUrl.origin + authUrl.pathname).toBe(`${base}/authorize`);
    expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");

    // 2) "Browser": /authorize bounces to the SplitEase login page with a request id.
    const hop = await fetch(authUrl, { redirect: "manual" });
    expect(hop.status).toBe(302);
    expect(hop.headers.get("location").startsWith(LOGIN_URL)).toBe(true);
    const requestId = requestIdFrom(hop);

    // 3) User logs in on the website and clicks Allow.
    const { redirectUrl } = await (await decide(requestId, true, "u2")).json();
    const cbUrl = new URL(redirectUrl);
    expect(cbUrl.searchParams.get("state")).toBe(authUrl.searchParams.get("state"));

    // 4) Client finishes: exchanges the code, then connects with its bearer token.
    await transport.finishAuth(cbUrl.searchParams.get("code"));
    expect(tokens.access_token).toMatch(/^seat_/);

    const client = mkClient();
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider }));
    const list = await client.listTools();
    expect(list.tools.map((x) => x.name)).toContain("get_me");
    const me = await client.callTool({ name: "get_me", arguments: {} });
    expect(JSON.parse(me.content[0].text)).toMatchObject({ id: "u2", email: "bob@example.com" });
    await client.close();

    // 5) Access token expires; the SDK silently refreshes and carries on.
    advance(2 * 60 * MIN);
    const before = tokens.access_token;
    const client2 = mkClient();
    await client2.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider }));
    expect((await client2.listTools()).tools.length).toBeGreaterThan(0);
    expect(tokens.access_token).not.toBe(before);
    await client2.close();
  }, 20000);
});

// The Mongo store can't run here (no mongod), so at least prove that every
// document the provider writes is accepted by the real Mongoose schemas and
// that the TTL indexes are declared.
describe("Mongoose schema compatibility", () => {
  test("documents written during a full flow satisfy the OAuthClient/Pending/Code/Token schemas", async () => {
    const models = await import("../models/oauthModels.js");
    const { body: client } = await register({ token_endpoint_auth_method: "client_secret_post" });
    const { challenge, verifier } = pkce();
    const reqId = requestIdFrom(await startAuthorize(client, { challenge }));
    // capture the pending doc BEFORE it is consumed
    const pendingDoc = { ...[...store._dump.pending.values()][0] };
    const dec = await (await decide(reqId, true)).json();
    const codeDoc = { ...[...store._dump.codes.values()][0] };
    const code = new URL(dec.redirectUrl).searchParams.get("code");
    await tokenReq(client, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: REDIRECT });

    const clientRec = [...store._dump.clients.entries()][0];
    expect(new models.OAuthClient({ clientId: clientRec[0], metadata: clientRec[1].metadata, expiresAt: clientRec[1].expiresAt }).validateSync()).toBeUndefined();
    expect(new models.OAuthPending(pendingDoc).validateSync()).toBeUndefined();
    expect(new models.OAuthCode(codeDoc).validateSync()).toBeUndefined();
    const toks = [...store._dump.tokens.values()];
    expect(toks).toHaveLength(2);
    toks.forEach((t) => expect(new models.OAuthToken(t).validateSync()).toBeUndefined());

    for (const m of [models.OAuthClient, models.OAuthPending, models.OAuthCode, models.OAuthToken]) {
      const ttl = m.schema.indexes().find(([spec]) => spec.expiresAt === 1);
      expect(ttl?.[1].expireAfterSeconds).toBe(0);
    }
  });
});
