/**
 * CORS allow-list, extracted from index.js so it can be unit-tested without
 * booting the whole Express/Socket.IO server.
 *
 * Because we send credentials (cookies/Authorization) cross-origin, we must
 * NOT reflect an arbitrary Origin back - only origins we actually control get
 * access. The list is built from FRONTEND_URL (comma-separated), defaulting to
 * localhost for dev.
 */

/** Parse FRONTEND_URL (comma-separated) into a trimmed, non-empty allow-list. */
export const buildAllowedOrigins = (frontendUrl) =>
  (frontendUrl || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Build the `origin` callback the `cors` package expects.
 * - No Origin header (curl, server-to-server) => allowed.
 * - Origin in the allow-list => allowed.
 * - Anything else => rejected with an Error (cors turns this into a failure).
 */
export const makeCorsOriginCallback = (allowedOrigins) => (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error("Not allowed by CORS"));
};
