import mongoose from "mongoose";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Process-level safety nets so ONE bad request / DB hiccup can never take the
 * whole API (and every connected user) down.
 *
 * - unhandledRejection: log and keep serving (Node >= 15 would otherwise exit).
 * - uncaughtException:  state may be corrupt, so drain gracefully then exit and
 *                       let PM2 / the platform restart a clean process.
 */
export function installProcessGuards(shutdown) {
  process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled promise rejection:", reason?.stack || reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("💥 Uncaught exception:", err?.stack || err);
    shutdown("uncaughtException", 1);
  });
  process.on("SIGTERM", () => shutdown("SIGTERM", 0));
  process.on("SIGINT", () => shutdown("SIGINT", 0));
}

/**
 * Graceful shutdown: stop accepting connections, let in-flight requests finish,
 * close Mongo, and force-exit after a deadline.
 */
export function createShutdown({ server, io, timeoutMs = 10000 }) {
  let closing = false;
  return function shutdown(signal, code = 0) {
    if (closing) return;
    closing = true;
    console.log(`🛑 ${signal} received - shutting down gracefully`);
    const force = setTimeout(() => {
      console.error("⏱️  Forced exit after shutdown timeout");
      process.exit(code || 1);
    }, timeoutMs);
    force.unref();
    try { io?.close?.(); } catch { /* ignore */ }
    server.close(async () => {
      try { await mongoose.connection.close(); } catch { /* ignore */ }
      clearTimeout(force);
      process.exit(code);
    });
  };
}

/** /health = liveness (cheap, no DB). /ready = readiness (is Mongo connected?). */
export function healthHandlers(app) {
  const startedAt = Date.now();
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptimeSec: Math.round((Date.now() - startedAt) / 1000) });
  });
  app.get("/ready", (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ready" : "degraded", db: dbUp });
  });
}

/**
 * Generous per-IP ceiling over the whole API. Route-level limiters (login, OTP,
 * AI, ...) stay stricter; this only stops one client flooding the event loop.
 * Health checks and the MCP endpoint (own limiter) are skipped.
 */
export function globalApiLimiter({ windowMs = 60_000, limit = 600 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/ready" || req.path.startsWith("/mcp"),
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: { message: "Too many requests. Please slow down and try again shortly." },
  });
}
