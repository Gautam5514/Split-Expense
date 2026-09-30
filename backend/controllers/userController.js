import User from "../models/userModel.js";
import { isValidEmail, isValidObjectId } from "../middleware/validate.js";
import { searchContacts, lookupUserByEmail } from "./peopleController.js";
import { getContactIds, maskEmail } from "../utils/contacts.js";

// GET /api/users?q= - used by "new chat". Name search covers known contacts
// only; a stranger is returned only for an exact email match (masked). It
// used to regex-match the whole user table, which let anyone harvest emails.
export const listUsers = async (req, res) => {
  try {
    const rawQ = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 20);
    if (rawQ.length < 1) return res.json({ items: [], page: 1, limit, total: 0, totalPages: 0 });
    if (rawQ.length > 100) return res.status(400).json({ message: "Search term is too long." });

    const uid = req.user?.id;
    const contacts = await searchContacts(uid, { q: rawQ, limit });
    const items = contacts.map((u) => ({ _id: u._id, name: u.name, email: u.email, imageUrl: u.photoURL, isContact: true }));
    if (isValidEmail(rawQ) && !items.some((u) => u.email?.toLowerCase() === rawQ.toLowerCase())) {
      const found = await lookupUserByEmail(uid, rawQ);
      if (found) items.unshift({ _id: found._id, name: found.name, email: found.email, imageUrl: found.photoURL, isContact: found.isContact });
    }
    res.json({ items, page: 1, limit, total: items.length, totalPages: items.length ? 1 : 0 });
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
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user ID" });
    const user = await User.findById(id, "name email createdAt").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    // Full email only for yourself and people you already know.
    if (String(id) !== String(req.user?.id)) {
      const contacts = await getContactIds(req.user?.id);
      if (!contacts.has(String(id))) user.email = maskEmail(user.email);
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
