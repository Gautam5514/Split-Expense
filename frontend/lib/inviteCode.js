// Group invite codes: 6 characters from an alphabet without look-alikes
// (no 0/O, 1/I/L). Mirrors backend/utils/inviteCode.js.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SHORT_RE = new RegExp(`^[${ALPHABET}]{6}$`);

export const ANDROID_PACKAGE = "com.kunal.splitapp";

// People paste the code, the code with spaces, or the whole shared message.
// Pull the code out of any of those; old long codes pass through unchanged.
export function normalizeInviteCode(input) {
  const raw = String(input || "").trim();
  const fromLink = /\/join\/([A-Za-z0-9_-]{4,64})/.exec(raw) || /[?&](?:code|invite|join_code)=([A-Za-z0-9_-]{4,64})/.exec(raw);
  const candidate = fromLink ? fromLink[1] : raw;
  const compact = candidate.replace(/[\s-]/g, "").toUpperCase();
  if (SHORT_RE.test(compact)) return compact;
  return /^[A-Za-z0-9_-]{8,64}$/.test(candidate) ? candidate : "";
}

export const isShortInviteCode = (code) => SHORT_RE.test(String(code || ""));

// The link to share from the website, and the one to put in a QR code. Newer
// API responses carry ready-made `links`; older ones only `joinLink`.
const withVia = (url, via) => {
  if (!url) return "";
  try { const u = new URL(url); u.searchParams.set("via", via); return u.toString(); } catch { return url; }
};
export const webShareLink = (invite) => invite?.links?.web || withVia(invite?.joinLink, "web");
export const qrLink = (invite) => invite?.links?.qr || withVia(invite?.joinLink, "qr");
