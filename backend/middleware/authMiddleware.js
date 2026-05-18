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

    // ✅ Try verifying as Firebase token first
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid, email, name, picture } = decoded;
      console.log("✅ Firebase token verified:", email);

      user = await User.findOne({ email });

      // If new user → create
      if (!user) {
        user = await User.create({
          firebaseUid: uid,
          email,
          name: name || email.split("@")[0],
          photoURL: picture || "",
        });
        console.log("🆕 New Firebase user added:", user.email);
      } else {
        // Update photo if changed
        if (picture && user.photoURL !== picture) {
          user.photoURL = picture;
          await user.save();
        }
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      };
      return next();
    } catch (firebaseErr) {
      console.warn("⚠️ Not a Firebase token, checking JWT...");
    }

    // 🟡 If not Firebase, try legacy JWT
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
      next();
    } catch {
      throw new Error("Invalid or expired token");
    }
  } catch (err) {
    console.error("❌ authMiddleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
