/**
 * Turns what a person says in a chat ("Goa trip", "Rahul", "me",
 * "rahul@x.com") into the exact group / member the tools act on.
 *
 * Every lookup is scoped to the authenticated user's own groups, so a name can
 * never reach a group they are not in. Anything ambiguous is returned as a
 * question with the candidates, never guessed.
 */
import Group from "../../models/groupModel.js";

export const isObjectIdString = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const idOf = (m) => String(m?._id ?? m);

const SELF = new Set(["me", "i", "myself", "self", "mine", "my self"]);

/** A group the user belongs to, by id or (fuzzy) name. */
export async function resolveGroup(ref, uid) {
  const raw = String(ref ?? "").trim();
  if (!raw) return { error: "Which group? Give its name or id (list_groups shows them)." };

  if (isObjectIdString(raw)) {
    const group = await Group.findById(raw).populate("members", "name email").lean();
    if (!group || !(group.members || []).some((m) => idOf(m) === String(uid))) {
      return { error: "Group not found, or you are not a member." };
    }
    return { group };
  }

  const groups = await Group.find({ members: uid }).populate("members", "name email").lean();
  const q = norm(raw);
  let hits = groups.filter((g) => norm(g.name) === q);
  if (!hits.length) hits = groups.filter((g) => norm(g.name).includes(q));
  if (!hits.length) hits = groups.filter((g) => norm(g.name).length >= 3 && q.includes(norm(g.name)));
  // Prefer the live group over an old completed one with a similar name.
  if (hits.length > 1) {
    const active = hits.filter((g) => !g.isCompleted);
    if (active.length === 1) hits = active;
  }

  if (hits.length === 1) return { group: hits[0] };
  if (!hits.length) {
    const names = groups.map((g) => `"${g.name}"`).join(", ");
    return { error: `You have no group called "${raw}". ${names ? `Your groups: ${names}.` : "You have no groups yet - create_group makes one."}` };
  }
  return {
    error: `"${raw}" matches more than one group: ${hits.map((g) => `"${g.name}" (id ${g._id})`).join(", ")}. Ask which one, then pass its id.`,
  };
}

const describe = (m) => (m.email ? `${m.name} <${m.email}>` : m.name);

/** One member of `group`, by "me", id, email or (fuzzy) name. */
export function resolveMember(group, ref, uid) {
  const members = (group.members || []).map((m) => ({ id: idOf(m), name: m.name || "Member", email: m.email || null }));
  const raw = String(ref ?? "").trim();
  if (!raw) return { error: "Which member? Give a name, email or \"me\"." };
  const q = norm(raw);

  const pick = (list) => {
    if (list.length === 1) return { member: list[0] };
    if (list.length > 1) {
      return { error: `"${raw}" matches more than one member of "${group.name}": ${list.map(describe).join(", ")}. Ask which one, then pass their email.` };
    }
    return null;
  };

  if (SELF.has(q)) {
    const me = members.find((m) => m.id === String(uid));
    if (me) return { member: me };
  }
  if (isObjectIdString(raw)) {
    const hit = pick(members.filter((m) => m.id === raw));
    if (hit) return hit;
  }
  if (raw.includes("@")) {
    const hit = pick(members.filter((m) => norm(m.email) === q));
    if (hit) return hit;
  }
  const first = (name) => norm(name).split(" ")[0];
  const attempt =
    pick(members.filter((m) => norm(m.name) === q)) ||
    pick(members.filter((m) => first(m.name) === q)) ||
    pick(members.filter((m) => norm(m.name).startsWith(q) || norm(m.email).startsWith(q)));
  if (attempt) return attempt;

  return { error: `No member "${raw}" in "${group.name}". Members: ${members.map(describe).join(", ")}.` };
}

/** Several members at once; stops at the first one that can't be resolved. */
export function resolveMembers(group, refs, uid) {
  const out = [];
  for (const ref of refs || []) {
    const r = resolveMember(group, ref, uid);
    if (r.error) return { error: r.error };
    if (!out.some((m) => m.id === r.member.id)) out.push(r.member);
  }
  return { members: out };
}

export const memberName = (group, id) =>
  (group.members || []).find((m) => idOf(m) === String(id))?.name || "Former member";
