import { jest } from "@jest/globals";
import mongoose from "mongoose";

jest.unstable_mockModule("../models/groupModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail: jest.fn() }));

const { buildReportData, renderReportPdf } = await import("../utils/settlementReport.js");
const { buildMemberEmail } = await import("../services/groupReportService.js");

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

  test("member email is personalised and escaped", () => {
    const d = buildReportData({ group: { ...group, name: "<b>x</b>" }, members, expenses });
    const asha = d.members.find((r) => r.name === "Asha");
    const mail = buildMemberEmail(d, asha, { appUrl: "https://app" });
    expect(mail.html).not.toContain("<b>x</b>");
    expect(mail.text).toContain("You receive ₹1,300");
    expect(mail.images).toEqual(expect.arrayContaining(["logo", "file", "status-pending"]));
    expect(/\p{Extended_Pictographic}/u.test(mail.html + mail.subject + mail.text)).toBe(false);
  });
});
