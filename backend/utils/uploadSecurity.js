/**
 * Cloudinary's upload API treats any string starting with "http://"/"https://" as a
 * remote-fetch source (it fetches the URL server-side), so accepting an arbitrary
 * client-supplied `file` value lets an attacker make our infrastructure fetch
 * internal/arbitrary URLs (SSRF). Only base64 data URIs are legitimate here.
 */
export const isSafeUploadPayload = (file) =>
  typeof file === "string" && /^data:[\w.+-]+\/[\w.+-]+;base64,/.test(file);

// MIME rules per upload context. SVG is blocked everywhere: it can carry
// <script>, and Cloudinary serves it back as image/svg+xml. HTML, JS and other
// document/executable types are likewise never accepted.
//
// `application/octet-stream` IS accepted: React Native's FileReader (mobile
// app chat attachments) and desktop browsers reading HEIC/unknown files emit
// it when the platform can't name the type. Rejecting it would break real
// uploads. It's safe because every upload is re-typed by Cloudinary, and the
// image-only contexts pin resource_type "image" (non-images are refused).
const BLOCKED_MIME_TYPES = new Set(["image/svg+xml", "image/svg"]);
const OCTET = "application/octet-stream";

const mimeRule = ({ prefixes = [], exact = [] }) => (mime) =>
  !BLOCKED_MIME_TYPES.has(mime) &&
  (exact.includes(mime) || prefixes.some((p) => mime.startsWith(p)));

export const IMAGE_MIME_TYPES = mimeRule({ prefixes: ["image/"], exact: [OCTET] });
export const RECEIPT_MIME_TYPES = mimeRule({ prefixes: ["image/"], exact: ["application/pdf", OCTET] });
export const CHAT_MIME_TYPES = mimeRule({
  prefixes: ["image/", "video/", "audio/"],
  exact: ["application/pdf", OCTET],
});

/** Extract the declared MIME type from a data URI ("data:image/png;base64,..." -> "image/png"). */
export const dataUriMimeType = (file) => {
  if (!isSafeUploadPayload(file)) return null;
  return file.slice(5, file.indexOf(";")).toLowerCase();
};

export const isOctetStream = (file) => dataUriMimeType(file) === OCTET;

/**
 * Validates a base64 data URI upload: correct shape AND an allowed MIME type.
 * `allowed` is one of the rule functions above (or an array of exact types).
 */
export const isAllowedUpload = (file, allowed) => {
  const mime = dataUriMimeType(file);
  if (!mime) return false;
  return typeof allowed === "function" ? allowed(mime) : allowed.includes(mime);
};

/**
 * Returns null when the upload is acceptable, otherwise a client-facing
 * reason: malformed/remote payloads (the SSRF case) vs. a well-formed data
 * URI of a type this context doesn't accept.
 */
export const uploadRejectionReason = (file, allowedTypes) => {
  if (!isSafeUploadPayload(file)) return "Invalid file payload";
  if (!isAllowedUpload(file, allowedTypes)) return "Unsupported file type";
  return null;
};

/**
 * Cloudinary folders a client may target through the generic /api/upload
 * endpoint. Anything else falls back to the default, so clients can't scatter
 * uploads into arbitrary (or other features') folders.
 */
export const USER_UPLOAD_FOLDERS = ["splitwise_uploads", "splitwise_receipts"];
export const ADMIN_UPLOAD_FOLDERS = ["splitease_blog", "splitwise_uploads"];

/**
 * Only allow OCR to run against our own Cloudinary-hosted assets, not an
 * arbitrary attacker-supplied URL (which the OCR engine would fetch server-side).
 */
export const isTrustedCloudinaryUrl = (url) => {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
};
