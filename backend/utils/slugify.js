// Minimal slug generator - lowercase, spaces/punctuation to hyphens, no deps.
const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default slugify;
