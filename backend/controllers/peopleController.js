// Finding people safely. Name search only covers known contacts; anyone else
// can only be found by their exact email, and then only with a masked email.
// This is what stops a signed-in user from paging through everybody's email.
import mongoose from "mongoose";
import User from "../models/userModel.js";
import UserProfile from "../models/userProfileModel.js";
import Group from "../models/groupModel.js";
import { escapeRegExp, isValidEmail, isValidObjectId, normalizeEmail } from "../middleware/validate.js";
import { getContactIds, maskEmail, isBlockedBetween } from "../utils/contacts.js";

const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());

const photoFor = async (users) => {
  const missing = users.filter((u) => !u.photoURL).map((u) => u._id);
  if (!missing.length) return new Map();
  const profiles = await UserProfile.find({ userId: { $in: missing } }).select("userId profileImage.url").lean();
  return new Map(profiles.map((p) => [String(p.userId), p.profileImage?.url || null]));
};

/**
 * Known contacts matching `q` (name or email). Empty q = top contacts.
 * With `excludeGroupId`, members of that group are left out (for "add people").
 */
export const searchContacts = async (uid, { q = "", limit = 20, excludeIds = [] } = {}) => {
  const contactIds = await getContactIds(uid);
  const exclude = new Set(excludeIds.map(String));
  const ids = [...contactIds].filter((id) => !exclude.has(id));
  if (!ids.length) return [];
  const filter = { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } };
  const term = String(q || "").trim();
  if (term) {
    const rx = new RegExp(escapeRegExp(term), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).select("name email photoURL").sort({ name: 1 }).limit(limit).lean();
  const photos = await photoFor(users);
  return users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    photoURL: u.photoURL || photos.get(String(u._id)) || null,
    isContact: true,
  }));
};

/**
 * Exact-email lookup. Returns null when there's no match, the person turned
 * email discovery off, or either side blocked the other - all look the same
 * to the caller so none of them can be probed.
 */
export const lookupUserByEmail = async (uid, email) => {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return null;
  const [me, user] = await Promise.all([
    User.findById(uid).select("blockedUsers").lean(),
    User.findOne({ email: normalized }).select("name email photoURL privacy blockedUsers").lean(),
  ]);
  if (!user || String(user._id) === String(uid)) return null;
  if (isBlockedBetween(me, user)) return null;
  const contactIds = await getContactIds(uid);
  const isContact = contactIds.has(String(user._id));
  if (!isContact && user.privacy?.discoverableByEmail === false) return null;
  const photos = await photoFor([user]);
  return {
    _id: user._id,
    name: user.name,
    // They typed the full address themselves; show it back only for contacts
    // and mask it otherwise so a response never adds information.
    email: isContact ? user.email : maskEmail(user.email),
    maskedEmail: maskEmail(user.email),
    photoURL: user.photoURL || photos.get(String(user._id)) || null,
    isContact,
  };
};

/* GET /api/users/contacts?q=&excludeGroupId= */
export const getContacts = async (req, res) => {
  try {
    const uid = asId(req.user);
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    let excludeIds = [];
    const { excludeGroupId } = req.query;
    if (excludeGroupId && isValidObjectId(excludeGroupId)) {
      const g = await Group.findById(excludeGroupId).select("members").lean();
      if (g && g.members.map(String).includes(String(uid))) excludeIds = g.members.map(String);
    }
    res.json(await searchContacts(uid, { q, excludeIds }));
  } catch (err) {
    console.error("getContacts error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* GET /api/users/lookup?email= */
export const lookupByEmail = async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    if (!isValidEmail(email)) return res.status(400).json({ field: "email", message: "Enter a full email address." });
    const user = await lookupUserByEmail(asId(req.user), email);
    res.json(user ? { found: true, user } : { found: false });
  } catch (err) {
    console.error("lookupByEmail error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* GET /api/users/me/privacy */
export const getPrivacy = async (req, res) => {
  try {
    const me = await User.findById(asId(req.user)).select("privacy blockedUsers").populate("blockedUsers", "name email").lean();
    res.json({
      addPolicy: me?.privacy?.addPolicy || "contacts",
      discoverableByEmail: me?.privacy?.discoverableByEmail !== false,
      blocked: (me?.blockedUsers || []).map((u) => ({ _id: u._id, name: u.name, email: maskEmail(u.email) })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* PATCH /api/users/me/privacy { addPolicy?, discoverableByEmail? } */
export const updatePrivacy = async (req, res) => {
  try {
    const update = {};
    if (req.body.addPolicy !== undefined) {
      if (!["contacts", "invite"].includes(req.body.addPolicy))
        return res.status(400).json({ field: "addPolicy", message: "Invalid option." });
      update["privacy.addPolicy"] = req.body.addPolicy;
    }
    if (req.body.discoverableByEmail !== undefined)
      update["privacy.discoverableByEmail"] = req.body.discoverableByEmail === true;
    if (!Object.keys(update).length) return res.status(400).json({ message: "Nothing to update." });
    await User.updateOne({ _id: asId(req.user) }, { $set: update });
    return getPrivacy(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* POST /api/users/:id/block · DELETE /api/users/:id/block */
export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const uid = asId(req.user);
    if (!isValidObjectId(id) || String(id) === String(uid)) return res.status(400).json({ message: "Invalid user." });
    if (!(await User.exists({ _id: id }))) return res.status(404).json({ message: "User not found." });
    await User.updateOne({ _id: uid }, { $addToSet: { blockedUsers: new mongoose.Types.ObjectId(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user." });
    await User.updateOne({ _id: asId(req.user) }, { $pull: { blockedUsers: new mongoose.Types.ObjectId(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
