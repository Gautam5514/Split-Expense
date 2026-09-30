import { splitEqual, buildParticipants, round2 } from "../utils/quickSplit.js";

describe("quickSplit.splitEqual", () => {
  test("splits evenly when it divides cleanly", () => {
    expect(splitEqual(300, 3)).toEqual([100, 100, 100]);
  });

  test("distributes leftover paise so shares sum to the exact total", () => {
    const shares = splitEqual(100, 3); // 33.34 + 33.33 + 33.33
    expect(round2(shares.reduce((a, b) => a + b, 0))).toBe(100);
    // First person absorbs the extra paise.
    expect(shares[0]).toBeGreaterThanOrEqual(shares[1]);
  });

  test("handles a 1-person split", () => {
    expect(splitEqual(49.99, 1)).toEqual([49.99]);
  });

  test("penny-level total stays exact across many people", () => {
    const shares = splitEqual(0.1, 3); // 10 paise / 3
    expect(round2(shares.reduce((a, b) => a + b, 0))).toBe(0.1);
  });
});

describe("quickSplit.buildParticipants", () => {
  test("equal split assigns computed shares and ignores custom values", () => {
    const out = buildParticipants({
      totalAmount: 90,
      splitType: "equal",
      participants: [{ name: "A", share: 999 }, { name: "B" }, { name: "C" }],
    });
    expect(out.error).toBeUndefined();
    expect(out.participants.map((p) => p.share)).toEqual([30, 30, 30]);
  });

  test("custom split accepts shares that add up to the total", () => {
    const out = buildParticipants({
      totalAmount: 100,
      splitType: "custom",
      participants: [{ name: "A", share: 70 }, { name: "B", share: 30 }],
    });
    expect(out.error).toBeUndefined();
    expect(out.participants).toEqual([
      { name: "A", share: 70 },
      { name: "B", share: 30 },
    ]);
  });

  test("custom split rejects shares that don't match the total", () => {
    const out = buildParticipants({
      totalAmount: 100,
      splitType: "custom",
      participants: [{ name: "A", share: 70 }, { name: "B", share: 40 }],
    });
    expect(out.error).toMatch(/add up/i);
  });

  test("equal split by peopleCount generates anonymous Person 1..N with exact shares", () => {
    const out = buildParticipants({ totalAmount: 90, splitType: "equal", peopleCount: 3 });
    expect(out.error).toBeUndefined();
    expect(out.participants).toEqual([
      { name: "Person 1", share: 30 },
      { name: "Person 2", share: 30 },
      { name: "Person 3", share: 30 },
    ]);
  });

  test("peopleCount split keeps the total exact even when it doesn't divide", () => {
    const out = buildParticipants({ totalAmount: 100, splitType: "equal", peopleCount: 3 });
    expect(out.error).toBeUndefined();
    expect(round2(out.participants.reduce((a, p) => a + p.share, 0))).toBe(100);
  });

  test("peopleCount must be at least 1", () => {
    expect(buildParticipants({ totalAmount: 10, splitType: "equal", peopleCount: 0 }).error).toMatch(/at least one/i);
  });

  test("peopleCount caps at 50", () => {
    expect(buildParticipants({ totalAmount: 510, splitType: "equal", peopleCount: 51 }).error).toMatch(/at most 50/i);
  });

  test("blank names in a named list fall back to Person N (no longer rejected)", () => {
    const out = buildParticipants({ totalAmount: 20, splitType: "equal", participants: [{ name: "  " }, { name: "" }] });
    expect(out.error).toBeUndefined();
    expect(out.participants.map((p) => p.name)).toEqual(["Person 1", "Person 2"]);
  });

  test("rejects an invalid total", () => {
    expect(buildParticipants({ totalAmount: 0, splitType: "equal", peopleCount: 1 }).error).toMatch(/valid total/i);
  });

  test("caps participants at 50", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ name: `P${i}` }));
    expect(buildParticipants({ totalAmount: 510, splitType: "equal", participants: many }).error).toMatch(/at most 50/i);
  });
});
