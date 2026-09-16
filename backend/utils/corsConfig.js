/**
 * CORS — allow every origin, restored to the original pre-hardening behavior.
 * The allow-list variant introduced on 2026-09-15 blocked real users in
 * production whenever FRONTEND_URL on the server drifted from the actual
 * frontend domain, taking every logged-in user's data down with it. This app
 * authenticates via a Firebase bearer token in the Authorization header, not
 * cookies, so reflecting the request Origin back does not expose a
 * cookie-based CSRF/session-theft risk the way it would for a cookie-auth app.
 */

/** Kept only for logging at boot; no longer restricts which origins are allowed. */
export const buildAllowedOrigins = (frontendUrl) =>
  (frontendUrl || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/** Build the `origin` callback the `cors` package expects: allow everything. */
export const makeCorsOriginCallback = () => (origin, callback) => callback(null, true);
