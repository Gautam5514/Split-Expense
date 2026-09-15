// Unit tests for the SSRF guards in utils/uploadSecurity.js.
//
// These are the two functions that stop a client from making our server
// fetch arbitrary URLs:
//   - isSafeUploadPayload: gates the 4 Cloudinary upload spots (only base64
//     data: URIs, never a raw http(s) URL Cloudinary would remote-fetch).
//   - isTrustedCloudinaryUrl: gates the OCR fileUrl (only our own
//     https://res.cloudinary.com assets, which Tesseract fetches server-side).
import { isSafeUploadPayload, isTrustedCloudinaryUrl } from "../utils/uploadSecurity.js";

describe("isSafeUploadPayload (upload SSRF guard)", () => {
  describe("accepts legitimate base64 data URIs", () => {
    const good = [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAoEB/2AAAAAASUVORK5CYII=",
      "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      "data:image/webp;base64,UklGR... ",
      "data:video/mp4;base64,AAAAIm 12=",
      "data:application/pdf;base64,JVBERi0=",
      "data:image/svg+xml;base64,PHN2Zz4=",   // subtype with '+'
    ];
    test.each(good)("accepts %s", (payload) => {
      expect(isSafeUploadPayload(payload)).toBe(true);
    });
  });

  describe("rejects SSRF vectors and malformed input", () => {
    const bad = [
      // The whole point of the fix: raw remote URLs Cloudinary would fetch.
      "http://169.254.169.254/latest/meta-data/",      // cloud metadata SSRF
      "https://res.cloudinary.com/demo/image.png",     // even our own CDN, not a data URI
      "http://localhost:5000/internal",
      "https://evil.example.com/x.png",
      "ftp://internal/file",
      "file:///etc/passwd",
      "//evil.com/x.png",
      // Not a data: URI at all.
      "data:text/plain,notbase64",                     // no ;base64,
      "data:;base64,abc",                              // missing mediatype
      "data:image/png;charset=utf-8,abc",              // not base64
      "notdata:image/png;base64,abc",
      "  data:image/png;base64,abc",                   // leading space -> regex is anchored
      // Non-string / empty inputs.
      "",
      null,
      undefined,
      123,
      {},
      [],
      { file: "data:image/png;base64,abc" },
    ];
    test.each(bad.map((v) => [String(v), v]))("rejects %s", (_label, payload) => {
      expect(isSafeUploadPayload(payload)).toBe(false);
    });
  });
});

describe("isTrustedCloudinaryUrl (OCR SSRF guard)", () => {
  describe("accepts only our own https Cloudinary assets", () => {
    const good = [
      "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
      "https://res.cloudinary.com/mycloud/image/upload/v123/x.png",
      "https://res.cloudinary.com/", // host matches, path irrelevant
    ];
    test.each(good)("accepts %s", (url) => {
      expect(isTrustedCloudinaryUrl(url)).toBe(true);
    });
  });

  describe("rejects everything else", () => {
    const bad = [
      // Wrong scheme, even on the right host.
      "http://res.cloudinary.com/demo/image.png",
      // SSRF classics.
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:5000/internal",
      "https://evil.com/x.png",
      // Host spoofing attempts against a naive substring check.
      "https://res.cloudinary.com.evil.com/x.png",     // suffix trick
      "https://evilres.cloudinary.com/x.png",          // prefix trick
      "https://res.cloudinary.com@evil.com/x.png",      // userinfo trick -> host is evil.com
      "https://attacker.com/res.cloudinary.com/x.png",  // path contains the string
      // Other schemes.
      "file:///etc/passwd",
      "ftp://res.cloudinary.com/x",
      // Junk / non-string.
      "not a url",
      "",
      null,
      undefined,
      42,
      {},
    ];
    test.each(bad.map((v) => [String(v), v]))("rejects %s", (_label, url) => {
      expect(isTrustedCloudinaryUrl(url)).toBe(false);
    });
  });
});
