// Unified global search across the things a signed-in user can actually reach:
//   • groups they belong to (by name)
//   • known contacts (by name/email) — same trust boundary as people search
//   • an exact-email stranger lookup (masked) so "search a new person" works
//   • expenses inside their groups (by description), deep-linked to the group
//
// Everything is scoped to the caller: group and expense matches are restricted
// to groups the user is a member of, and people matches reuse the contact
// rules from peopleController (name search = contacts only, strangers only by
// exact email). This endpoint therefore never leaks data the user couldn't
// already see elsewhere in the app.
import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import UserProfile from "../models/userProfileModel.js";
import User from "../models/userModel.js";
import { escapeRegExp, isValidEmail } from "../middleware/validate.js";
import { searchContacts, lookupUserByEmail } from "./peopleController.js";

const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());

// Per-category caps keep the dropdown snappy and the payload small.
const GROUP_LIMIT = 6;
const PEOPLE_LIMIT = 6;
const EXPENSE_LIMIT = 6;
const MAX_QUERY_LEN = 100;

// Resolve avatar URLs for a batch of user ids (Google photo first, then upload).
const photoMapFor = async (userIds) => {
  const ids = [...new Set(userIds.map(String))].filter(Boolean);
  if (!ids.length) return new Map();
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: ids } }).select("photoURL").lean(),
    UserProfile.find({ userId: { $in: ids } }).select("userId profileImage.url").lean(),
  ]);
  const map = new Map(users.map((u) => [String(u._id), u.photoURL || null]));
  for (const p of profiles) {
    if (!map.get(String(p.userId))) map.set(String(p.userId), p.profileImage?.url || null);
  }
  return map;
};

const searchGroups = async (uid, rx) => {
  const groups = await Group.find({
    members: new mongoose.Types.ObjectId(uid),
    name: rx,
  })
    .select("name icon photo members groupType isCompleted updatedAt")
    .sort({ updatedAt: -1 })
    .limit(GROUP_LIMIT)
    .lean();

  return groups.map((g) => ({
    id: String(g._id),
    type: "group",
    title: g.name,
    subtitle: `${(g.members || []).length} member${(g.members || []).length === 1 ? "" : "s"}${
      g.isCompleted ? " · settled" : ""
    }`,
    icon: g.icon || null,
    photoUrl: g.photo?.url || null,
    groupType: g.groupType || "general",
    memberCount: (g.members || []).length,
  }));
};

const searchPeople = async (uid, term) => {
  // Known contacts by name/email.
  const contacts = await searchContacts(uid, { q: term, limit: PEOPLE_LIMIT });
  const results = contacts.map((c) => ({
    id: String(c._id),
    type: "person",
    title: c.name,
    subtitle: c.email,
    photoUrl: c.photoURL || null,
    isContact: true,
  }));

  // If the term is a full email and it's not already a matched contact, try an
  // exact-email lookup so users can find & message someone new. Masked when a
  // stranger, exactly like the people-search endpoint.
  if (isValidEmail(term) && !results.some((r) => r.subtitle?.toLowerCase() === term.toLowerCase())) {
    const stranger = await lookupUserByEmail(uid, term);
    if (stranger) {
      results.push({
        id: String(stranger._id),
        type: "person",
        title: stranger.name,
        subtitle: stranger.email,
        photoUrl: stranger.photoURL || null,
        isContact: !!stranger.isContact,
      });
    }
  }

  return results.slice(0, PEOPLE_LIMIT);
};

const searchExpenses = async (uid, rx) => {
  // Only expenses in groups the caller belongs to.
  const myGroups = await Group.find({ members: new mongoose.Types.ObjectId(uid) })
    .select("_id name icon photo")
    .lean();
  if (!myGroups.length) return [];

  const groupMap = new Map(myGroups.map((g) => [String(g._id), g]));
  const groupIds = myGroups.map((g) => g._id);

  const expenses = await Expense.find({
    groupId: { $in: groupIds },
    isSettlement: { $ne: true },
    description: rx,
  })
    .select("description amount currency groupId date createdAt")
    .sort({ date: -1, createdAt: -1 })
    .limit(EXPENSE_LIMIT)
    .lean();

  return expenses.map((e) => {
    const group = groupMap.get(String(e.groupId));
    return {
      id: String(e._id),
      type: "expense",
      title: e.description,
      subtitle: `${e.currency ? e.currency + " " : "₹"}${e.amount} · ${group?.name || "Group"}`,
      groupId: String(e.groupId),
      groupName: group?.name || "Group",
      groupIcon: group?.icon || null,
      groupPhotoUrl: group?.photo?.url || null,
      amount: e.amount,
      currency: e.currency || null,
    };
  });
};

/**
 * GET /api/users/search/global?q=<term>
 * Returns { query, groups[], people[], expenses[], total }.
 */
export const globalSearch = async (req, res) => {
  try {
    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const term = typeof req.query.q === "string" ? req.query.q.trim().slice(0, MAX_QUERY_LEN) : "";
    if (!term) {
      return res.json({ query: "", groups: [], people: [], expenses: [], total: 0 });
    }

    const rx = new RegExp(escapeRegExp(term), "i");

    // All three searches are independent — run them together.
    const [groups, people, expenses] = await Promise.all([
      searchGroups(uid, rx),
      searchPeople(uid, term),
      searchExpenses(uid, rx),
    ]);

    // Attach up-to-date avatars for people results (searchContacts already
    // resolves them, so this is a no-op unless a stranger lookup added one
    // without a photo — kept for consistency and future-proofing).
    const missingPhoto = people.filter((p) => !p.photoUrl).map((p) => p.id);
    if (missingPhoto.length) {
      const photos = await photoMapFor(missingPhoto);
      for (const p of people) {
        if (!p.photoUrl) p.photoUrl = photos.get(p.id) || null;
      }
    }

    res.json({
      query: term,
      groups,
      people,
      expenses,
      total: groups.length + people.length + expenses.length,
    });
  } catch (err) {
    console.error("globalSearch error:", err.message);
    res.status(500).json({ message: "Search failed. Please try again." });
  }
};
