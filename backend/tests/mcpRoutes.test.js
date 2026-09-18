// Tests the remote MCP HTTP route (routes/mcpRoutes.js) auth + method handling.
// firebase-admin, the User model, the MCP factory and the transport are mocked
// so we isolate the route's own logic (token extraction, verify, 401/403,
// method-not-allowed) without a real DB, Firebase, or MCP protocol round-trip.
import { jest } from "@jest/globals";
import http from "node:http";
import express from "express";

// ── mocks ────────────────────────────────────────────────────────────────
const verifyIdToken = jest.fn();
const fakeAdmin = { auth: () => ({ verifyIdToken }) };

const fakeUser = {
  findOne: jest.fn(),
};

// A transport stub that just replies 200 with a marker so we know the request
// reached the protocol layer (i.e. auth passed).
const handleRequest = jest.fn(async (req, res) => {
  res.status(200).json({ jsonrpc: "2.0", result: { reached: true }, id: req.body?.id ?? null });
});
class StubTransport {
  constructor() {}
  close() {}
}
StubTransport.prototype.handleRequest = handleRequest;

const buildSplitEaseMcpServer = jest.fn(() => ({
  connect: jest.fn(async () => {}),
  close: jest.fn(),
}));

jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: fakeAdmin }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: fakeUser }));
jest.unstable_mockModule("../services/mcpServer.js", () => ({ buildSplitEaseMcpServer }));
jest.unstable_mockModule("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: StubTransport,
}));

const mcpRoutes = (await import("../routes/mcpRoutes.js")).default;

// ── spin up a throwaway server on an ephemeral port ─────────────────────────
let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.use("/mcp", mcpRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  verifyIdToken.mockReset();
  fakeUser.findOne.mockReset();
  handleRequest.mockClear();
  buildSplitEaseMcpServer.mockClear();
});

// tiny fetch-free HTTP helper
function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(baseUrl + path);
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const initBody = { jsonrpc: "2.0", id: 1, method: "initialize", params: {} };

describe("auth", () => {
  test("401 when no token is provided", async () => {
    const r = await request("POST", "/mcp", { body: initBody });
    expect(r.status).toBe(401);
    expect(r.body.error.message).toMatch(/missing splitease token/i);
    expect(handleRequest).not.toHaveBeenCalled();
  });

  test("401 when the token is invalid/expired", async () => {
    verifyIdToken.mockRejectedValue(new Error("expired"));
    const r = await request("POST", "/mcp", {
      headers: { Authorization: "Bearer badtoken" },
      body: initBody,
    });
    expect(r.status).toBe(401);
    expect(r.body.error.message).toMatch(/invalid or expired/i);
    expect(handleRequest).not.toHaveBeenCalled();
  });

  test("403 when the token is valid but no SplitEase account exists", async () => {
    verifyIdToken.mockResolvedValue({ email: "ghost@e.com" });
    fakeUser.findOne.mockReturnValue({
      select: () => ({ lean: async () => null }),
    });
    const r = await request("POST", "/mcp", {
      headers: { Authorization: "Bearer goodtoken" },
      body: initBody,
    });
    expect(r.status).toBe(403);
    expect(r.body.error.message).toMatch(/no splitease account/i);
    expect(handleRequest).not.toHaveBeenCalled();
  });

  test("passes to the MCP transport when token + account are valid", async () => {
    verifyIdToken.mockResolvedValue({ email: "alice@e.com" });
    fakeUser.findOne.mockReturnValue({
      select: () => ({ lean: async () => ({ _id: "u1", name: "Alice", email: "alice@e.com" }) }),
    });
    const r = await request("POST", "/mcp", {
      headers: { Authorization: "Bearer goodtoken" },
      body: initBody,
    });
    expect(r.status).toBe(200);
    expect(r.body.result.reached).toBe(true);
    expect(buildSplitEaseMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@e.com", name: "Alice" }),
    );
    expect(handleRequest).toHaveBeenCalledTimes(1);
  });

  test("accepts the token via X-SplitEase-Token header too", async () => {
    verifyIdToken.mockResolvedValue({ email: "alice@e.com" });
    fakeUser.findOne.mockReturnValue({
      select: () => ({ lean: async () => ({ _id: "u1", name: "Alice", email: "alice@e.com" }) }),
    });
    const r = await request("POST", "/mcp", {
      headers: { "X-SplitEase-Token": "goodtoken" },
      body: initBody,
    });
    expect(r.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith("goodtoken");
  });
});

describe("method handling", () => {
  test("GET is rejected with 405 JSON-RPC", async () => {
    const r = await request("GET", "/mcp");
    expect(r.status).toBe(405);
    expect(r.body.error.message).toMatch(/method not allowed/i);
  });

  test("DELETE is rejected with 405 JSON-RPC", async () => {
    const r = await request("DELETE", "/mcp");
    expect(r.status).toBe(405);
  });
});
