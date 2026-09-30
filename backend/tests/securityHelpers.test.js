// Pure-helper and model-level tests for the security hardening pass.
// No mocks here, so the REAL User schema (and its toJSON transform) is used.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jest } from "@jest/globals";
import User from "../models/userModel.js";
import {
  escapeHtml,
  isHttpUrl,
  normalizeEmail,
  optionalString,
} from "../middleware/validate.js";
import {
  isAllowedUpload,
  uploadRejectionReason,
  IMAGE_MIME_TYPES,
  CHAT_MIME_TYPES,
  RECEIPT_MIME_TYPES,
} from "../utils/uploadSecurity.js";
import { sanitizeServerErrors, GENERIC_SERVER_ERROR } from "../middleware/errorSanitizer.js";

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("User model never serializes secrets", () => {
  const doc = new User({
    name: "Alice",
    email: "alice@example.com",
    password: "$2a$10$hash",
    resetPasswordToken: "reset-hash",
    resetPasswordExpires: new Date(),
    loginOtp: "otp-hash",
    loginOtpExpires: new Date(),
    loginOtpAttempts: 2,
    skipLoginOtp: true,
    loginOtpBypassExpires: new Date(),
    webPushTokens: ["fcm"],
    expoPushTokens: [{ token: "ExponentPushToken[x]", platform: "ios" }],
  });

  test.each(["toJSON", "toObject"])("%s strips credential + device fields", (method) => {
    const out = doc[method]();
    for (const f of [
      "password", "resetPasswordToken", "resetPasswordExpires", "loginOtp",
      "loginOtpExpires", "loginOtpAttempts", "skipLoginOtp",
      "loginOtpBypassExpires", "webPushTokens", "expoPushTokens",
    ]) {
      expect(out).not.toHaveProperty(f);
    }
    expect(out).toMatchObject({ name: "Alice", email: "alice@example.com" });
  });

  test("JSON.stringify (what res.json does) also omits the password hash", () => {
    expect(JSON.stringify({ user: doc })).not.toContain("$2a$10$hash");
  });

  test("the raw document still exposes the hash for bcrypt.compare", () => {
    expect(doc.password).toBe("$2a$10$hash");
  });
});

describe("escapeHtml", () => {
  test("neutralizes tags, attributes and quotes", () => {
    expect(escapeHtml(`<a href="https://evil">x</a>'`)).toBe(
      "&lt;a href=&quot;https://evil&quot;&gt;x&lt;/a&gt;&#39;"
    );
  });
  test("handles null/undefined/numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(5)).toBe("5");
  });
});

describe("isHttpUrl", () => {
  test.each([
    "https://linkedin.com/in/me",
    "http://example.com/cv.pdf",
  ])("accepts %s", (u) => expect(isHttpUrl(u)).toBe(true));

  test.each([
    "javascript:alert(document.cookie)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://x.com",
    "not a url",
    "",
    null,
    { href: "https://x" },
    `https://x.com/${"a".repeat(3000)}`,
  ])("rejects %p", (u) => expect(isHttpUrl(u)).toBe(false));
});

describe("normalizeEmail", () => {
  test("trims + lower-cases strings", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });
  test("rejects non-strings (operator/array injection) instead of coercing", () => {
    expect(normalizeEmail({ $ne: null })).toBe("");
    expect(normalizeEmail(["a@b.co"])).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("optionalString", () => {
  test("missing -> empty string", () => {
    expect(optionalString(undefined, 5)).toEqual({ ok: true, value: "" });
  });
  test("too long / non-string rejected", () => {
    expect(optionalString("abcdef", 5).ok).toBe(false);
    expect(optionalString({ a: 1 }, 5).ok).toBe(false);
  });
  test("trims", () => {
    expect(optionalString("  hi ", 5)).toEqual({ ok: true, value: "hi" });
  });
});

describe("upload MIME allow-lists", () => {
  const uri = (mime) => `data:${mime};base64,AAAA`;

  test("SVG and HTML are never accepted in any context", () => {
    for (const list of [IMAGE_MIME_TYPES, CHAT_MIME_TYPES, RECEIPT_MIME_TYPES]) {
      expect(isAllowedUpload(uri("image/svg+xml"), list)).toBe(false);
      expect(isAllowedUpload(uri("text/html"), list)).toBe(false);
      expect(isAllowedUpload(uri("application/javascript"), list)).toBe(false);
    }
  });

  test("profile/group images accept only images", () => {
    expect(isAllowedUpload(uri("image/png"), IMAGE_MIME_TYPES)).toBe(true);
    expect(isAllowedUpload(uri("application/pdf"), IMAGE_MIME_TYPES)).toBe(false);
    expect(isAllowedUpload(uri("video/mp4"), IMAGE_MIME_TYPES)).toBe(false);
  });

  test("chat accepts voice notes (audio/webm) and video", () => {
    expect(isAllowedUpload(uri("audio/webm"), CHAT_MIME_TYPES)).toBe(true);
    expect(isAllowedUpload(uri("video/mp4"), CHAT_MIME_TYPES)).toBe(true);
  });

  test("mobile/browser untyped payloads (octet-stream) are accepted everywhere", () => {
    for (const list of [IMAGE_MIME_TYPES, CHAT_MIME_TYPES, RECEIPT_MIME_TYPES]) {
      expect(isAllowedUpload(uri("application/octet-stream"), list)).toBe(true);
    }
  });

  test.each(["image/jpeg", "image/heic", "image/avif", "video/quicktime", "video/3gpp", "audio/m4a", "audio/aac", "audio/webm"])(
    "chat accepts real-device type %s", (mime) => {
      expect(isAllowedUpload(uri(mime), CHAT_MIME_TYPES)).toBe(true);
    }
  );

  test("MIME match is case-insensitive", () => {
    expect(isAllowedUpload(uri("IMAGE/PNG"), IMAGE_MIME_TYPES)).toBe(true);
  });

  test("uploadRejectionReason distinguishes SSRF payloads from bad types", () => {
    expect(uploadRejectionReason("https://169.254.169.254/", IMAGE_MIME_TYPES)).toBe("Invalid file payload");
    expect(uploadRejectionReason(uri("image/svg+xml"), IMAGE_MIME_TYPES)).toBe("Unsupported file type");
    expect(uploadRejectionReason(uri("image/png"), IMAGE_MIME_TYPES)).toBeNull();
  });
});

describe("sanitizeServerErrors middleware", () => {
  const run = (status, body) => {
    const sent = [];
    const res = {
      statusCode: status,
      json: (b) => { sent.push(b); return res; },
    };
    const next = jest.fn();
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    sanitizeServerErrors({ method: "GET", originalUrl: "/x" }, res, next);
    res.json(body);
    spy.mockRestore();
    expect(next).toHaveBeenCalled();
    return sent[0];
  };

  test("replaces internal 5xx messages with a generic one", () => {
    const out = run(500, { message: 'E11000 duplicate key error collection: users index: email_1' });
    expect(out).toEqual({ message: GENERIC_SERVER_ERROR });
  });

  test("drops extra leaky fields (e.g. `error: err.message`)", () => {
    const out = run(500, { message: "Upload failed", error: "cloudinary api_secret mismatch" });
    expect(JSON.stringify(out)).not.toContain("api_secret");
  });

  test("keeps a string `code` so clients can still branch", () => {
    expect(run(503, { code: "X", message: "internal" })).toEqual({ code: "X", message: GENERIC_SERVER_ERROR });
  });

  test("honors explicit expose:true for friendly messages", () => {
    expect(run(503, { message: "Email service unavailable", expose: true })).toEqual({ message: "Email service unavailable" });
  });

  test("leaves 4xx validation messages untouched", () => {
    expect(run(400, { field: "email", message: "Please enter a valid email address." }))
      .toEqual({ field: "email", message: "Please enter a valid email address." });
  });

  test("leaves JSON-RPC envelopes alone", () => {
    const body = { jsonrpc: "2.0", error: { code: -32603, message: "Internal MCP server error." }, id: 1 };
    expect(run(500, body)).toBe(body);
  });
});

describe("index.js socket + app hardening (source wiring)", () => {
  const src = fs.readFileSync(path.join(backendRoot, "index.js"), "utf8");

  test("typing/groupTyping broadcast the authenticated socket.userId, not the payload's", () => {
    expect(src).toMatch(/emit\("typing", socket\.userId\)/);
    expect(src).toMatch(/emit\("groupTyping", socket\.userId\)/);
  });

  test("sendMessage no longer re-broadcasts the client-supplied object", () => {
    const handler = src.slice(src.indexOf('socket.on("sendMessage"'), src.indexOf('socket.on("sendMessage"') + 400);
    expect(handler).not.toMatch(/emit\("newMessage"/);
  });

  test("error sanitizer is mounted and x-powered-by disabled", () => {
    expect(src).toMatch(/app\.use\(sanitizeServerErrors\)/);
    expect(src).toMatch(/app\.disable\("x-powered-by"\)/);
  });
});
