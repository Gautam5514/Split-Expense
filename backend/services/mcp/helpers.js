// Shared result/format helpers for the MCP tools.
//
// Results stay a single JSON text block (what every MCP client renders and
// what the tests parse). Write tools add a one-line `summary` the assistant
// can repeat to the user as-is.

export const ok = (data) => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

export const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

/**
 * Unexpected failure: log the real error server-side, tell the client only a
 * generic message (Mongo/Mongoose errors can leak schema + internals).
 */
export const internalFail = (tool, e) => {
  console.error(`❌ MCP tool ${tool} failed:`, e?.message || e);
  return fail("Something went wrong while running this tool. Please try again.");
};

export const round2 = (n) => Number(Number(n || 0).toFixed(2));

const SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
/** "₹1,250.50" / "AED 40" - readable money for summaries. */
export const money = (amount, currency = "INR") => {
  const n = round2(amount);
  const text = n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const sym = SYMBOLS[currency];
  return sym ? `${sym}${text}` : `${currency} ${text}`;
};

export const currencyOf = (group) => group?.settings?.currency || "INR";

/** Short, stable shape for a person in tool output. */
export const person = (m) => (m ? { id: String(m._id ?? m.id ?? m), name: m.name, email: m.email } : null);

// Tool annotations: let ChatGPT / Claude decide when to ask before running.
export const READ = { readOnlyHint: true, openWorldHint: false };
export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
export const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true };
export const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

/** Normalised text for matching names: case, accents, punctuation and spacing don't matter. */
export const normText = (s) => {
  const raw = String(s ?? "").trim().toLowerCase();
  const clean = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}@.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || raw.replace(/\s+/g, " ");
};

/**
 * Edit distance where a swapped pair of letters ("Farha" / "Farah") counts as
 * one typo. Gives up (returns max + 1) once it exceeds `max`.
 */
export const editDistance = (a, b, max = 2) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prevPrev && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prevPrev[j - 2] + 1);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length];
};

/** How many typos we forgive for a word of this length (none for very short ones). */
export const typoBudget = (q) => (q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0);

/** Reject after `ms` so one slow dependency can't hang the assistant's turn. */
export const withTimeout = (promise, ms, onTimeout) => {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(onTimeout()), ms);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Per-user sliding-window limiter for write tools. A looping agent is the
 * realistic failure here: this stops it after a burst instead of letting it
 * add hundreds of bills (and notifications) to a group.
 */
export function createWriteLimiter({ limit = 60, windowMs = 60_000, maxUsers = 5000 } = {}) {
  const hits = new Map(); // uid -> timestamps
  return {
    take(uid, now = Date.now()) {
      const list = (hits.get(uid) || []).filter((t) => now - t < windowMs);
      if (list.length >= limit) {
        hits.set(uid, list);
        return { ok: false, retryInSec: Math.max(1, Math.ceil((windowMs - (now - list[0])) / 1000)) };
      }
      list.push(now);
      hits.delete(uid); // re-insert so the Map stays ordered by recency
      hits.set(uid, list);
      if (hits.size > maxUsers) hits.delete(hits.keys().next().value);
      return { ok: true };
    },
    reset() { hits.clear(); },
  };
}

/** One CSV cell, quoted when needed; leading = + - @ are neutralised so a sheet never runs them as formulas. */
export const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
