import User from "../models/userModel.js";

/**
 * GET /api/users
 * Query params:
 *  - q: search term (matches name or email, case-insensitive)
 *  - page: page number (default 1)
 *  - limit: page size (default 50, max 200)
 */
export const listUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);

    const filter = q
      ? {
          $or: [
            { email: new RegExp(q, "i") },
            { name: new RegExp(q, "i") },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      User.find(filter, "name email createdAt").sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/users/me
 * Requires auth; returns the current user (without password)
 */
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id; // set by auth middleware
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId, "name email createdAt").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/users/:id
 * Public or protected (your choice). Excludes password.
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "name email createdAt").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
