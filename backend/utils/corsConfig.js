/**
 * CORS allow-list, extracted from index.js so it can be unit-tested without
 * booting the whole Express/Socket.IO server.
 *
 * Because we send credentials (cookies/Authorization) cross-origin, we must
 * NOT reflect an arbitrary Origin back - only origins we actually control get
 * access. The list is built from FRONTEND_URL (comma-separated), defaulting to
 * localhost for dev.
 */

// Known production origins that must always be reachable regardless of how
// FRONTEND_URL is set on the deployed server. The EC2 box's .env is not
// version-controlled and is edited by hand, so a stale/incomplete value there
// must not be able to CORS-block real users out of their own data the way it
// did after the origin allow-list first shipped (2026-09-15 incident).
const ALWAYS_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://split.elitecrew.online",
  "https://split-expense-vert.vercel.app",
];

/** Parse FRONTEND_URL (comma-separated) into a trimmed, deduped allow-list,
 *  always including the known production origins above. */
export const buildAllowedOrigins = (frontendUrl) => {
  const fromEnv = (frontendUrl || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...ALWAYS_ALLOWED_ORIGINS, ...fromEnv]));
};

/**
 * Build the `origin` callback the `cors` package expects.
 * - No Origin header (curl, server-to-server) => allowed.
 * - Origin in the allow-list => allowed.
 * - Anything else => rejected with an Error (cors turns this into a failure).
 */
export const makeCorsOriginCallback = (allowedOrigins) => (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  console.warn(`CORS: rejected origin "${origin}". Allowed: ${allowedOrigins.join(", ")}`);
  callback(new Error("Not allowed by CORS"));
};
