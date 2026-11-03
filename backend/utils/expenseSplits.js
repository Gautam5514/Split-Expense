import mongoose from "mongoose";

export const buildSplits = ({
  splitType,
  amount,
  participants,
  exactSplits = [],
  percentSplits = [],
  sharesSplits = [],
  items = [],
  payerId = null,   // used to direct rounding drift to the payer
}) => {
  if (!participants?.length) throw new Error("No participants provided.");

  // Rounds each share to paise and puts the leftover paisa on the payer (they
  // already paid the full amount), falling back to the last row.
  const settleDrift = (splits) => {
    const sum = splits.reduce((a, s) => a + s.share, 0);
    const drift = Number((amount - sum).toFixed(2));
    if (!drift || !splits.length) return splits;
    const payerIdx = payerId
      ? splits.findIndex((s) => String(s.userId) === String(payerId) && s.share > 0)
      : -1;
    const idx = payerIdx >= 0 ? payerIdx : splits.length - 1;
    splits[idx].share = Number((splits[idx].share + drift).toFixed(2));
    return splits;
  };

  if (splitType === "equal") {
    const share = Number((amount / participants.length).toFixed(2));
    const splits = participants.map((uid) => ({ userId: uid, share }));
    const sum = splits.reduce((a, s) => a + s.share, 0);
    const drift = Number((amount - sum).toFixed(2));
    // Apply drift to payer's entry (they already paid the full amount so absorb rounding).
    // Fall back to last entry if payer is not a participant.
    const driftIdx = payerId
      ? splits.findIndex((s) => String(s.userId) === String(payerId))
      : -1;
    const target = driftIdx >= 0 ? driftIdx : splits.length - 1;
    splits[target].share = Number((splits[target].share + drift).toFixed(2));
    return splits;
  }

  // Shared guards for client-supplied split rows. Without these, an "exact"
  // split of 100 could be sent as { victim: 200, attacker: -100 } - it sums to
  // 100 so it passed, but it silently doubled the victim's debt. NaN values
  // also slipped through because `Math.abs(NaN - x) > 0.01` is false.
  const validateRows = (rows, key, label) => {
    if (!Array.isArray(rows) || rows.length === 0)
      throw new Error(`${label} splits are required.`);
    const set = new Set(participants.map(String));
    const seen = new Set();
    for (const row of rows) {
      const id = String(row?.userId ?? "");
      if (!set.has(id)) throw new Error(`${label} split contains non-participant.`);
      if (seen.has(id)) throw new Error(`${label} split lists the same member twice.`);
      seen.add(id);
      const value = Number(row[key]);
      if (!Number.isFinite(value) || value < 0)
        throw new Error(`${label} split values must be zero or positive numbers.`);
    }
  };

  if (splitType === "exact") {
    validateRows(exactSplits, "share", "Exact");
    const total = Number(
      exactSplits.reduce((a, s) => a + Number(s.share), 0).toFixed(2)
    );
    if (Math.abs(total - amount) > 0.01)
      throw new Error("Exact splits must sum to total amount.");
    return exactSplits.map((s) => ({
      userId: new mongoose.Types.ObjectId(String(s.userId)),
      share: Number(Number(s.share).toFixed(2)),
    }));
  }

  if (splitType === "percent") {
    validateRows(percentSplits, "percent", "Percent");
    const totalPct = percentSplits.reduce((a, s) => a + Number(s.percent), 0);
    if (Math.abs(totalPct - 100) > 0.01)
      throw new Error("Percent splits must sum to 100%.");
    let splits = percentSplits.map((s) => ({
      userId: new mongoose.Types.ObjectId(String(s.userId)),
      share: Number(((amount * Number(s.percent)) / 100).toFixed(2)),
    }));
    const sum = splits.reduce((a, s) => a + s.share, 0);
    const drift = Number((amount - sum).toFixed(2));
    splits[splits.length - 1].share = Number(
      (splits[splits.length - 1].share + drift).toFixed(2)
    );
    return splits;
  }

  if (splitType === "shares") {
    validateRows(sharesSplits, "shares", "Shares");
    const totalShares = sharesSplits.reduce((a, s) => a + Number(s.shares), 0);
    if (!(totalShares > 0)) throw new Error("At least one person needs a share.");
    const splits = sharesSplits
      .filter((s) => Number(s.shares) > 0)
      .map((s) => ({
        userId: new mongoose.Types.ObjectId(String(s.userId)),
        share: Number(((amount * Number(s.shares)) / totalShares).toFixed(2)),
      }));
    return settleDrift(splits);
  }

  if (splitType === "itemized") {
    if (!Array.isArray(items) || items.length === 0)
      throw new Error("Add at least one item.");
    if (items.length > 100) throw new Error("A bill can have at most 100 items.");
    const set = new Set(participants.map(String));
    const perUser = new Map();
    let itemsTotal = 0;
    for (const item of items) {
      const value = Number(item?.amount);
      if (!Number.isFinite(value) || value < 0)
        throw new Error("Item amounts must be zero or positive numbers.");
      const ids = [...new Set((item?.userIds || []).map(String))];
      if (!ids.length) throw new Error(`Pick who shared "${item?.name || "an item"}".`);
      if (ids.some((id) => !set.has(id))) throw new Error("Item split contains non-participant.");
      itemsTotal += value;
      for (const id of ids) perUser.set(id, (perUser.get(id) || 0) + value / ids.length);
    }
    if (Math.abs(Number(itemsTotal.toFixed(2)) - amount) > 0.01)
      throw new Error("Items must add up to the total amount.");
    const splits = [...perUser.entries()].map(([id, share]) => ({
      userId: new mongoose.Types.ObjectId(id),
      share: Number(share.toFixed(2)),
    }));
    return settleDrift(splits);
  }

  throw new Error("Invalid splitType.");
};
