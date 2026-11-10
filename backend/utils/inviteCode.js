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

// People paste all sorts of things into a "join with code" box: the code,
// the code with spaces, or the whole shared message/link. Pull the code out
// of a link like https://split.elitecrew.online/join/K7M2QX, splitapp://join/K7M2QX
// or ...?code=K7M2QX; anything else is treated as the code itself.
export const extractInviteCode = (input) => {
  const raw = String(input || "").trim();
  const fromPath = /\/join\/([A-Za-z0-9_-]{4,64})/.exec(raw) || /[?&](?:code|invite|join_code)=([A-Za-z0-9_-]{4,64})/.exec(raw);
  return fromPath ? fromPath[1] : raw;
};

// "k7m 2qx" / "K7M-2QX" / a pasted join link -> "K7M2QX". Anything else (old
// 32-char links) is returned unchanged so previously shared links keep resolving.
export const normalizeInviteCode = (input) => {
  const raw = extractInviteCode(input);
  const compact = raw.replace(/[\s-]/g, "").toUpperCase();
  return isShortInviteCode(compact) ? compact : raw;
};
