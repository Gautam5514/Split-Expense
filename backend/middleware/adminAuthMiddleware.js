import jwt from "jsonwebtoken";

// Separate from authMiddleware.js on purpose: the admin session is a plain
// JWT (no Firebase user behind it), signed with the same JWT_SECRET but
// carrying role: "admin" so a leaked/expired regular user token can never
// pass this check.
export const adminAuthMiddleware = (req, res, next) => {
  const header = req.headers.authorization || req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = { id: decoded.adminId, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session. Please sign in again." });
  }
};
