// Live exchange rates from free, key-less APIs, cached in memory.
// Primary: open.er-api.com (all our currencies). Fallback: frankfurter.dev
// (ECB rates - no AED/NPR/LKR/VND). Only codes from SUPPORTED_CURRENCIES are
// ever put into a URL, so a client can't steer the request anywhere else.
import { SUPPORTED_CURRENCIES } from "./groupPresets.js";

const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map(); // base -> { rates, fetchedAt, source }

const fetchJson = async (url) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const loadRates = async (base) => {
  try {
    const data = await fetchJson(`https://open.er-api.com/v6/latest/${base}`);
    if (data?.result === "success" && data.rates) return { rates: data.rates, source: "open.er-api.com" };
  } catch { /* try the fallback */ }
  const data = await fetchJson(`https://api.frankfurter.dev/v1/latest?base=${base}`);
  if (!data?.rates) throw new Error("No rates");
  return { rates: { ...data.rates, [base]: 1 }, source: "frankfurter.dev" };
};

// Returns { rate, source, fetchedAt } for 1 `from` = rate `to`.
export const getRate = async (from, to) => {
  if (!SUPPORTED_CURRENCIES.includes(from) || !SUPPORTED_CURRENCIES.includes(to))
    throw Object.assign(new Error("Unsupported currency."), { status: 400 });
  if (from === to) return { rate: 1, source: "identity", fetchedAt: new Date() };

  let entry = cache.get(from);
  if (!entry || Date.now() - entry.fetchedAt > TTL_MS) {
    try {
      const loaded = await loadRates(from);
      entry = { ...loaded, fetchedAt: Date.now() };
      cache.set(from, entry);
    } catch (err) {
      // Serve a stale rate rather than nothing if the APIs are down.
      if (!entry) throw Object.assign(new Error("Exchange rates are unavailable right now. Enter the rate manually."), { status: 503 });
    }
  }
  const rate = Number(entry.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0)
    throw Object.assign(new Error("No rate for this currency pair. Enter it manually."), { status: 404 });
  return { rate, source: entry.source, fetchedAt: new Date(entry.fetchedAt) };
};

export const _clearFxCache = () => cache.clear();
