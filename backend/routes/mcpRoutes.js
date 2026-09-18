/**
 * Remote MCP endpoint (Streamable HTTP transport) for SplitEase.
 *
 * Lets MCP clients that speak the Streamable-HTTP transport (Claude custom
 * connectors, ChatGPT developer-mode connectors, etc.) reach the SplitEase
 * tools over a plain URL — e.g. https://api.split.elitecrew.online/mcp — with
 * no local install.
 *
 * AUTH: the request must carry a Firebase ID token, accepted either as
 *   Authorization: Bearer <token>
 * or  X-SplitEase-Token: <token>
 * The token is verified with Firebase Admin (same trust model as the REST API);
 * the resolved user is the ONLY identity the tools act on. There is no session
 * state — each POST builds a fresh, user-scoped server (stateless mode), which
 * is simple and safe behind a load balancer.
 */

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";
import { buildSplitEaseMcpServer } from "../services/mcpServer.js";

const router = express.Router();

// Parse JSON for MCP requests (the main app parser also covers this, but keep
// the route self-contained so it works regardless of mount order).
router.use(express.json({ limit: "4mb" }));

/** Extract the bearer token from Authorization or X-SplitEase-Token. */
function extractToken(req) {
  const auth = req.headers.authorization || req.header("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const alt = req.headers["x-splitease-token"];
  if (typeof alt === "string" && alt) return alt.trim();
  if (auth) return auth.trim();
  return "";
}

/** JSON-RPC error body (used before a transport exists). */
function rpcError(res, status, code, message, id = null) {
  return res.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id,
  });
}

/**
 * Resolve the Firebase token to a provisioned SplitEase user.
 * Returns { user } or throws with a friendly message.
 */
async function authenticate(req) {
  const token = extractToken(req);
  if (!token) {
    const err = new Error("Missing SplitEase token. Send it as 'Authorization: Bearer <token>'.");
    err.status = 401;
    throw err;
  }
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch {
    const err = new Error("Invalid or expired token. Get a fresh one from /mcp-login.");
    err.status = 401;
    throw err;
  }
  const user = await User.findOne({ email: decoded.email }).select("_id name email").lean();
  if (!user) {
    const err = new Error("No SplitEase account found for this token.");
    err.status = 403;
    throw err;
  }
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}

// A GET/DELETE to /mcp with no session is not used in stateless mode; respond
// with the JSON-RPC "method not allowed" shape clients expect.
const methodNotAllowed = (req, res) =>
  rpcError(res, 405, -32000, "Method not allowed. Use POST for MCP requests.");
router.get("/", methodNotAllowed);
router.delete("/", methodNotAllowed);

router.post("/", async (req, res) => {
  const rpcId = req.body?.id ?? null;

  let authedUser;
  try {
    authedUser = await authenticate(req);
  } catch (err) {
    return rpcError(res, err.status || 401, -32001, err.message, rpcId);
  }

  // Fresh, user-scoped server + stateless transport per request.
  const server = buildSplitEaseMcpServer(authedUser);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("❌ /mcp error:", err?.message || err);
    if (!res.headersSent) {
      rpcError(res, 500, -32603, "Internal MCP server error.", rpcId);
    }
  }
});

export default router;
