import { normalizeInviteCode } from "@/lib/inviteCode";

// An invite the visitor opened before signing in. Remembered so login/register
// can bring them straight back to it - but only for a day, so an old invite
// can't silently pull someone into a group weeks later.
const KEY = "pendingInvite";
const TTL_MS = 24 * 60 * 60 * 1000;

export function savePendingInvite(code) {
  const c = normalizeInviteCode(code);
  if (!c) return;
  try { localStorage.setItem(KEY, JSON.stringify({ code: c, at: Date.now() })); } catch { /* storage blocked */ }
}

export function clearPendingInvite() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Returns the remembered invite code (and forgets it), or null. */
export function takePendingInvite() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  clearPendingInvite();
  if (!raw) return null;
  try {
    const { code, at } = JSON.parse(raw);
    if (!code || !at || Date.now() - at > TTL_MS) return null;
    return normalizeInviteCode(code) || null;
  } catch {
    return normalizeInviteCode(raw) || null; // older plain-string format
  }
}

/** Where to go after signing in: back to the invite (on the web), else `fallback`. */
export function afterAuthPath(fallback = "/users") {
  const code = takePendingInvite();
  return code ? `/join/${encodeURIComponent(code)}?web=1` : fallback;
}
