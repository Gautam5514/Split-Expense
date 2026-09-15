/**
 * Cloudinary's upload API treats any string starting with "http://"/"https://" as a
 * remote-fetch source (it fetches the URL server-side), so accepting an arbitrary
 * client-supplied `file` value lets an attacker make our infrastructure fetch
 * internal/arbitrary URLs (SSRF). Only base64 data URIs are legitimate here.
 */
export const isSafeUploadPayload = (file) =>
  typeof file === "string" && /^data:[\w.+-]+\/[\w.+-]+;base64,/.test(file);

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
