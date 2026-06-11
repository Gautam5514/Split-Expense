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
    } catch {
      return res.status(401).json({ message: "Invalid or expired token. Please sign in again." });
    }

    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(401).json({ message: "Token missing email claim." });
    }

    // Atomic upsert - findOne + create is NOT atomic and causes duplicate users
    // under concurrent requests (e.g. authMiddleware + googleLogin firing together).
    const { user } = await findOrCreateUser({ uid, email, name, picture });

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
