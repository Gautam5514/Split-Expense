import { api } from "@/lib/api";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends PeoplePicker selections to the group. Contacts may be added directly;
// everyone else gets an invite they must accept (decided by the server).
export async function addPeopleToGroup(groupId, selected) {
  const userIds = selected.filter((s) => s.kind === "user").map((s) => String(s.userId));
  const emails = selected.filter((s) => s.kind === "email").map((s) => s.email);
  const res = await api.post(`/groups/${groupId}/members`, { userIds, emails });
  return res.data;
}

// "2 added · 1 invite sent (they need to accept) · 1 joining email sent"
export function describeAddResult({ added = 0, pending = 0, invited = 0 } = {}) {
  const parts = [];
  if (added) parts.push(`${added} added`);
  if (pending) parts.push(`${pending} invite${pending > 1 ? "s" : ""} sent - they need to accept`);
  if (invited) parts.push(`${invited} joining email${invited > 1 ? "s" : ""} sent`);
  return parts.join(" · ") || "No one new to add";
}
