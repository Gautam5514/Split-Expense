import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const header =
      req.headers.authorization || req.header("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;

    if (!token)
      return res.status(401).json({ message: "No token provided" });

    // Verify Firebase ID token — only accepted credential.
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (firebaseErr) {
      // Token is not a valid Firebase ID token
      return res.status(401).json({ message: "Invalid or expired token. Please sign in again." });
    }

    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(401).json({ message: "Token missing email claim." });
    }

    // Find existing MongoDB user or create one on first contact.
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email,
        name: name || email.split("@")[0],
        photoURL: picture || "",
      });
    } else {
      // Keep name and photo in sync with Firebase (Google users may update either).
      let changed = false;
      if (!user.firebaseUid && uid) { user.firebaseUid = uid; changed = true; }
      if (picture && user.photoURL !== picture) { user.photoURL = picture; changed = true; }
      if (name && user.name !== name) { user.name = name; changed = true; }
      if (changed) await user.save();
    }

    req.user = {
      id: user._id.toString(),
      firebaseUid: uid,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (err) {
    console.error("❌ authMiddleware:", err.message);
    return res.status(401).json({ message: "Server error during authentication." });
  }
};
