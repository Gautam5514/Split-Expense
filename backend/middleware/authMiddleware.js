import admin from "../config/firebaseAdmin.js";
import { findOrCreateUser, recordActiveDay } from "../utils/referralService.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const header =
      req.headers.authorization || req.header("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;

    if (!token)
      return res.status(401).json({ message: "No token provided" });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      // Distinguish expiry (client can silently refresh + retry) from a
      // genuinely invalid/revoked token (client must force a sign-out).
      const isExpired = err?.code === "auth/id-token-expired";
      return res.status(401).json({
        code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        message: "Invalid or expired token. Please sign in again.",
      });
    }

    const { uid, email, name, picture, email_verified: emailVerified } = decoded;

    if (!email) {
      return res.status(401).json({ message: "Token missing email claim." });
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
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before using SplitEase.",
      });
    }

    // Fire-and-forget: don't let active-day bookkeeping block the request.
    recordActiveDay(user).catch((err) => console.error("recordActiveDay error:", err.message));

    req.user = {
      id:          user._id.toString(),
      firebaseUid: uid,
      email:       user.email,
      name:        user.name,
    };
    next();
  } catch (err) {
    console.error("❌ authMiddleware:", err.message);
    return res.status(401).json({ message: "Server error during authentication." });
  }
};
