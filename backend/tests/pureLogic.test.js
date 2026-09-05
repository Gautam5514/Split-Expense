// Unit tests for the pure math/content-building helpers inside the
// controllers - no database, no network. These are the functions most
// likely to silently corrupt money (split math, settlement caps) or ship a
// broken notification, so they get exhaustive, dependency-free coverage.
import { jest } from "@jest/globals";

// The controllers under test import "../index.js" (full Express/Socket.IO
// app + Firebase Admin bootstrap) and "../config/firebaseAdmin.js" (throws
// without real credentials) purely as side effects of other exports we
// don't need here. Mock both so importing the file for its pure helpers
// doesn't try to start a server or connect to Firebase.
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
const { buildSplits, maxSettleableBetween } = await import("../controllers/expenseController.js");
const { buildSettlement } = await import("../controllers/balanceController.js");
const { buildPushContent, notificationTitleForType } = await import("../controllers/notificationController.js");

// "exact"/"percent" splits wrap each userId in `new mongoose.Types.ObjectId(...)`
// (unlike "equal", which just echoes back whatever id shape it was given), so
// they need real ObjectId-valid hex strings rather than plain labels like "a".
const oid = () => new mongoose.Types.ObjectId().toString();

describe("buildSplits (expense split math)", () => {
  test("equal split divides evenly with no remainder", () => {
    const splits = buildSplits({ splitType: "equal", amount: 300, participants: ["a", "b", "c"] });
    expect(splits).toEqual([
      { userId: "a", share: 100 },
      { userId: "b", share: 100 },
      { userId: "c", share: 100 },
    ]);
    expect(splits.reduce((s, x) => s + x.share, 0)).toBeCloseTo(300, 2);
  });

  test("equal split routes rounding drift to the payer, not silently lost", () => {
    // 100 / 3 = 33.33... - naive rounding would total 99.99, losing a paisa.
    const splits = buildSplits({
      splitType: "equal",
      amount: 100,
      participants: ["a", "b", "c"],
      payerId: "b",
    });
    const total = splits.reduce((s, x) => s + x.share, 0);
    expect(Number(total.toFixed(2))).toBe(100);
    const payerSplit = splits.find((s) => s.userId === "b");
    const others = splits.filter((s) => s.userId !== "b");
    // The two non-payer shares stay at the clean rounded value...
    others.forEach((s) => expect(s.share).toBe(33.33));
    // ...and the payer absorbs the leftover paisa (33.33 + 0.01 = 33.34).
    expect(payerSplit.share).toBe(33.34);
  });

  test("equal split falls back to last participant when payer isn't a participant", () => {
    const splits = buildSplits({
      splitType: "equal",
      amount: 10,
      participants: ["a", "b", "c"],
      payerId: "someone-else-not-in-list",
    });
    const total = splits.reduce((s, x) => s + x.share, 0);
    expect(Number(total.toFixed(2))).toBe(10);
  });

  test("exact split accepts shares that sum to the total", () => {
    const [idA, idB] = [oid(), oid()];
    const splits = buildSplits({
      splitType: "exact",
      amount: 150,
      participants: [idA, idB],
      exactSplits: [{ userId: idA, share: 100 }, { userId: idB, share: 50 }],
    });
    expect(splits.map((s) => s.share)).toEqual([100, 50]);
  });

  test("exact split rejects shares that don't sum to the total", () => {
    const [idA, idB] = [oid(), oid()];
    expect(() =>
      buildSplits({
        splitType: "exact",
        amount: 150,
        participants: [idA, idB],
        exactSplits: [{ userId: idA, share: 100 }, { userId: idB, share: 40 }],
      })
    ).toThrow(/must sum to total amount/i);
  });

  test("exact split rejects a payee who isn't a participant", () => {
    const [idA, intruder] = [oid(), oid()];
    expect(() =>
      buildSplits({
        splitType: "exact",
        amount: 100,
        participants: [idA],
        exactSplits: [{ userId: idA, share: 50 }, { userId: intruder, share: 50 }],
      })
    ).toThrow(/non-participant/i);
  });

  test("percent split converts percentages to amounts and fixes drift on the last entry", () => {
    const [idA, idB, idC] = [oid(), oid(), oid()];
    const splits = buildSplits({
      splitType: "percent",
      amount: 100,
      participants: [idA, idB, idC],
      percentSplits: [
        { userId: idA, percent: 33.33 },
        { userId: idB, percent: 33.33 },
        { userId: idC, percent: 33.34 },
      ],
    });
    const total = splits.reduce((s, x) => s + x.share, 0);
    expect(Number(total.toFixed(2))).toBe(100);
  });

  test("percent split rejects percentages that don't sum to 100", () => {
    const [idA, idB] = [oid(), oid()];
    expect(() =>
      buildSplits({
        splitType: "percent",
        amount: 100,
        participants: [idA, idB],
        percentSplits: [{ userId: idA, percent: 60 }, { userId: idB, percent: 30 }],
      })
    ).toThrow(/must sum to 100/i);
  });

  test("rejects an unknown splitType", () => {
    expect(() => buildSplits({ splitType: "bogus", amount: 10, participants: ["a"] })).toThrow(
      /invalid splittype/i
    );
  });

  test("rejects an empty participant list", () => {
    expect(() => buildSplits({ splitType: "equal", amount: 10, participants: [] })).toThrow(
      /no participants/i
    );
  });
});

describe("maxSettleableBetween (settlement cap - the task #8 safety net)", () => {
  test("returns the smaller of the two outstanding amounts", () => {
    // debtor owes 500, creditor is owed 800 -> can only settle 500
    const balances = { debtor: -500, creditor: 800 };
    expect(maxSettleableBetween(balances, "debtor", "creditor")).toBe(500);
  });

  test("returns 0 when the 'debtor' doesn't actually owe anything", () => {
    const balances = { a: 0, b: 100 };
    expect(maxSettleableBetween(balances, "a", "b")).toBe(0);
  });

  test("returns 0 when the 'creditor' isn't actually owed anything", () => {
    const balances = { a: -100, b: 0 };
    expect(maxSettleableBetween(balances, "a", "b")).toBe(0);
  });

  test("returns null when either party has no live balance entry (not a member)", () => {
    const balances = { a: -100 };
    expect(maxSettleableBetween(balances, "a", "ghost")).toBeNull();
  });
});

describe("buildSettlement (who-pays-whom minimal-transaction suggestions)", () => {
  test("nets a simple two-person debt to one transaction", () => {
    const txns = buildSettlement({ a: -50, b: 50 });
    expect(txns).toEqual([{ from: "a", to: "b", amount: 50 }]);
  });

  test("a fully settled group produces no transactions", () => {
    expect(buildSettlement({ a: 0, b: 0 })).toEqual([]);
  });

  test("minimizes transaction count across three people", () => {
    // a owes 30, b owes 20, c is owed 50 -> should resolve in exactly 2 hops
    const txns = buildSettlement({ a: -30, b: -20, c: 50 });
    expect(txns).toHaveLength(2);
    const totalPaid = txns.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBeCloseTo(50, 2);
  });
});

describe("buildPushContent (rich Expo/app push copy - task #10)", () => {
  test("expense push includes category emoji, group name and amount", () => {
    const { title, subtitle, channelId } = buildPushContent("expense", {
      groupName: "Goa Trip",
      amount: 1200,
      category: "travel",
    });
    expect(title).toBe("✈️ New expense · Goa Trip");
    expect(subtitle).toBe("₹1200");
    expect(channelId).toBe("expenses");
  });

  test("expense push falls back to a generic emoji for an unknown category", () => {
    const { title } = buildPushContent("expense", { groupName: "Trip", category: "made-up" });
    expect(title).toBe("💳 New expense · Trip");
  });

  test("expense push degrades gracefully with no meta at all", () => {
    const { title, subtitle } = buildPushContent("expense", {});
    expect(title).toBe("💳 New expense");
    expect(subtitle).toBeUndefined();
  });

  test.each([
    ["requested", "💸 Payment claim"],
    ["confirmed", "✅ Settlement confirmed"],
    ["rejected", "⚠️ Settlement disputed"],
    ["cancelled", "🚫 Settlement cancelled"],
  ])("settlement push for kind=%s leads with the right verb", (kind, expectedPrefix) => {
    const { title, channelId } = buildPushContent("settlement", { groupName: "Flat 304", kind, amount: 500 });
    expect(title).toBe(`${expectedPrefix} · Flat 304`);
    expect(channelId).toBe("settlements");
  });

  test("settlement push with an unrecognized kind falls back to a generic label", () => {
    const { title } = buildPushContent("settlement", { groupName: "G", kind: "unknown-kind" });
    expect(title).toBe("💰 Settlement update · G");
  });

  test("group push uses the group name when present, else a generic banner", () => {
    expect(buildPushContent("group", { groupName: "Weekend Getaway" }).title).toBe("👥 Weekend Getaway");
    expect(buildPushContent("group", {}).title).toBe("SplitEase");
  });

  test("unknown type falls back to the group-type banner", () => {
    expect(buildPushContent("something-else", { groupName: "X" }).title).toBe("👥 X");
  });
});

describe("notificationTitleForType (plain FCM/web push title - kept unchanged on purpose)", () => {
  test.each([
    ["expense", "New expense"],
    ["settlement", "Settlement update"],
    ["group", "SplitEase"],
    ["anything-unrecognized", "SplitEase"],
  ])("type=%s -> %s", (type, expected) => {
    expect(notificationTitleForType(type)).toBe(expected);
  });
});
