// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const header =
      req.headers.authorization || req.header("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;

    if (!token)
      return res.status(401).json({ message: "No token provided" });

    let user = null;

    // Try backend JWT first — this is the primary token the app issues.
    // Fast path: no network call required, just HMAC verification.
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded._id;
      if (!userId) throw new Error("Invalid JWT payload");

      user = await User.findById(userId).select("_id name email");
      if (!user) throw new Error("User not found");

      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      };
      return next();
    } catch {
      // Not a valid backend JWT — fall through to Firebase token check.
    }

    // Fallback: verify as a Firebase ID token.
    // Only reaches here during the initial Google/email sign-in flow before
    // the backend JWT has been issued.
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid, email, name, picture } = decoded;

      user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          firebaseUid: uid,
          email,
          name: name || email.split("@")[0],
          photoURL: picture || "",
        });
      } else if (picture && user.photoURL !== picture) {
        user.photoURL = picture;
        await user.save();
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      };
      return next();
    } catch {
      throw new Error("Invalid or expired token");
    }
  } catch (err) {
    console.error("❌ authMiddleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
