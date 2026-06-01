import admin from "../config/firebaseAdmin.js";
import User from "../models/userModel.js";

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

    // Normalize email — Firebase always lowercases but guard against edge cases
    const normalizedEmail = email.toLowerCase().trim();

    // Atomic upsert — findOne + create is NOT atomic and causes duplicate users
    // under concurrent requests (e.g. authMiddleware + googleLogin firing together).
    // findOneAndUpdate with upsert:true is a single atomic MongoDB operation.
    let user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $setOnInsert: {
          firebaseUid: uid,
          email: normalizedEmail,
          name: name || normalizedEmail.split("@")[0],
          photoURL: picture || "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync mutable fields that can change after account creation
    const updates = {};
    if (!user.firebaseUid && uid)                    updates.firebaseUid = uid;
    if (picture && user.photoURL !== picture)         updates.photoURL = picture;
    if (name && user.name !== name)                   updates.name = name;

    if (Object.keys(updates).length) {
      await User.updateOne({ _id: user._id }, { $set: updates });
      Object.assign(user, updates);
    }

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
