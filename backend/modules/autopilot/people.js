import User from "../../models/userModel.js";
import { searchContacts, lookupUserByEmail } from "../../controllers/peopleController.js";
import { keyOf } from "./contracts.js";
export { keyOf };
import { isValidEmail, normalizeEmail } from "../../middleware/validate.js";
import { getContactIds } from "../../utils/contacts.js";

const EMAIL_IN_TEXT = /[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/;
export const emailIn = (text) => { const m = String(text).match(EMAIL_IN_TEXT); return m && isValidEmail(normalizeEmail(m[0])) ? normalizeEmail(m[0]) : null; };

// Same consent rule the manual "add members" screen applies: a known contact is
// added directly unless they require invites; everyone else gets an invite.
const modeFor = (isContact, user) => (isContact && user?.privacy?.addPolicy !== "invite" ? "add" : "invite");

const words = (name) => String(name || "").toLowerCase().split(/[\s._-]+/).filter(Boolean);

// Picks the best-matching tier so "Sagar" prefers a contact named exactly Sagar
// over "Sagar Verma", and never matches "Gaurav" for "Rav".
export function rankContacts(ref, contacts) {
  const key = keyOf(ref);
  const tiers = [
    contacts.filter(c => keyOf(c.name) === key),
    contacts.filter(c => words(c.name).includes(key)),
    contacts.filter(c => words(c.name).some(w => w.startsWith(key))),
  ];
  return tiers.find(t => t.length) || [];
}

/**
 * Resolves the people a request mentions into plain statuses. Names are only
 * ever matched against the actor's own contacts (existing privacy rule); anyone
 * else needs an exact email. Nothing here changes data.
 *   member | add | invite | email | ambiguous | unknown
 */
export async function resolvePeople(actorId, refs, { groupMembers = [], bindings = {} } = {}) {
  const out = {};
  const memberIds = new Map(groupMembers.map(m => [String(m._id), m]));
  for (const ref of [...new Set(refs.map(r => String(r).trim()).filter(Boolean))]) {
    const key = keyOf(ref);
    try {
      out[key] = await resolveOne(actorId, ref, memberIds, groupMembers, bindings[key]);
    } catch {
      out[key] = { status: "unknown" };
    }
  }
  return out;
}

async function byUserId(actorId, userId, memberIds) {
  const user = await User.findById(userId).select("name privacy blockedUsers").lean();
  if (!user || String(user._id) === String(actorId)) return { status: "unknown" };
  if (memberIds.has(String(user._id))) return { status: "member", userId: String(user._id), name: user.name };
  const isContact = (await getContactIds(actorId)).has(String(user._id));
  return { status: modeFor(isContact, user), userId: String(user._id), name: user.name };
}

async function resolveOne(actorId, ref, memberIds, groupMembers, binding) {
  if (binding?.userId) return byUserId(actorId, binding.userId, memberIds);
  const email = binding?.email || emailIn(ref);
  if (email) {
    const found = await lookupUserByEmail(actorId, email);
    if (!found) return { status: "email", email }; // unregistered or private: the invite flow handles both identically
    return byUserId(actorId, found._id, memberIds);
  }
  const inGroup = rankContacts(ref, groupMembers.filter(m => m.name));
  if (inGroup.length === 1) return { status: "member", userId: String(inGroup[0]._id), name: inGroup[0].name };
  const contacts = await searchContacts(actorId, { q: ref, limit: 10 });
  const best = rankContacts(ref, contacts);
  if (best.length === 1) return byUserId(actorId, best[0]._id, memberIds);
  if (best.length > 1) return { status: "ambiguous", candidates: best.slice(0, 5).map(c => ({ userId: String(c._id), name: c.name, email: c.email })) };
  return { status: "unknown" };
}
