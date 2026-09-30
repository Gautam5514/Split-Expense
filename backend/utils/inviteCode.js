import crypto from "crypto";

// Short, typeable group invite codes: 6 characters from a 31-character
// alphabet without look-alikes (no 0/O, 1/I/L) -> 31^6 ≈ 887 million codes. Guessing
// is further limited by the join rate limit, link expiry and optional
// creator approval.
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 6;

export const generateInviteCode = () => {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) code += INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)];
  return code;
};

const SHORT_RE = new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

export const isShortInviteCode = (code) => SHORT_RE.test(String(code || ""));

// "k7m 2qx" / "K7M-2QX" -> "K7M2QX". Anything else (old 32-char links) is
// returned unchanged so previously shared links keep resolving.
export const normalizeInviteCode = (input) => {
  const raw = String(input || "").trim();
  const compact = raw.replace(/[\s-]/g, "").toUpperCase();
  return isShortInviteCode(compact) ? compact : raw;
};
