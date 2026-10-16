/**
 * Remote MCP endpoint (Streamable HTTP transport) for SplitEase.
 *
 * Lets MCP clients that speak the Streamable-HTTP transport (Claude custom
 * connectors, ChatGPT developer-mode connectors, etc.) reach the SplitEase
 * tools over a plain URL, e.g. https://api.splitease.tech/mcp - no local
 * install.
 *
 * AUTH (either works):
 *  1. OAuth 2.1 (recommended). A client that connects without credentials gets
 *     a 401 with a `WWW-Authenticate ... resource_metadata=` header, discovers
 *     the authorization server, sends the user to the SplitEase website to log
 *     in, and receives an opaque access token (`seat_...`) bound to this
 *     endpoint. See services/oauth.
 *  2. Legacy: a Firebase ID token, as `Authorization: Bearer <token>` or
 *     `X-SplitEase-Token: <token>` (the /mcp-login page). Kept so existing
 *     setups don't break.
 * Either way the resolved user is the ONLY identity the tools act on. There is
 * no session state - each POST builds a fresh, user-scoped server (stateless).
 */

import crypto from "node:crypto";
import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { OAuthError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";
import { buildSplitEaseMcpServer } from "../services/mcpServer.js";
import { oauth as defaultOAuth } from "../services/oauth/instance.js";
import { ACCESS_PREFIX } from "../services/oauth/provider.js";

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

const authError = (message, status) => Object.assign(new Error(message), { status });

export function createMcpRouter({ oauth = defaultOAuth, rateLimitMax = 300, anonRateLimitMax = 60 } = {}) {
  const router = express.Router();

  // Parse JSON for MCP requests (the main app parser also covers this, but keep
  // the route self-contained so it works regardless of mount order).
  router.use(express.json({ limit: "4mb" }));

  // Limit per credential (so one user's burst can't starve others, and nobody
  // shares a bucket when TRUST_PROXY is unset), falling back to per-IP for
  // anonymous probes.
  router.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: (req) => (extractToken(req) ? rateLimitMax : anonRateLimitMax),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const t = extractToken(req);
        return t ? `t:${crypto.createHash("sha256").update(t).digest("hex").slice(0, 24)}` : `ip:${ipKeyGenerator(req.ip || "")}`;
      },
      validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
      handler: (req, res) => rpcError(res, 429, -32002, "Too many requests. Slow down and retry shortly."),
    }),
  );

  /** Tell clients where to start OAuth discovery (RFC 9728). */
  const challenge = (res, reason) => {
    const parts = ["Bearer"];
    const attrs = [];
    if (reason) attrs.push(`error="invalid_token"`, `error_description="${reason}"`);
    if (oauth?.enabled && oauth.resourceMetadataUrl) attrs.push(`resource_metadata="${oauth.resourceMetadataUrl}"`);
    if (attrs.length) parts.push(attrs.join(", "));
    res.set("WWW-Authenticate", parts.join(" "));
  };

  /** Resolve credentials to a provisioned SplitEase user, or throw {status}. */
  async function authenticate(req) {
    const token = extractToken(req);
    if (!token) {
      throw authError("Missing SplitEase token. Send it as 'Authorization: Bearer <token>'.", 401);
    }

    // ── OAuth access token ───────────────────────────────────────────────
    // Anything carrying our prefix is ours: it is verified here and is NEVER
    // forwarded to Firebase, even when malformed.
    if (token.startsWith(ACCESS_PREFIX)) {
      if (!oauth?.enabled) throw authError("OAuth is not enabled on this server.", 401);
      let info;
      try {
        info = await oauth.provider.verifyAccessToken(token);
      } catch (err) {
        if (err instanceof OAuthError) throw authError("Invalid or expired token. Reconnect the SplitEase connector.", 401);
        throw err;
      }
      // Audience check: the token must have been minted for THIS endpoint.
      const want = oauth.config.resourceUrl.href.replace(/\/$/, "");
      if (!info.resource || info.resource.href.replace(/\/$/, "") !== want) {
        throw authError("Token was not issued for this resource.", 401);
      }
      const user = await User.findById(info.extra.userId).select("_id name email").lean();
      if (!user) throw authError("No SplitEase account found for this token.", 401);
      return { id: user._id.toString(), email: user.email, name: user.name };
    }

    // ── legacy Firebase ID token ─────────────────────────────────────────
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch {
      throw authError("Invalid or expired token. Get a fresh one from /mcp-login.", 401);
    }
    if (!decoded?.email) throw authError("Invalid or expired token. Get a fresh one from /mcp-login.", 401);
    const user = await User.findOne({ email: decoded.email }).select("_id name email").lean();
    if (!user) throw authError("No SplitEase account found for this token.", 403);
    return { id: user._id.toString(), email: user.email, name: user.name };
  }

  // A GET/DELETE to /mcp with no session is not used in stateless mode; respond
  // with the JSON-RPC "method not allowed" shape clients expect.
  const methodNotAllowed = (req, res) => {
    res.set("Allow", "POST");
    return rpcError(res, 405, -32000, "Method not allowed. Use POST for MCP requests.");
  };
  router.get("/", methodNotAllowed);
  router.delete("/", methodNotAllowed);

  router.post("/", async (req, res) => {
    const rpcId = req.body?.id ?? null;

    let authedUser;
    try {
      authedUser = await authenticate(req);
    } catch (err) {
      const status = err.status || 500;
      if (status === 401) challenge(res, extractToken(req) ? "The access token is invalid or expired" : "");
      if (!err.status) {
        console.error("❌ /mcp auth error:", err?.message || err);
        return rpcError(res, 500, -32603, "Internal MCP server error.", rpcId);
      }
      return rpcError(res, status, -32001, err.message, rpcId);
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

  return router;
}

export default createMcpRouter();
