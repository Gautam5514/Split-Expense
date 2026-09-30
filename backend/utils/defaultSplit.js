import mongoose from "mongoose";
import { buildSplits } from "../controllers/expenseController.js";

/**
 * How a group splits an expense when the client doesn't say: the split
 * chosen when the group was created (Group settings -> Default split).
 *  - equal:   everyone equally
 *  - shares:  by each member's shares; anyone without a saved share counts
 *             as 1 (e.g. someone who joined later)
 *  - percent: by saved percentages, only if they cover every participant
 *             and add up to 100 - otherwise equal
 */
export const defaultSplitFor = (group, participantIds, amount, payerId) => {
  const ids = participantIds.map(String);
  const participants = ids.map((id) => new mongoose.Types.ObjectId(id));
  const ds = group.settings?.defaultSplit;
  const weights = new Map((ds?.weights || []).map((w) => [String(w.userId), Number(w.value) || 0]));

  try {
    if (ds?.type === "shares") {
      const sharesSplits = ids.map((id) => ({ userId: id, shares: weights.has(id) ? weights.get(id) : 1 }));
      if (sharesSplits.some((s) => s.shares > 0)) {
        return { splitType: "shares", splits: buildSplits({ splitType: "shares", amount, participants, payerId, sharesSplits }) };
      }
    }
    if (ds?.type === "percent" && ids.every((id) => weights.has(id))) {
      const percentSplits = ids.map((id) => ({ userId: id, percent: weights.get(id) }));
      const total = percentSplits.reduce((a, p) => a + p.percent, 0);
      if (Math.abs(total - 100) < 0.01) {
        return { splitType: "percent", splits: buildSplits({ splitType: "percent", amount, participants, payerId, percentSplits }) };
      }
    }
  } catch {
    // fall through to equal
  }
  return { splitType: "equal", splits: buildSplits({ splitType: "equal", amount, participants, payerId }) };
};
