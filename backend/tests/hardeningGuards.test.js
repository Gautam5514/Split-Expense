// Tests for the remaining hardening fixes:
//   #4 invite-code entropy (crypto.randomBytes(16) in groupController)
//   #5 Socket.IO relay guard (utils/socketGuards.js, wired into index.js)
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildAllowedOrigins, makeCorsOriginCallback } from "../utils/corsConfig.js";
import { canRelayToRoom } from "../utils/socketGuards.js";
import { generateInviteCode, isShortInviteCode, normalizeInviteCode } from "../utils/inviteCode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CORS — allow-all (restored 2026-09-16 after the allow-list variant caused a
// production outage: a stale FRONTEND_URL on the deploy server CORS-blocked
// every real user out of their own data). This app authenticates via a
// Firebase bearer token, not cookies, so reflecting the origin back is safe.
// ---------------------------------------------------------------------------
describe("CORS (allow-all)", () => {
  test("buildAllowedOrigins still parses FRONTEND_URL for logging purposes", () => {
    expect(buildAllowedOrigins(undefined)).toEqual(["http://localhost:3000"]);
    expect(buildAllowedOrigins("https://a.com, https://b.com"))
      .toEqual(["https://a.com", "https://b.com"]);
  });

  describe("makeCorsOriginCallback", () => {
    const cb = makeCorsOriginCallback();
    const call = (origin) =>
      new Promise((resolve) => cb(origin, (err, ok) => resolve({ err, ok })));

    test("allows requests with no Origin header (curl / server-to-server)", async () => {
      const { err, ok } = await call(undefined);
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    test("allows any origin", async () => {
      for (const origin of ["https://split.elitecrew.online", "https://anything-else.example.com"]) {
        const { err, ok } = await call(origin);
        expect(err).toBeNull();
        expect(ok).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// FIX #4 — invite codes: short (6 chars) but from a crypto RNG
// ---------------------------------------------------------------------------
describe("invite codes", () => {
  test("6 characters from the look-alike-free alphabet", () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(6);
      expect(isShortInviteCode(code)).toBe(true);
      expect(code).not.toMatch(/[01ILO]/);
    }
  });

  test("codes are well spread (no collisions in 10k draws)", () => {
    const seen = new Set();
    for (let i = 0; i < 10000; i++) seen.add(generateInviteCode());
    expect(seen.size).toBeGreaterThan(9990);
  });

  test("uses crypto.randomInt, never Math.random", () => {
    const src = fs.readFileSync(path.join(backendRoot, "utils", "inviteCode.js"), "utf8");
    expect(src).toMatch(/crypto\.randomInt/);
    expect(src).not.toMatch(/Math\.random/);
    const ctrl = fs.readFileSync(path.join(backendRoot, "controllers", "groupController.js"), "utf8");
    expect(ctrl).toMatch(/inviteCode = await uniqueInviteCode\(\)/);
  });

  test("typed codes are normalised; old long codes pass through", () => {
    expect(normalizeInviteCode(" k7m-2qx ")).toBe("K7M2QX");
    expect(normalizeInviteCode("k7m 2qx")).toBe("K7M2QX");
    const legacy = "7f39dc25c3109b3bc1446ae89ba181e1";
    expect(normalizeInviteCode(legacy)).toBe(legacy);
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
