/* SEM exact settlement engine (paper and code:
 * https://github.com/Gautam5514/exact-bill-splitting).
 * Used ONLY in shadow mode (SEM_SHADOW=1): computed next to the legacy
 * settlement and logged, never returned to users. */
/*
 * SEM - SplitEase Exact Model (research prototype, not wired into the app).
 *
 * One pipeline for every split type:
 *
 *   bill --(split rule)--> exact rational quotas q_i  (sum q_i = T exactly)
 *        --(Hamilton + hash tie-break)--> integer shares a_i (sum a_i = T,
 *                                          |a_i - q_i| < 1 minor unit)
 *   ledger --(netting)--> balances b_i (integers, sum 0)
 *        --(pair cancel -> exact DP / packing heuristic)--> transfers
 *        --(independent verifier)--> certified plan
 *
 * No floating-point number is ever used for money. Quotas are exact BigInt
 * fractions, so even itemized bills with GST + tip + discount are computed
 * exactly and rounded ONCE, per person, at the very end.
 */

/* ============================== exact fractions ========================== */
const gcd = (a, b) => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};
export class Q {
  constructor(n, d = 1n) {
    n = BigInt(n);
    d = BigInt(d);
    if (d === 0n) throw new Error("division by zero");
    if (d < 0n) [n, d] = [-n, -d];
    const g = gcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }
  static of(x) {
    if (x instanceof Q) return x;
    if (typeof x === "bigint") return new Q(x);
    if (typeof x === "number" && Number.isInteger(x)) return new Q(BigInt(x));
    return Q.dec(String(x));
  }
  // Exact decimal string -> fraction ("33.335" -> 6667/200). Avoids float.
  static dec(s) {
    const m = /^\s*([+-])?(\d*)(?:\.(\d*))?\s*$/.exec(s);
    if (!m || (!m[2] && !m[3])) throw new Error(`bad decimal: ${s}`);
    const frac = m[3] || "";
    const n = BigInt((m[2] || "0") + frac) * (m[1] === "-" ? -1n : 1n);
    return new Q(n, 10n ** BigInt(frac.length));
  }
  add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d); }
  div(o) { o = Q.of(o); return new Q(this.n * o.d, this.d * o.n); }
  cmp(o) { o = Q.of(o); const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
  floor() { const q = this.n / this.d; return this.n < 0n && q * this.d !== this.n ? q - 1n : q; }
  isZero() { return this.n === 0n; }
  toString() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
  toNumber() { return Number(this.n) / Number(this.d); }
}
const ZERO = new Q(0n);
const sumQ = (xs) => xs.reduce((a, b) => a.add(b), ZERO);

/* ============================== currencies =============================== */
// ISO 4217 minor-unit exponents (subset; extend as needed).
export const EXPONENT = { INR: 2, USD: 2, EUR: 2, GBP: 2, AED: 2, SGD: 2, THB: 2, JPY: 0, KRW: 0, VND: 0, KWD: 3, BHD: 3, OMR: 3 };
export const toMinor = (decimalString, currency = "INR") => {
  const e = EXPONENT[currency];
  if (e === undefined) throw new Error(`unsupported currency ${currency}`);
  const q = Q.dec(String(decimalString)).mul(10n ** BigInt(e));
  if (q.d !== 1n) throw new Error(`${decimalString} has more decimals than ${currency} allows`);
  return q.n;
};
export const formatMinor = (minor, currency = "INR") => {
  const e = EXPONENT[currency];
  const neg = minor < 0n;
  const s = (neg ? -minor : minor).toString().padStart(e + 1, "0");
  return (neg ? "-" : "") + (e ? `${s.slice(0, -e)}.${s.slice(-e)}` : s);
};
// Convert ONE amount at ONE frozen rate (rate given as decimal string),
// rounding half-up on the exact product. Split happens afterwards in base.
export const convert = (minor, from, to, rate) => {
  const scale = new Q(10n ** BigInt(EXPONENT[to]), 10n ** BigInt(EXPONENT[from]));
  const exact = new Q(minor).mul(Q.dec(rate)).mul(scale);
  return exact.add(new Q(1n, 2n)).floor();
};

/* ===================== rounding: Hamilton + fair tie-break ================ */
// FNV-1a 32-bit: a stable, platform-independent hash for tie-breaking.
const fnv = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  // murmur3 fmix32 avalanche: plain FNV keeps a strong bias when keys differ
  // only in the last characters (caught by the fairness test).
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
};
/**
 * Round exact quotas (sum must be an integer) to integers by largest
 * remainder. Ties: tieBreak = "hash" (fair on average across bills, the
 * default), "payer" (payer first, legacy behaviour), or "order".
 */
export const hamilton = (ids, quotas, { salt = "", tieBreak = "hash", payerId = null } = {}) => {
  const total = sumQ(quotas);
  if (total.d !== 1n) throw new Error("quotas must sum to a whole number of minor units");
  const floors = quotas.map((q) => q.floor());
  const rem = quotas.map((q, i) => q.sub(floors[i]));
  let left = total.n - floors.reduce((a, b) => a + b, 0n);
  const rank = (i) =>
    tieBreak === "payer" ? (String(ids[i]) === String(payerId) ? -1 : i)
    : tieBreak === "order" ? i
    : fnv(`${salt}:${ids[i]}`);
  const order = ids.map((_, i) => i).filter((i) => !rem[i].isZero())
    .sort((a, b) => rem[b].cmp(rem[a]) || rank(a) - rank(b) || a - b);
  const out = floors.slice();
  for (let k = 0; left > 0n; k++, left--) out[order[k]] += 1n;
  return out;
};

/* ============================== split rules ============================== */
// Each rule returns exact quotas for every participant; finalize() rounds.
const finalize = (bill, ids, quotas) => {
  const total = BigInt(bill.total);
  if (sumQ(quotas).cmp(new Q(total)) !== 0) throw new Error("internal: quotas do not sum to total");
  if (quotas.some((q) => q.cmp(ZERO) < 0)) throw new Error("a share would be negative");
  const minor = hamilton(ids, quotas, { salt: bill.id || "", tieBreak: bill.tieBreak || "hash", payerId: bill.payerId });
  const maxError = Math.max(...quotas.map((q, i) => Math.abs(q.sub(minor[i]).toNumber())));
  return { shares: ids.map((id, i) => ({ id, minor: minor[i], exact: quotas[i].toString() })), maxError };
};

const byWeights = (T, weights) => {
  const W = sumQ(weights);
  if (W.isZero()) throw new Error("weights sum to zero");
  return weights.map((w) => new Q(T).mul(w).div(W));
};

const rules = {
  equal: (b) => [b.participants, b.participants.map(() => new Q(BigInt(b.total), BigInt(b.participants.length)))],

  exact: (b) => {
    const q = b.amounts.map((a) => new Q(BigInt(a.minor)));
    if (sumQ(q).cmp(new Q(BigInt(b.total))) !== 0) throw new Error("exact amounts must sum to the total exactly");
    return [b.amounts.map((a) => a.id), q];
  },

  percent: (b) => {
    const w = b.percents.map((p) => Q.dec(String(p.percent)));
    if (sumQ(w).cmp(new Q(100n)) !== 0) throw new Error("percentages must sum to exactly 100");
    return [b.percents.map((p) => p.id), byWeights(BigInt(b.total), w)];
  },

  shares: (b) => [b.shares.map((s) => s.id), byWeights(BigInt(b.total), b.shares.map((s) => Q.dec(String(s.shares))))],

  // Fixed extra per person, rest split equally (Splitwise-style "adjustment").
  adjustment: (b) => {
    const ids = b.participants;
    const adj = ids.map((id) => new Q(BigInt(b.adjustments?.[id] ?? 0)));
    const rest = new Q(BigInt(b.total)).sub(sumQ(adj)).div(BigInt(ids.length));
    return [ids, adj.map((a) => a.add(rest))];
  },

  // Cost segments (nights, days, legs) split equally among those present.
  // Equals the Shapley value of the segment cost game.
  segments: (b) => {
    const ids = [...new Set(b.segments.flatMap((s) => s.present))];
    const q = new Map(ids.map((id) => [id, ZERO]));
    let T = ZERO;
    for (const s of b.segments) {
      if (!s.present.length) throw new Error("a segment has nobody present");
      const each = new Q(BigInt(s.cost), BigInt(s.present.length));
      for (const id of s.present) q.set(id, q.get(id).add(each));
      T = T.add(BigInt(s.cost));
    }
    if (T.cmp(new Q(BigInt(b.total))) !== 0) throw new Error("segments must add up to the total");
    return [ids, ids.map((id) => q.get(id))];
  },

  // Shared taxi along one route: riders in drop-off order with the meter
  // reading at their drop. Leg k is shared by everyone still in the car.
  route: (b) => {
    const r = b.riders; // [{id, meter}], meter non-decreasing
    const n = r.length;
    const q = r.map(() => ZERO);
    let prev = 0n;
    for (let k = 0; k < n; k++) {
      const leg = BigInt(r[k].meter) - prev;
      if (leg < 0n) throw new Error("meter readings must not decrease");
      const each = new Q(leg, BigInt(n - k));
      for (let i = k; i < n; i++) q[i] = q[i].add(each);
      prev = BigInt(r[k].meter);
    }
    if (prev !== BigInt(b.total)) throw new Error("last meter reading must equal the fare");
    return [r.map((x) => x.id), q];
  },

  // Itemized receipt with charges. Every person's subtotal is exact; each
  // charge is spread in proportion to the subtotal of the items it applies to
  // (the unique additive rule), flat fees equally, and the printed grand total
  // is authoritative: a small receipt rounding residual is spread pro rata.
  itemized: (b) => {
    const ids = [...new Set([...b.items.flatMap((it) => it.users), ...(b.participants || [])])];
    const base = new Map(ids.map((id) => [id, ZERO]));
    const itemShare = b.items.map((it) => {
      if (!it.users.length) throw new Error(`nobody picked "${it.name}"`);
      const w = it.weights ? it.users.map((u) => Q.dec(String(it.weights[u] ?? 1))) : it.users.map(() => new Q(1n));
      const parts = byWeights(BigInt(it.minor), w);
      const m = new Map(it.users.map((u, i) => [u, parts[i]]));
      for (const [u, p] of m) base.set(u, base.get(u).add(p));
      return m;
    });
    const q = new Map(base);
    for (const c of b.charges || []) {
      const applies = c.appliesTo ? c.appliesTo : b.items.map((_, i) => i);
      const sub = new Map(ids.map((id) => [id, ZERO]));
      for (const i of applies) for (const [u, p] of itemShare[i]) sub.set(u, sub.get(u).add(p));
      const S = sumQ([...sub.values()]);
      const amount = c.rate !== undefined ? S.mul(Q.dec(String(c.rate))).div(100n) : new Q(BigInt(c.minor));
      const signed = c.kind === "discount" ? amount.mul(-1n) : amount;
      if (c.kind === "discount" && amount.cmp(S) > 0) throw new Error("discount larger than the items it applies to");
      if (c.basis === "equal") {
        const who = c.kind === "fee" && b.participants ? b.participants : ids;
        for (const id of who) q.set(id, q.get(id).add(signed.div(BigInt(who.length))));
      } else {
        if (S.isZero()) continue;
        for (const id of ids) q.set(id, q.get(id).add(signed.mul(sub.get(id)).div(S)));
      }
    }
    const computed = sumQ([...q.values()]);
    const residual = new Q(BigInt(b.total)).sub(computed);
    const tol = BigInt(b.toleranceMinor ?? Math.max(2, b.items.length + (b.charges || []).length));
    if (residual.cmp(new Q(tol)) > 0 || residual.cmp(new Q(-tol)) < 0)
      throw new Error(`items and charges differ from the bill total by ${residual.toNumber().toFixed(2)} minor units`);
    if (!residual.isZero()) for (const id of ids) q.set(id, q.get(id).add(residual.mul(q.get(id)).div(computed)));
    return [ids, ids.map((id) => q.get(id))];
  },
};

/** Split one bill. `bill.total` is in minor units (BigInt or integer). */
export const split = (bill) => {
  const rule = rules[bill.type];
  if (!rule) throw new Error(`unknown split type ${bill.type}`);
  const [ids, quotas] = rule(bill);
  if (new Set(ids.map(String)).size !== ids.length) throw new Error("a person appears twice");
  return finalize(bill, ids, quotas);
};

/** Prorate a recurring amount by days present in the period. */
export const prorate = (total, periods, opts = {}) =>
  finalize({ total, ...opts }, periods.map((p) => p.id), byWeights(BigInt(total), periods.map((p) => new Q(BigInt(p.days)))));

/* ================================ ledger ================================= */
// Multi-payer bills: net_i = paid_i - share_i. Returns Map id -> BigInt.
export const netBalances = (entries) => {
  const net = new Map();
  const bump = (id, v) => net.set(id, (net.get(id) || 0n) + v);
  for (const e of entries) {
    const paid = e.payers.reduce((a, p) => a + BigInt(p.minor), 0n);
    const owed = e.shares.reduce((a, s) => a + BigInt(s.minor), 0n);
    if (paid !== owed) throw new Error(`entry ${e.id || ""}: paid ${paid} != shares ${owed}`);
    for (const p of e.payers) bump(p.id, BigInt(p.minor));
    for (const s of e.shares) bump(s.id, -BigInt(s.minor));
  }
  return net;
};

/* ============================== settlement =============================== */
export const EXACT_LIMIT = 20; // exact DP up to this many unsettled people (timed in bench)

const clearGroup = (members, out) => {
  // Debtors only pay, creditors only receive: total money moved is minimal
  // (= sum of positive balances) and a k-group uses at most k-1 transfers.
  const by = (a, b) => (b.v > a.v ? 1 : b.v < a.v ? -1 : a.id < b.id ? -1 : 1);
  const cr = members.filter((m) => m.v > 0n).map((m) => ({ ...m })).sort(by);
  const db = members.filter((m) => m.v < 0n).map((m) => ({ ...m, v: -m.v })).sort(by);
  let i = 0, j = 0;
  while (i < db.length && j < cr.length) {
    const pay = db[i].v < cr[j].v ? db[i].v : cr[j].v;
    out.push({ from: db[i].id, to: cr[j].id, minor: pay });
    db[i].v -= pay; cr[j].v -= pay;
    if (db[i].v === 0n) i++;
    if (cr[j].v === 0n) j++;
  }
};

// Max number of disjoint zero-sum groups, exact, O(n 2^n) time, O(2^n) memory.
const exactGroups = (items) => {
  const n = items.length, size = 1 << n;
  const vals = items.map((x) => Number(x.v)); // |balances| < 2^53 checked by caller
  const sum = new Float64Array(size);
  const dp = new Int8Array(size), choice = new Int8Array(size);
  for (let m = 1; m < size; m++) {
    const low = m & -m, bit = 31 - Math.clz32(low);
    sum[m] = sum[m ^ low] + vals[bit];
    let best = -1, bi = 0;
    for (let i = 0; i < n; i++) if (m & (1 << i)) { const v = dp[m ^ (1 << i)]; if (v > best) { best = v; bi = i; } }
    dp[m] = best + (sum[m] === 0 ? 1 : 0);
    choice[m] = bi;
  }
  const order = [];
  for (let m = size - 1; m; m ^= 1 << choice[m]) order.push(choice[m]);
  order.reverse();
  const groups = []; let cur = [], acc = 0;
  for (const i of order) { cur.push(items[i]); acc += vals[i]; if (acc === 0) { groups.push(cur); cur = []; } }
  return groups;
};

// Heuristic for large groups: pack small zero-sum groups (size 3 and 4 via a
// pair-sum index), leftovers form one group. Not guaranteed optimal
// (Verhoeff 2004 shows greedy small-group packing can fail).
const packSmall = (items, groups) => {
  let rest = items.slice();
  for (let changed = true; changed && rest.length >= 3;) {
    changed = false;
    const byVal = new Map();
    rest.forEach((x, i) => { const k = String(x.v); if (!byVal.has(k)) byVal.set(k, []); byVal.get(k).push(i); });
    let hit = null;
    search: for (let a = 0; a < rest.length; a++) for (let c = a + 1; c < rest.length; c++) {
      const need = String(-(rest[a].v + rest[c].v));
      for (const k of byVal.get(need) || []) if (k !== a && k !== c) { hit = [a, c, k]; break search; }
    }
    if (!hit && rest.length >= 4 && rest.length <= 400) {
      const pairs = new Map();
      for (let a = 0; a < rest.length && !hit; a++) for (let c = a + 1; c < rest.length; c++) {
        const s = rest[a].v + rest[c].v, need = String(-s);
        for (const [x, y] of pairs.get(need) || []) if (x !== a && x !== c && y !== a && y !== c) { hit = [x, y, a, c]; break; }
        if (hit) break;
        const k = String(s); if (!pairs.has(k)) pairs.set(k, []); if (pairs.get(k).length < 4) pairs.get(k).push([a, c]);
      }
    }
    if (hit) { groups.push(hit.map((i) => rest[i])); const drop = new Set(hit); rest = rest.filter((_, i) => !drop.has(i)); changed = true; }
  }
  return rest;
};

/**
 * Minimum-transfer settlement.
 * @param {Map<string,bigint>|Record<string,bigint|number>} balances (+ is owed)
 * @returns {{transfers:{from,to,minor}[], optimal:boolean, lowerBound:number, groups:string[][]}}
 */
export const settle = (balances) => {
  const entries = balances instanceof Map ? [...balances] : Object.entries(balances);
  const items = entries.map(([id, v]) => ({ id: String(id), v: BigInt(v) })).filter((x) => x.v !== 0n)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (items.reduce((a, x) => a + x.v, 0n) !== 0n) throw new Error("balances do not sum to zero");
  // The exact DP sums subsets in doubles; every subset sum is exact iff
  // sum |b_i| <= 2^53 (a per-balance bound is NOT enough for 20 members).
  const absSum = items.reduce((a, x) => a + (x.v < 0n ? -x.v : x.v), 0n);
  if (absSum > 2n ** 53n) throw new Error("balances too large for exact settlement");

  const groups = [];
  // 1. exact opposite pairs: always part of some optimal plan (exchange argument)
  const waiting = new Map(); const rest = [];
  for (const x of items) {
    const opp = waiting.get(String(-x.v));
    if (opp?.length) groups.push([opp.pop(), x]);
    else { const k = String(x.v); if (!waiting.has(k)) waiting.set(k, []); waiting.get(k).push(x); }
  }
  for (const list of waiting.values()) rest.push(...list);
  // 2. exact DP when small enough, else small-group packing
  let optimal = true, left = rest;
  if (left.length > EXACT_LIMIT) { optimal = false; left = packSmall(left, groups); }
  if (left.length > EXACT_LIMIT) groups.push(left);
  else if (left.length) groups.push(...exactGroups(left));

  let transfers = [];
  for (const g of groups) clearGroup(g, transfers);
  // Independent check; on any failure fall back to the plain greedy plan.
  if (!verify(new Map(items.map((x) => [x.id, x.v])), transfers)) {
    transfers = [];
    clearGroup(items, transfers);
    optimal = false;
  }
    const n = items.length;
  // Lower bound: every creditor receives and every debtor pays at least once.
  const nPos = items.filter((x) => x.v > 0n).length;
  const lowerBound = optimal ? transfers.length : Math.max(nPos, n - nPos);
  return { transfers, optimal, lowerBound, groups: groups.map((g) => g.map((x) => x.id)) };
};

/** Independent check: positive integer transfers that clear every balance. */
export const verify = (balances, transfers) => {
  const entries = balances instanceof Map ? [...balances] : Object.entries(balances);
  const net = new Map(entries.map(([id, v]) => [String(id), BigInt(v)]));
  for (const t of transfers) {
    if (typeof t.minor !== "bigint" || t.minor <= 0n || t.from === t.to) return false;
    net.set(t.from, (net.get(t.from) || 0n) + t.minor);
    net.set(t.to, (net.get(t.to) || 0n) - t.minor);
  }
  return [...net.values()].every((v) => v === 0n);
};

/** Baseline for comparison: largest debtor pays largest creditor. */
export const settleGreedy = (balances) => {
  const entries = balances instanceof Map ? [...balances] : Object.entries(balances);
  const all = entries.map(([id, v]) => ({ id: String(id), v: BigInt(v) })).filter((x) => x.v !== 0n);
  const out = [];
  clearGroup(all, out);
  return out;
};
