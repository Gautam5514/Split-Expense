// Shared validation helpers used across controllers

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

// Returns an error string or null if valid
export const validatePassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter (A-Z).";
  if (!/[0-9]/.test(password))
    return "Password must include at least one number (0-9).";
  return null;
};

export const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

// Escapes special regex characters in user search inputs to prevent ReDoS and regex crashes
export const escapeRegExp = (string) =>
  String(string || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Returns a trimmed, lower-cased email only when the input is a real string.
// Arrays/objects (e.g. `email[]=a@b.co`) are rejected rather than coerced, so
// they can never reach a Mongo filter as a non-string value.
export const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

// HTML-escape any user-controlled value before interpolating it into an email
// template. Without this, a group name or display name like
// `<a href="https://evil">Claim refund</a>` is rendered as live HTML in an
// email we send from our own domain - a phishing vector.
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

// Only absolute http(s) URLs. Blocks `javascript:`, `data:`, `vbscript:` etc.
// which would execute when rendered as an <a href>.
export const isHttpUrl = (value) => {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Optional string field: undefined/null -> "", non-strings rejected (null
// return), otherwise trimmed and checked against max length.
// Returns { ok: true, value } or { ok: false }.
export const optionalString = (value, max) => {
  if (value === undefined || value === null) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false };
  return { ok: true, value: trimmed };
};
