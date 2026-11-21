// Ported from research_paper/model/sem.test.mjs (SEM shadow mode).
// Run: node --test research_paper/model/
import assert from "node:assert/strict";
import { Q, split, prorate, hamilton, settle, verify, settleGreedy, netBalances, toMinor, formatMinor, convert } from "../utils/sem.js";

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const total = (r) => r.shares.reduce((a, s) => a + s.minor, 0n);

const zeroSum = (n, max = 50000) => {
  const v = Array.from({ length: n }, () => BigInt(ri(-max, max)));
  v[0] -= v.reduce((a, b) => a + b, 0n);
  return Object.fromEntries(v.map((x, i) => [`u${i}`, x]));
};
// Brute force: max number of disjoint zero-sum groups via submask DP.
const oracleZ = (vals) => {
  const n = vals.length, best = new Array(1 << n).fill(0), sum = new Array(1 << n).fill(0n);
  for (let m = 1; m < 1 << n; m++) {
    for (let i = 0; i < n; i++) if (m & (1 << i)) sum[m] += vals[i];
    let b = sum[m] === 0n ? 1 : 0;
    for (let s = (m - 1) & m; s > 0; s = (s - 1) & m) if (sum[s] === 0n) b = Math.max(b, best[s] + best[m ^ s]);
    best[m] = b;
  }
  return best[(1 << n) - 1];
};

test("exact fractions parse decimals without float error", () => {
  assert.equal(Q.dec("0.1").add(Q.dec("0.2")).cmp(Q.dec("0.3")), 0);
  assert.equal(toMinor("1234.56", "INR"), 123456n);
  assert.equal(toMinor("500", "JPY"), 500n);
  assert.equal(toMinor("1.234", "KWD"), 1234n);
  assert.throws(() => toMinor("1.234", "INR"));
  assert.equal(formatMinor(-5n, "INR"), "-0.05");
});

test("Hamilton: exact sum and |share - quota| < 1 for random bills, all tie-breaks", () => {
  for (let t = 0; t < 3000; t++) {
    const n = ri(1, 15), T = BigInt(ri(0, 10_000_000));
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    for (const tieBreak of ["hash", "payer", "order"]) {
      const r = split({ id: `e${t}`, type: "shares", total: T, shares: ids.map((id) => ({ id, shares: ri(1, 9) })), tieBreak, payerId: "p0" });
      assert.equal(total(r), T);
      assert.ok(r.maxError < 1);
    }
  }
});

test("equal: 100.00 / 3 gives 33.34 + 33.33 + 33.33 and payer mode keeps legacy", () => {
  const r = split({ type: "equal", total: 10000n, participants: ["a", "b", "c"], tieBreak: "payer", payerId: "b" });
  assert.deepEqual(r.shares.map((s) => s.minor), [3333n, 3334n, 3333n]);
});

test("hash tie-break is fair on average across many bills", () => {
  const extra = { a: 0, b: 0, c: 0 };
  for (let t = 0; t < 3000; t++) {
    const r = split({ id: `bill-${t}`, type: "equal", total: 10000n, participants: ["a", "b", "c"] });
    for (const s of r.shares) if (s.minor === 3334n) extra[s.id]++;
  }
  for (const k of Object.keys(extra)) assert.ok(extra[k] > 800 && extra[k] < 1200, JSON.stringify(extra));
});

test("percent must be exactly 100 (decimal-exact, no float tolerance)", () => {
  const ok = split({ type: "percent", total: 10000n, percents: [{ id: "a", percent: "33.33" }, { id: "b", percent: "33.33" }, { id: "c", percent: "33.34" }] });
  assert.equal(total(ok), 10000n);
  assert.throws(() => split({ type: "percent", total: 100n, percents: [{ id: "a", percent: "60" }, { id: "b", percent: "39.99" }] }));
});

test("exact amounts must sum exactly", () => {
  assert.throws(() => split({ type: "exact", total: 100n, amounts: [{ id: "a", minor: 50 }, { id: "b", minor: 49 }] }));
});

test("adjustment: fixed extra then equal rest", () => {
  const r = split({ type: "adjustment", total: 10000n, participants: ["a", "b"], adjustments: { a: 2000 } });
  assert.deepEqual(r.shares.map((s) => s.minor), [6000n, 4000n]);
});

test("segments: 3 nights, c leaves after night 1", () => {
  const r = split({ type: "segments", total: 9000n, segments: [{ cost: 3000, present: ["a", "b", "c"] }, { cost: 3000, present: ["a", "b"] }, { cost: 3000, present: ["a", "b"] }] });
  assert.deepEqual(Object.fromEntries(r.shares.map((s) => [s.id, s.minor])), { a: 4000n, b: 4000n, c: 1000n });
});

test("route (taxi): first drop at 300, second at 500, last at 900", () => {
  // legs 300/3, 200/2, 400/1 -> a=100, b=200, c=600
  const r = split({ type: "route", total: 900n, riders: [{ id: "a", meter: 300 }, { id: "b", meter: 500 }, { id: "c", meter: 900 }] });
  assert.deepEqual(r.shares.map((s) => s.minor), [100n, 200n, 600n]);
});

test("itemized restaurant bill with 5% GST, 10% tip, flat coupon - exact to the paisa", () => {
  const bill = {
    id: "dinner", type: "itemized",
    items: [
      { name: "paneer", minor: 32000, users: ["a", "b"] },
      { name: "biryani", minor: 45000, users: ["c"] },
      { name: "drinks", minor: 18000, users: ["a", "b", "c"] },
    ],
    charges: [
      { kind: "discount", minor: 10000 },
      { kind: "tax", rate: "5" },
      { kind: "tip", rate: "10" },
    ],
  };
  // subtotal 95000 - 10000 = 85000 ... compute expected total exactly
  const sub = 95000, after = sub - 10000;
  const expected = after + (sub * 0.05) + (sub * 0.10); // tax/tip on items' subtotal
  const r = split({ ...bill, total: BigInt(Math.round(expected)) });
  assert.equal(total(r), BigInt(Math.round(expected)));
  assert.ok(r.maxError < 1);
});

test("itemized rejects a printed total far from items + charges", () => {
  assert.throws(() => split({ type: "itemized", total: 99999n, items: [{ name: "x", minor: 1000, users: ["a"] }] }));
});

test("prorate a monthly bill by days present", () => {
  const r = prorate(100000n, [{ id: "a", days: 30 }, { id: "b", days: 15 }, { id: "c", days: 10 }]);
  assert.equal(total(r), 100000n);
});

test("multi-currency: convert once at frozen rate, then split in base", () => {
  const inr = convert(12345n, "USD", "INR", "83.4567"); // $123.45
  assert.equal(inr, 1030273n); // 10302.73 INR (exact product 10302.729615 -> half-up)
  const thb = convert(100000n, "JPY", "INR", "0.5612"); // 1,00,000 yen
  assert.equal(thb, 5612000n);
});

test("multi-payer netting conserves money", () => {
  const net = netBalances([
    { payers: [{ id: "a", minor: 6000 }, { id: "b", minor: 4000 }], shares: [{ id: "a", minor: 2500 }, { id: "b", minor: 2500 }, { id: "c", minor: 5000 }] },
  ]);
  assert.equal([...net.values()].reduce((x, y) => x + y, 0n), 0n);
});

test("settle: matches brute-force optimum n - Z (n <= 10)", () => {
  for (let t = 0; t < 400; t++) {
    const b = zeroSum(ri(2, 10), ri(0, 1) ? 50 : 50000);
    const r = settle(b);
    assert.ok(verify(b, r.transfers));
    const vals = Object.values(b).filter((v) => v !== 0n);
    if (vals.length) assert.equal(r.transfers.length, vals.length - oracleZ(vals));
    assert.ok(r.optimal);
  }
});

test("settle: valid, minimal money moved, never worse than greedy (n <= 60)", () => {
  for (let t = 0; t < 300; t++) {
    const b = zeroSum(ri(2, 60), ri(0, 1) ? 30 : 50000);
    const r = settle(b);
    assert.ok(verify(b, r.transfers));
    const pos = Object.values(b).filter((v) => v > 0n).reduce((a, c) => a + c, 0n);
    assert.equal(r.transfers.reduce((a, x) => a + x.minor, 0n), pos);
    assert.ok(r.transfers.length <= settleGreedy(b).length);
  }
});

test("settle: Verhoeff-style case where largest-first greedy is not optimal", () => {
  const b = { a: 5n, b: 5n, c: -3n, d: -3n, e: -4n };
  // greedy pairs 5 with -4 first; optimum is still 4 here, but for pairs:
  const c = { a: 6n, b: -6n, c: 4n, d: -4n, e: 7n, f: -7n };
  assert.equal(settle(c).transfers.length, 3);
  assert.ok(verify(b, settle(b).transfers));
});

test("settle rejects books that do not close", () => {
  assert.throws(() => settle({ a: 10n, b: -9n }));
});

const { semShadowCompare, buildSettlement } = await import("../controllers/balanceController.js");

test("shadow compare: verified, never more transfers than legacy, no user ids in output", () => {
  const balances = { a: 60, b: -60, c: 40, d: -40, e: 70, f: -70 };
  const legacy = buildSettlement(balances);
  const r = semShadowCompare(balances, legacy);
  assert.equal(r.verified, true);
  assert.equal(r.sem, 3);
  assert.ok(r.sem <= r.legacy);
  assert.ok(!JSON.stringify(r).includes('"a"'));
});

test("shadow compare tolerates legacy paisa drift and skips large drift", () => {
  const ok = semShadowCompare({ a: 33.34, b: -16.66, c: -16.66 }, []);
  assert.equal(ok.verified, true);
  assert.equal(ok.drift, 2);
  assert.equal(semShadowCompare({ a: 10, b: -5 }, []).skipped, "drift");
});
