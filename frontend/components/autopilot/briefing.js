// What Autopilot knows about the user the moment it opens: their groups, where
// they stand, and anything waiting on them. Loaded once and shared by the
// launch sequence and the workspace, so the page opens already informed.
import { api } from "@/lib/api";

const TTL_MS = 30_000;
let cache = null;
let loadedAt = 0;

const safe = (url) => api.get(url, { timeout: 12000 }).then((r) => r.data).catch(() => null);

/** { groups, balances, runs, all } - each a promise that resolves to data or null, never rejects. */
export function loadBriefing({ fresh = false } = {}) {
  if (!cache || fresh || Date.now() - loadedAt > TTL_MS) {
    loadedAt = Date.now();
    const groups = safe("/agent/groups");
    const balances = safe("/balances/summary");
    const runs = safe("/agent/runs");
    cache = { groups, balances, runs, all: Promise.all([groups, balances, runs]).then(([g, b, r]) => ({ groups: g, balances: b, runs: r })) };
  }
  return cache;
}
export const resetBriefing = () => { cache = null; loadedAt = 0; };

const WAITING = ["clarification_required", "waiting_approval"];

/** The few facts worth saying out loud, worked out from the raw data. */
export function readBriefing({ groups, balances, runs } = {}) {
  const list = Array.isArray(groups) ? groups : [];
  const per = balances?.perGroup || {};
  const ranked = list.map((g) => ({ group: g, balance: Number(per[g._id]) || 0 }));
  const youOwe = ranked.filter((x) => x.balance < -0.01).sort((a, b) => a.balance - b.balance);
  const owedToYou = ranked.filter((x) => x.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const waiting = (Array.isArray(runs) ? runs : []).filter((r) => WAITING.includes(r.status));
  return {
    groupCount: list.length,
    totalOwed: Number(balances?.totalOwed) || 0,
    totalOwe: Number(balances?.totalOwe) || 0,
    hasBalances: !!balances,
    youOwe,
    owedToYou,
    waiting,
  };
}
