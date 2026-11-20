import { jest } from "@jest/globals";
import mongoose from "mongoose";

jest.unstable_mockModule("../models/groupModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail: jest.fn() }));

const { buildReportData, renderReportPdf } = await import("../utils/settlementReport.js");
const { buildMemberEmail, emailImageAttachments } = await import("../services/groupReportService.js");

const oid = () => new mongoose.Types.ObjectId();
const [a, b, c] = [oid(), oid(), oid()];
const members = [{ _id: a, name: "Asha", email: "a@x.com" }, { _id: b, name: "Bala", email: "b@x.com" }, { _id: c, name: "Chitra", email: "c@x.com" }];
const group = { _id: oid(), name: "Goa Trip", groupType: "trip", settings: { currency: "INR" } };
const eq = (amt, ids) => ids.map((id) => ({ userId: id, share: amt / ids.length }));

const expenses = [
  { description: "Hotel", amount: 3000, paidBy: a, category: "stay", date: new Date("2026-10-01"), splits: eq(3000, [a, b, c]) },
  { description: "Dinner", amount: 600, paidBy: b, category: "food", date: new Date("2026-10-02"), splits: eq(600, [a, b, c]) },
  { description: "Settlement (Cash)", amount: 500, paidBy: c, isSettlement: true, date: new Date("2026-10-05"), splits: [{ userId: a, share: 500 }] },
];

describe("settlement report", () => {
  const data = buildReportData({ group, members, expenses, completedByName: "Asha" });

  test("per-member paid/share/net/balance reconcile", () => {
    const m = Object.fromEntries(data.members.map((r) => [r.name, r]));
    expect(m.Asha.paid).toBe(3000); expect(m.Asha.share).toBe(1200); expect(m.Asha.net).toBe(1800);
    expect(m.Asha.finalBalance).toBe(1300); // 1800 - 500 already received
    expect(m.Bala.net).toBe(-600); // paid 600, share 1200
    expect(m.Chitra.finalBalance).toBe(-700); // -1200 owed + 500 already paid
  });

  test("balances sum to zero and remaining transfers clear them", () => {
    const sum = data.members.reduce((s, r) => s + r.finalBalance, 0);
    expect(Math.abs(sum)).toBeLessThan(0.01);
    const owed = data.remaining.reduce((s, t) => s + t.amount, 0);
    expect(owed).toBeCloseTo(1300, 2);
    expect(data.fullySettled).toBe(false);
    expect(data.totals.totalSpent).toBe(3600);
    expect(data.settlements).toHaveLength(1);
  });

  test("PDF renders and is a valid PDF", async () => {
    const pdf = await renderReportPdf(data);
    expect(pdf.slice(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  test("handles non-latin names without throwing", async () => {
    const d = buildReportData({ group: { ...group, name: "गोवा ट्रिप" }, members: [{ ...members[0], name: "आशा" }, members[1]], expenses: [] });
    await expect(renderReportPdf(d)).resolves.toBeInstanceOf(Buffer);
  });

  test("member email is as plain as the sign-in code email: logo, name, one short message", () => {
    const d = buildReportData({ group: { ...group, name: "<b>x</b>" }, members, expenses });
    const asha = d.members.find((r) => r.name === "Asha");
    const mail = buildMemberEmail(d, asha, { appUrl: "https://app" });
    expect(mail.html).not.toContain("<b>x</b>");
    expect(mail.text).toContain("Your full statement is attached as a PDF.");
    // Only the logo is embedded, and no amounts: every number is in the PDF.
    expect(mail.images).toEqual(["logo-light"]);
    expect(mail.html).not.toMatch(/cid:se-(?!logo-light)/);
    expect(mail.html + mail.text).not.toMatch(/₹|owe|owed/);
    expect(mail.html).not.toMatch(/border-radius|background:#0B0F17/); // no cards, buttons or dark band
    expect(/\p{Extended_Pictographic}/u.test(mail.html + mail.subject + mail.text)).toBe(false);
  });

  test("the message says when the group began, how many people it had and how it ended", () => {
    const d = buildReportData({ group: { ...group, name: "Manali Trip", groupType: "trip", createdAt: new Date(2026, 9, 12) }, members, expenses, completedByName: "Gautam Pandit", completedAt: new Date(2026, 10, 21) });
    const asha = d.members.find((r) => r.name === "Asha");
    const done = buildMemberEmail(d, asha, { appUrl: "https://app", reason: "completed", refId: "ST-1" });
    expect(done.subject).toBe("Manali Trip is complete - your settlement statement");
    expect(done.text).toContain(`Hi Asha, this trip group was created on 12 Oct 2026 with ${members.length} members. Gautam Pandit marked it complete on 21 Nov 2026.`);
    expect(done.html).toContain("Gautam Pandit</strong> marked it complete on 21 Nov 2026.");
    expect(done.html).toContain("https://app/groups/");
    expect(done.text).toContain("Reference ST-1");

    // The person who completed it reads "You", not their own name.
    const self = buildReportData({ group: { ...group, createdAt: new Date(2026, 9, 12) }, members, expenses, completedByName: "Asha", completedAt: new Date(2026, 10, 21) });
    expect(buildMemberEmail(self, self.members.find((r) => r.name === "Asha")).text).toContain("You marked it complete on 21 Nov 2026.");
    expect(buildMemberEmail(self, self.members.find((r) => r.name === "Bala")).text).toContain("Asha marked it complete on 21 Nov 2026.");

    // A snapshot saved before createdAt existed still reads naturally.
    const old = { ...d, group: { ...d.group, createdAt: null } };
    expect(buildMemberEmail(old, asha).text).toContain(`this trip group has ${members.length} members.`);
  });

  test("fully settled and manual sends use the same plain note with their own wording", () => {
    const d = buildReportData({ group, members, expenses: [], completedAt: new Date(2026, 10, 21) });
    const settled = buildMemberEmail(d, d.members[0], { reason: "settled" });
    expect(settled.subject).toContain("fully settled");
    expect(settled.text).toContain("every balance is now zero");
    expect(buildMemberEmail(d, d.members[0], { reason: "manual" }).text).toContain("where it stands as of 21 Nov 2026");
  });

  test("profile photos survive snapshots (for the PDF) and can still be embedded when asked for", () => {
    const d = buildReportData({ group, members: members.map((m) => ({ ...m, photoURL: "https://lh3.googleusercontent.com/example" })), expenses });
    expect(d.members[0].photoURL).toBe("https://lh3.googleusercontent.com/example");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6sAAAAABJRU5ErkJggg==", "base64");
    const photos = new Map([[String(b), png]]);
    const inline = emailImageAttachments(["logo-light", `avatar-${b}`], photos);
    expect(inline.some((item) => item.cid === `se-avatar-${b}` && item.content.equals(png))).toBe(true);
    expect(inline.some((item) => item.cid === "se-logo-light")).toBe(true);
  });
});
