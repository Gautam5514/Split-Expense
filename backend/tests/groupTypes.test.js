// Group types (Roommates / Trip / Business): the new split types, group
// settings validation and the recurring-bill schedule.
import { jest } from "@jest/globals";

jest.unstable_mockModule("../index.js", () => ({
  io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() },
  onlineUsers: new Map(),
}));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({
  default: { messaging: () => ({ sendEachForMulticast: jest.fn() }) },
}));
jest.unstable_mockModule("../utils/ocrService.js", () => ({
  runOcr: jest.fn(async () => null),
}));
jest.unstable_mockModule("../utils/referralService.js", () => ({
  incrementExpenseCount: jest.fn(async () => {}),
}));

const mongoose = (await import("mongoose")).default;
const { buildSplits } = await import("../controllers/expenseController.js");
const { buildGroupSettingsUpdate, unflatten } = await import("../utils/groupSettings.js");
const { nextRunDate } = await import("../utils/recurringRunner.js");
const { defaultSplitFor } = await import("../utils/defaultSplit.js");

const oid = () => new mongoose.Types.ObjectId().toString();
const total = (splits) => Number(splits.reduce((a, s) => a + s.share, 0).toFixed(2));
const shareOf = (splits, id) => splits.find((s) => String(s.userId) === id)?.share;

describe("buildSplits - shares", () => {
  test("2:1:1 rent split", () => {
    const [a, b, c] = [oid(), oid(), oid()];
    const splits = buildSplits({
      splitType: "shares", amount: 20000, participants: [a, b, c],
      sharesSplits: [{ userId: a, shares: 2 }, { userId: b, shares: 1 }, { userId: c, shares: 1 }],
    });
    expect(shareOf(splits, a)).toBe(10000);
    expect(shareOf(splits, b)).toBe(5000);
    expect(shareOf(splits, c)).toBe(5000);
  });

  test("rounding drift lands on the payer and the total is exact", () => {
    const [a, b, c] = [oid(), oid(), oid()];
    const splits = buildSplits({
      splitType: "shares", amount: 100, participants: [a, b, c], payerId: b,
      sharesSplits: [{ userId: a, shares: 1 }, { userId: b, shares: 1 }, { userId: c, shares: 1 }],
    });
    expect(total(splits)).toBe(100);
    expect(shareOf(splits, b)).toBe(33.34);
  });

  test("zero-share members are left out", () => {
    const [a, b] = [oid(), oid()];
    const splits = buildSplits({
      splitType: "shares", amount: 50, participants: [a, b],
      sharesSplits: [{ userId: a, shares: 1 }, { userId: b, shares: 0 }],
    });
    expect(splits).toHaveLength(1);
    expect(shareOf(splits, a)).toBe(50);
  });

  test("rejects all-zero, negative and non-participant shares", () => {
    const [a, b] = [oid(), oid()];
    expect(() => buildSplits({ splitType: "shares", amount: 10, participants: [a], sharesSplits: [{ userId: a, shares: 0 }] })).toThrow();
    expect(() => buildSplits({ splitType: "shares", amount: 10, participants: [a], sharesSplits: [{ userId: a, shares: -1 }] })).toThrow();
    expect(() => buildSplits({ splitType: "shares", amount: 10, participants: [a], sharesSplits: [{ userId: b, shares: 1 }] })).toThrow();
  });
});

describe("buildSplits - itemized", () => {
  test("each item is split among the people who had it", () => {
    const [a, b, c] = [oid(), oid(), oid()];
    const splits = buildSplits({
      splitType: "itemized", amount: 900, participants: [a, b, c],
      items: [
        { name: "Pizza", amount: 600, userIds: [a, b, c] },
        { name: "Beer", amount: 300, userIds: [a] },
      ],
    });
    expect(shareOf(splits, a)).toBe(500);
    expect(shareOf(splits, b)).toBe(200);
    expect(shareOf(splits, c)).toBe(200);
    expect(total(splits)).toBe(900);
  });

  test("items must add up to the total", () => {
    const a = oid();
    expect(() => buildSplits({
      splitType: "itemized", amount: 100, participants: [a],
      items: [{ name: "x", amount: 90, userIds: [a] }],
    })).toThrow(/add up/);
  });

  test("an item with nobody on it is rejected", () => {
    const a = oid();
    expect(() => buildSplits({
      splitType: "itemized", amount: 100, participants: [a],
      items: [{ name: "x", amount: 100, userIds: [] }],
    })).toThrow();
  });

  test("uneven thirds still sum exactly", () => {
    const [a, b, c] = [oid(), oid(), oid()];
    const splits = buildSplits({
      splitType: "itemized", amount: 100, participants: [a, b, c], payerId: a,
      items: [{ name: "Cab", amount: 100, userIds: [a, b, c] }],
    });
    expect(total(splits)).toBe(100);
  });
});

describe("buildGroupSettingsUpdate", () => {
  test("accepts a trip with dates and budget", () => {
    const { update, error } = buildGroupSettingsUpdate({
      groupType: "trip",
      trip: { startDate: "2026-10-12", endDate: "2026-10-18", budget: "15000" },
    });
    expect(error).toBeUndefined();
    expect(update["trip.budget"]).toBe(15000);
    expect(update.groupType).toBe("trip");
  });

  test("rejects end before start, bad type, bad bill day, bad currency", () => {
    expect(buildGroupSettingsUpdate({ trip: { startDate: "2026-10-12", endDate: "2026-10-01" } }).field).toBe("endDate");
    expect(buildGroupSettingsUpdate({ groupType: "party" }).field).toBe("groupType");
    expect(buildGroupSettingsUpdate({ roommate: { billDay: 31 } }).field).toBe("billDay");
    expect(buildGroupSettingsUpdate({ settings: { currency: "XYZ" } }).field).toBe("currency");
  });

  test("default split weights must be members and percent must total 100", () => {
    const [a, b, stranger] = [oid(), oid(), oid()];
    const members = { memberIds: [a, b] };
    expect(buildGroupSettingsUpdate({ settings: { defaultSplit: { type: "shares", weights: [{ userId: stranger, value: 1 }] } } }, members).field).toBe("defaultSplit");
    expect(buildGroupSettingsUpdate({ settings: { defaultSplit: { type: "percent", weights: [{ userId: a, value: 60 }, { userId: b, value: 30 }] } } }, members).field).toBe("defaultSplit");
    const ok = buildGroupSettingsUpdate({ settings: { defaultSplit: { type: "percent", weights: [{ userId: a, value: 60 }, { userId: b, value: 40 }] } } }, members);
    expect(ok.error).toBeUndefined();
    expect(ok.update["settings.defaultSplit"].weights).toHaveLength(2);
  });

  test("unflatten builds nested objects for Model.create", () => {
    expect(unflatten({ "trip.budget": 5, "trip.endDate": null, name: "x" })).toEqual({ trip: { budget: 5, endDate: null }, name: "x" });
  });
});

describe("nextRunDate", () => {
  test("later this month when the day is still ahead", () => {
    const d = nextRunDate(15, new Date(2026, 8, 10, 12));
    expect([d.getMonth(), d.getDate()]).toEqual([8, 15]);
  });

  test("next month when the day has passed or is today after run hour", () => {
    expect(nextRunDate(5, new Date(2026, 8, 10)).getMonth()).toBe(9);
    expect(nextRunDate(10, new Date(2026, 8, 10, 12)).getMonth()).toBe(9);
  });

  test("rolls over the year", () => {
    const d = nextRunDate(1, new Date(2026, 11, 20));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 0, 1]);
  });
});

describe("defaultSplitFor (the group's own split)", () => {
  const g = (defaultSplit) => ({ settings: { defaultSplit } });

  test("equal by default", async () => {
    const [a, b] = [oid(), oid()];
    const r = defaultSplitFor(g(undefined), [a, b], 100, a);
    expect(r.splitType).toBe("equal");
    expect(total(r.splits)).toBe(100);
  });

  test("shares; members without a saved share count as 1", async () => {
    const [a, b, c] = [oid(), oid(), oid()];
    const r = defaultSplitFor(g({ type: "shares", weights: [{ userId: a, value: 2 }] }), [a, b, c], 400, a);
    expect(r.splitType).toBe("shares");
    expect(shareOf(r.splits, a)).toBe(200);
    expect(shareOf(r.splits, b)).toBe(100);
  });

  test("shares chosen at create time with no weights = equal shares", async () => {
    const [a, b] = [oid(), oid()];
    const r = defaultSplitFor(g({ type: "shares", weights: [] }), [a, b], 90, a);
    expect(shareOf(r.splits, a)).toBe(45);
  });

  test("percent that doesn't cover everyone falls back to equal", async () => {
    const [a, b, c] = [oid(), oid(), oid()];
    const r = defaultSplitFor(g({ type: "percent", weights: [{ userId: a, value: 60 }, { userId: b, value: 40 }] }), [a, b, c], 300, a);
    expect(r.splitType).toBe("equal");
  });

  test("empty shares are allowed in settings (create time)", () => {
    const res = buildGroupSettingsUpdate({ settings: { defaultSplit: { type: "shares", weights: [] } } }, { memberIds: [] });
    expect(res.error).toBeUndefined();
    expect(res.update["settings.defaultSplit"]).toEqual({ type: "shares", weights: [] });
  });
});
