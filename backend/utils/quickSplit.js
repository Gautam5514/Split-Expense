// Pure split maths for Quick Split, kept separate so it can be unit-tested
// without a DB. All money is handled in paise (integer) internally to avoid
// floating-point drift, then converted back to rupees with 2 decimals.

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Split `total` equally across `count` people, distributing the leftover paise
 * so the shares always add back up to exactly `total`. The first
 * `remainder` people pay 1 paisa more than the rest.
 * Returns an array of `count` numbers (rupees, 2dp).
 */
export const splitEqual = (total, count) => {
  const paise = Math.round(Number(total) * 100);
  const base = Math.floor(paise / count);
  const remainder = paise - base * count; // 0..count-1 extra paise
  return Array.from({ length: count }, (_, i) => round2((base + (i < remainder ? 1 : 0)) / 100));
};

/**
 * Validate the participants for a Quick Split and return normalized
 * participant docs ({ name, share }), or { error } describing the first
 * problem. `splitType` is "equal" | "custom".
 *
 * Two ways to describe an equal split:
 *   - peopleCount: N     → anonymous "Person 1..N" (the +/- counter UI)
 *   - participants: [..] → named people (legacy / custom amounts)
 *
 * - equal:  shares are computed from the total (custom `share` values ignored).
 * - custom: every participant must carry a numeric share >= 0, and the shares
 *           must sum to the total within a 1-rupee tolerance (rounding slack).
 */
export const buildParticipants = ({ totalAmount, splitType, participants, peopleCount }) => {
  const total = Number(totalAmount);
  if (!Number.isFinite(total) || total < 0.01)
    return { error: "Enter a valid total amount." };
  if (total > 10_000_000) return { error: "That amount is too large." };

  // Counter-based equal split: no names, just a headcount.
  if (splitType !== "custom" && (participants === undefined || participants === null)) {
    const count = Number(peopleCount);
    if (!Number.isInteger(count) || count < 1)
      return { error: "Choose at least one person." };
    if (count > 50) return { error: "A quick split can have at most 50 people." };
    const shares = splitEqual(total, count);
    return {
      participants: shares.map((share, i) => ({ name: `Person ${i + 1}`, share })),
    };
  }

  if (!Array.isArray(participants) || participants.length < 1)
    return { error: "Add at least one person to split with." };
  if (participants.length > 50)
    return { error: "A quick split can have at most 50 people." };

  const names = participants.map((p, i) => {
    const raw = String(p?.name ?? "").trim();
    return raw || `Person ${i + 1}`;
  });
  if (names.some((n) => n.length > 60)) return { error: "Names must be under 60 characters." };

  if (splitType === "custom") {
    const shares = participants.map((p) => Number(p?.share));
    if (shares.some((s) => !Number.isFinite(s) || s < 0))
      return { error: "Each person's amount must be zero or more." };
    const sum = round2(shares.reduce((a, s) => a + s, 0));
    if (Math.abs(sum - round2(total)) > 1)
      return { error: `Custom amounts add up to ${sum}, but the total is ${round2(total)}.` };
    return {
      participants: names.map((name, i) => ({ name, share: round2(shares[i]) })),
    };
  }

  // equal (named)
  const shares = splitEqual(total, participants.length);
  return { participants: names.map((name, i) => ({ name, share: shares[i] })) };
};

export { round2 };
