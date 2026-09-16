// Tests for the remaining three hardening fixes:
//   #3 CORS allow-list (utils/corsConfig.js, wired into index.js)
//   #4 invite-code entropy (crypto.randomBytes(16) in groupController)
//   #5 Socket.IO relay guard (utils/socketGuards.js, wired into index.js)
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildAllowedOrigins, makeCorsOriginCallback } from "../utils/corsConfig.js";
import { canRelayToRoom } from "../utils/socketGuards.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// FIX #3 — CORS explicit allow-list (no reflect-any-origin)
// ---------------------------------------------------------------------------
describe("CORS allow-list", () => {
  describe("buildAllowedOrigins", () => {
    const ALWAYS_ALLOWED = [
      "http://localhost:3000",
      "https://split.elitecrew.online",
      "https://split-expense-vert.vercel.app",
    ];

    test("falls back to the known production origins when FRONTEND_URL is unset", () => {
      expect(buildAllowedOrigins(undefined)).toEqual(ALWAYS_ALLOWED);
      expect(buildAllowedOrigins("")).toEqual(ALWAYS_ALLOWED);
    });

    test("splits comma-separated origins, trims whitespace, and keeps the known production origins", () => {
      expect(buildAllowedOrigins("https://a.com, https://b.com ,https://c.com"))
        .toEqual([...ALWAYS_ALLOWED, "https://a.com", "https://b.com", "https://c.com"]);
    });

    test("drops empty entries from trailing/double commas", () => {
      expect(buildAllowedOrigins("https://a.com,,")).toEqual([...ALWAYS_ALLOWED, "https://a.com"]);
    });

    test("never duplicates a known production origin already present in FRONTEND_URL", () => {
      expect(buildAllowedOrigins("https://split.elitecrew.online")).toEqual(ALWAYS_ALLOWED);
    });
  });

  describe("makeCorsOriginCallback", () => {
    const allowed = ["https://app.split.com", "http://localhost:3000"];
    const cb = makeCorsOriginCallback(allowed);

    const call = (origin) =>
      new Promise((resolve) => cb(origin, (err, ok) => resolve({ err, ok })));

    test("allows an origin that is on the list", async () => {
      const { err, ok } = await call("https://app.split.com");
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    test("allows requests with no Origin header (curl / server-to-server)", async () => {
      const { err, ok } = await call(undefined);
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    test("REJECTS an arbitrary origin (no reflect-any-origin)", async () => {
      const { err } = await call("https://evil.com");
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/not allowed by cors/i);
    });

    test("rejects look-alike / substring origins", async () => {
      for (const bad of [
        "https://app.split.com.evil.com",
        "https://evilapp.split.com",
        "http://app.split.com",          // wrong scheme
        "https://app.split.com:8443",    // wrong port
      ]) {
        const { err } = await call(bad);
        expect(err).toBeInstanceOf(Error);
      }
    });
  });

  test("index.js uses the allow-list helpers and no longer reflects origin", () => {
    const src = fs.readFileSync(path.join(backendRoot, "index.js"), "utf8");
    expect(src).toMatch(/makeCorsOriginCallback\(allowedOrigins\)/);
    // The old vulnerable pattern (reflecting the request Origin back) must be gone.
    expect(src).not.toMatch(/callback\(null,\s*origin\)/);
    expect(src).not.toMatch(/origin:\s*true/);
  });
});

// ---------------------------------------------------------------------------
// FIX #4 — invite-code entropy: 128-bit (16 random bytes -> 32 hex chars)
// ---------------------------------------------------------------------------
describe("invite-code entropy", () => {
  test("crypto.randomBytes(16).toString('hex') yields a 32-char 128-bit code", () => {
    const code = crypto.randomBytes(16).toString("hex");
    expect(code).toHaveLength(32);
    expect(code).toMatch(/^[0-9a-f]{32}$/);
  });

  test("generated codes are unique across many draws (sanity on randomness)", () => {
    const seen = new Set();
    for (let i = 0; i < 10000; i++) seen.add(crypto.randomBytes(16).toString("hex"));
    expect(seen.size).toBe(10000);
  });

  test("groupController generates invite codes with randomBytes(16), not the old 4 bytes", () => {
    const src = fs.readFileSync(path.join(backendRoot, "controllers", "groupController.js"), "utf8");
    const matches = src.match(/inviteCode\s*=\s*crypto\.randomBytes\((\d+)\)/g) || [];
    // Both generation spots must be present and both must use 16 bytes.
    expect(matches.length).toBe(2);
    for (const m of matches) {
      expect(m).toMatch(/randomBytes\(16\)/);
      expect(m).not.toMatch(/randomBytes\(4\)/);
    }
  });
});

// ---------------------------------------------------------------------------
// FIX #5 — Socket.IO relay guard (anti-spoofing)
// ---------------------------------------------------------------------------
describe("Socket.IO canRelayToRoom (anti-spoofing)", () => {
  const socketIn = (userId, ...rooms) => ({ userId, rooms: new Set(rooms) });

  test("allows relay when authed AND a member of the target room", () => {
    const s = socketIn("user1", "convo123");
    expect(canRelayToRoom(s, "convo123")).toBe(true);
  });

  test("allows relay into a group room the socket has joined", () => {
    const s = socketIn("user1", "group:g1");
    expect(canRelayToRoom(s, "group:g1")).toBe(true);
  });

  test("BLOCKS an unauthenticated socket (no register / no verified token)", () => {
    const s = { rooms: new Set(["convo123"]) }; // never set userId
    expect(canRelayToRoom(s, "convo123")).toBe(false);
  });

  test("BLOCKS relay into a room the socket never joined (spoof attempt)", () => {
    const s = socketIn("user1", "convo123");
    // Attacker is authed but tries to blast into someone else's conversation.
    expect(canRelayToRoom(s, "someoneElsesConvo")).toBe(false);
  });

  test("BLOCKS a socket that joined a group but spoofs a different group", () => {
    const s = socketIn("user1", "group:g1");
    expect(canRelayToRoom(s, "group:g2")).toBe(false);
  });

  test("rejects missing / falsy room names", () => {
    const s = socketIn("user1", "convo123");
    expect(canRelayToRoom(s, undefined)).toBe(false);
    expect(canRelayToRoom(s, null)).toBe(false);
    expect(canRelayToRoom(s, "")).toBe(false);
  });

  test("rejects a malformed socket (no rooms set)", () => {
    expect(canRelayToRoom({ userId: "user1" }, "convo123")).toBe(false);
    expect(canRelayToRoom(null, "convo123")).toBe(false);
    expect(canRelayToRoom(undefined, "convo123")).toBe(false);
  });

  test("index.js wires the guard into typing, sendMessage and groupTyping", () => {
    const src = fs.readFileSync(path.join(backendRoot, "index.js"), "utf8");
    // All three relay handlers must gate on canRelayToRoom.
    const guardCount = (src.match(/canRelayToRoom\(/g) || []).length;
    expect(guardCount).toBeGreaterThanOrEqual(3);
    expect(src).toMatch(/socket\.on\("typing"[\s\S]*?canRelayToRoom/);
    expect(src).toMatch(/socket\.on\("sendMessage"[\s\S]*?canRelayToRoom/);
    expect(src).toMatch(/socket\.on\("groupTyping"[\s\S]*?canRelayToRoom/);
  });
});
