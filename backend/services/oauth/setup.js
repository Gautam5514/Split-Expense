/**
 * Assembles the OAuth stack: the SDK's standard endpoints (discovery, dynamic
 * client registration, /authorize, /token, /revoke) plus the two small JSON
 * endpoints the SplitEase website calls to show + record the user's consent.
 *
 * Built by a factory (no module-level side effects) so tests can inject an
 * in-memory store and a fake auth middleware.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { OAuthError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { SplitEaseOAuthProvider } from "./provider.js";

const limiter = (max, windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
  });

/**
 * The SDK drops `state` from error redirects when parameter validation itself
 * fails (e.g. missing code_challenge). RFC 6749 4.1.2.1 says to echo it, and
 * clients use it to match the response to their request, so add it back.
 */
function echoStateOnErrorRedirects(req, res, next) {
  const state = (req.method === "POST" ? req.body : req.query)?.state;
  if (typeof state === "string" && state) {
    const original = res.redirect.bind(res);
    res.redirect = (...args) => {
      const [status, url] = typeof args[0] === "number" ? args : [302, args[0]];
      try {
        const u = new URL(url);
        if (u.searchParams.has("error") && !u.searchParams.has("state")) u.searchParams.set("state", state);
        return original(status, u.href);
      } catch {
        return original(...args);
      }
    };
  }
  next();
}

export function createOAuthStack({ config, store, userExists, authMiddleware, now, ttl, rateLimits = {} }) {
  const provider = new SplitEaseOAuthProvider({ store, config, userExists, now, ttl });

  // Mounted at the app ROOT (discovery documents must live at well-known paths).
  const sdkRateLimit = rateLimits.sdk; // tests pass `false` to disable
  const sdkRouter = mcpAuthRouter({
    provider,
    issuerUrl: config.issuerUrl,
    resourceServerUrl: config.resourceUrl,
    scopesSupported: config.scopes,
    resourceName: "SplitEase MCP",
    ...(sdkRateLimit === false && {
      authorizationOptions: { rateLimit: false },
      tokenOptions: { rateLimit: false },
      clientRegistrationOptions: { rateLimit: false },
      revocationOptions: { rateLimit: false },
    }),
  });

  const authRouter = express.Router();
  authRouter.use("/authorize", echoStateOnErrorRedirects);
  authRouter.use(sdkRouter);

  // Mounted at /api/oauth - used by the website's consent page.
  const apiRouter = express.Router();
  apiRouter.use(express.json({ limit: "4kb" }));
  apiRouter.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  const readLimiter = rateLimits.api === false ? (_q, _s, n) => n() : limiter(rateLimits.apiMax ?? 120);
  const writeLimiter = rateLimits.api === false ? (_q, _s, n) => n() : limiter(rateLimits.apiWriteMax ?? 30);

  // What is being approved? (public: the id itself is the unguessable secret)
  apiRouter.get("/requests/:id", readLimiter, async (req, res) => {
    try {
      const info = await provider.getPendingRequest(req.params.id);
      if (!info) {
        return res.status(404).json({
          code: "REQUEST_EXPIRED",
          message: "This connection request is invalid or has expired. Go back to your AI app and connect again.",
        });
      }
      return res.json(info);
    } catch (err) {
      console.error("❌ oauth getPendingRequest:", err?.message || err);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // The signed-in user approves or denies. Identity comes ONLY from the
  // verified Firebase token (authMiddleware), never from the request body.
  apiRouter.post("/requests/:id/decision", writeLimiter, authMiddleware, async (req, res) => {
    if (typeof req.body?.approve !== "boolean") {
      return res.status(400).json({ message: "'approve' must be true or false." });
    }
    try {
      const out = await provider.completeAuthorization({
        requestId: req.params.id,
        userId: req.user.id,
        approve: req.body.approve,
      });
      return res.json({ redirectUrl: out.redirectUrl, approved: out.approved });
    } catch (err) {
      if (err instanceof OAuthError) {
        return res.status(400).json({ code: "REQUEST_EXPIRED", message: err.message });
      }
      console.error("❌ oauth completeAuthorization:", err?.message || err);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // "Disconnect all AI apps": revoke every token this user has granted.
  apiRouter.delete("/connections", writeLimiter, authMiddleware, async (req, res) => {
    try {
      await provider.revokeAllForUser(req.user.id);
      return res.json({ message: "All connected AI apps were disconnected." });
    } catch (err) {
      console.error("❌ oauth revokeAll:", err?.message || err);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  return {
    enabled: true,
    config,
    provider,
    authRouter,
    apiRouter,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(config.resourceUrl),
  };
}
