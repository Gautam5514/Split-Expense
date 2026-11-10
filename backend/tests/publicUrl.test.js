// Links that leave the server (invites, QR codes, emails) must never point at
// a developer machine.
import { publicWebUrl, inviteLinks, DEFAULT_PUBLIC_WEB_URL } from "../utils/publicUrl.js";

test.each([
  [{ FRONTEND_URL: "http://localhost:3000,https://split.elitecrew.online" }, "https://split.elitecrew.online"],
  [{ FRONTEND_URL: "http://localhost:3000" }, DEFAULT_PUBLIC_WEB_URL],
  [{ FRONTEND_URL: "https://192.168.1.4:3000,https://10.0.0.2,https://split.elitecrew.online/" }, "https://split.elitecrew.online"],
  [{ FRONTEND_URL: "not a url, https://split.elitecrew.online" }, "https://split.elitecrew.online"],
  [{ APP_PUBLIC_URL: "https://staging.example.com/", FRONTEND_URL: "https://split.elitecrew.online" }, "https://staging.example.com"],
  [{}, DEFAULT_PUBLIC_WEB_URL],
])("publicWebUrl(%j) -> %s", (env, out) => expect(publicWebUrl(env)).toBe(out));

test("invite links: one https link per channel, plus the app scheme", () => {
  const l = inviteLinks("K7M2QX", { FRONTEND_URL: "http://localhost:3000,https://split.elitecrew.online" });
  expect(l.url).toBe("https://split.elitecrew.online/join/K7M2QX");
  expect(l.app).toBe(`${l.url}?via=app`);
  expect(l.web).toBe(`${l.url}?via=web`);
  expect(l.qr).toBe(`${l.url}?via=qr`);
  expect(l.scheme).toBe("splitapp://join/K7M2QX");
  for (const v of [l.url, l.app, l.web, l.qr, l.email]) expect(v).not.toMatch(/localhost|127\.0\.0\.1/);
});
