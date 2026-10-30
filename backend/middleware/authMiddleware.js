import admin from "../config/firebaseAdmin.js";
import { findOrCreateUser, recordActiveDay } from "../utils/referralService.js";
import { authCache, AUTH_CACHE_TTL_MS, AUTH_CACHE_MAX } from "../utils/authCache.js";

export { invalidateAuthCache } from "../utils/authCache.js";

// Cache-miss path: verify the Firebase token, resolve/provision the user and
// remember the result. Returns { ok: true, user } or { ok: false, status, body }.
const resolveUncached = async (token) => {
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (err) {
    // Distinguish expiry (client can silently refresh + retry) from a
    // genuinely invalid/revoked token (client must force a sign-out).
    const isExpired = err?.code === "auth/id-token-expired";
    return {
      ok: false,
      status: 401,
      body: {
        code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        message: "Invalid or expired token. Please sign in again.",
      },
    };
  }

  const { uid, email, name, picture, email_verified: emailVerified } = decoded;

  if (!email) {
    return { ok: false, status: 401, body: { message: "Token missing email claim." } };
  }

  // Atomic upsert - findOne + create is NOT atomic and causes duplicate users
  // under concurrent requests (e.g. authMiddleware + googleLogin firing together).
  //
  // Provisioning is gated on a verified email. Anyone can create a Firebase
  // password account directly with the public web API key, skipping the
  // signup OTP entirely; without this gate that account would silently
  // become a real user on its first authenticated request. Google sign-ins
  // and accounts created by verifySignupOtp both arrive already verified.
  // The gate is on creation only, so existing users are never locked out.
  const { user } = await findOrCreateUser({
    uid,
    email,
    name,
    picture,
    allowCreate: emailVerified === true,
  });

  if (!user) {
    return {
      ok: false,
      status: 403,
      body: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before using SplitEase.",
      },
    };
  }

  // Fire-and-forget: don't let active-day bookkeeping block the request.
  recordActiveDay(user).catch((err) => console.error("recordActiveDay error:", err.message));

  const resolved = {
    id:          user._id.toString(),
    firebaseUid: uid,
    email:       user.email,
    name:        user.name,
  };
  // Never outlive the token itself.
  const tokenExpiry = decoded.exp ? decoded.exp * 1000 : Date.now() + AUTH_CACHE_TTL_MS;
  authCache.set(token, {
    user: { ...resolved },
    expiresAt: Math.min(tokenExpiry, Date.now() + AUTH_CACHE_TTL_MS),
  });
  if (authCache.size > AUTH_CACHE_MAX) authCache.delete(authCache.keys().next().value);
  return { ok: true, user: resolved };
};

// token -> in-flight resolution. A page load fires many requests with the same
// token at once; without this each one repeated verifyIdToken + the user upsert.
const inflight = new Map();

export const authMiddleware = async (req, res, next) => {
  try {
    const header =
      req.headers.authorization || req.header("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;

    if (!token)
      return res.status(401).json({ message: "No token provided" });

    const hit = authCache.get(token);
    if (hit) {
      if (Date.now() < hit.expiresAt) {
        authCache.delete(token);
        authCache.set(token, hit);
        req.user = { ...hit.user };
        return next();
      }
      authCache.delete(token);
    }

    let pending = inflight.get(token);
    if (!pending) {
      pending = resolveUncached(token).finally(() => inflight.delete(token));
      inflight.set(token, pending);
    }
    const result = await pending;
    if (!result.ok) return res.status(result.status).json(result.body);
    req.user = { ...result.user };
    next();
  } catch (err) {
    console.error("❌ authMiddleware:", err.message);
    return res.status(401).json({ message: "Server error during authentication." });
  }
};
