// The app talks to Firebase through a small `admin` object. Every service a
// call site uses has to exist on it, or that feature fails at runtime only
// (browser push did: "admin.messaging is not a function").
import { jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

jest.unstable_mockModule("firebase-admin/app", () => ({ cert: (x) => x, getApps: () => [{}], initializeApp: jest.fn() }));
jest.unstable_mockModule("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: jest.fn() }) }));
jest.unstable_mockModule("firebase-admin/messaging", () => ({ getMessaging: () => ({ sendEachForMulticast: jest.fn(), sendEach: jest.fn() }) }));
const admin = (await import("../config/firebaseAdmin.js")).default;

test("exposes messaging with the send methods the push code calls", () => {
  expect(typeof admin.messaging).toBe("function");
  expect(typeof admin.messaging().sendEachForMulticast).toBe("function");
  expect(typeof admin.messaging().sendEach).toBe("function");
  expect(typeof admin.auth().verifyIdToken).toBe("function");
});

test("every admin.<service>() used anywhere in the backend exists on the object", () => {
  const used = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "coverage", "tests"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js") && /from ["'][./]+\/?(?:config\/)?firebaseAdmin\.js["']/.test(fs.readFileSync(full, "utf8"))) {
        for (const m of fs.readFileSync(full, "utf8").matchAll(/\badmin\.([a-zA-Z]+)\(/g)) used.add(m[1]);
      }
    }
  };
  walk(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  expect(used.size).toBeGreaterThan(0);
  for (const name of used) expect(typeof admin[name]).toBe("function");
});
