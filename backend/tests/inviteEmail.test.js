// The invitation email sent to people without a SplitEase account.
import { buildInviteEmail } from "../services/inviteEmail.js";

const base = { inviterName: "Gautam", groupName: "Goa Trip", joinLink: "https://splitease.app/join/AB12CD", email: "friend@mail.com" };

test("brand email: no emoji, inline icons attached, join link in both parts", () => {
  const m = buildInviteEmail({ ...base, expiresAt: new Date("2026-11-17") });
  expect(m.subject).toBe("Gautam invited you to join Goa Trip on SplitEase");
  expect(/\p{Extended_Pictographic}/u.test(m.subject + m.html + m.text)).toBe(false);
  expect(m.html).toContain('href="https://splitease.app/join/AB12CD"');
  expect(m.text).toContain("https://splitease.app/join/AB12CD");
  expect(m.html).toContain("works until 17 Nov 2026");
  const cids = m.attachments.map((a) => a.cid);
  expect(cids).toEqual(expect.arrayContaining(["se-logo", "se-feature-receipt", "se-feature-chat"]));
  for (const cid of cids) expect(m.html).toContain(`cid:${cid}`);
});

test("user-controlled values can't inject HTML or headers", () => {
  const m = buildInviteEmail({
    ...base,
    inviterName: 'Eve<script>alert(1)</script>\r\nBcc: x@evil.com',
    groupName: '<a href="https://evil.com">Click</a>',
    email: '"><img src=x onerror=alert(1)>@x.com',
  });
  expect(m.html).not.toMatch(/<script|<a href="https:\/\/evil|<img src=x/);
  expect(m.subject).not.toMatch(/[\r\n]/);
});

test("works without an expiry date", () => {
  const m = buildInviteEmail(base);
  expect(m.html).not.toContain("works until");
});
