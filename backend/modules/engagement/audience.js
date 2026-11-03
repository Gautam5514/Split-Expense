import mongoose from "mongoose";
import { RULES } from "./config.js";

// Who gets tips: hasn't switched them off, has been here a couple of days, and is
// reachable by push or was active recently.
export function audienceFilter(now = new Date(), { requireOptIn = RULES.requireOptIn } = {}) {
  const since = new Date(now.getTime() - RULES.inactiveAfterDays * 86400_000).toISOString().slice(0, 10);
  const settled = mongoose.Types.ObjectId.createFromTime(Math.floor((now.getTime() - RULES.newUserGraceDays * 86400_000) / 1000));
  return {
    "notificationPrefs.engagement": requireOptIn ? true : { $ne: false },
    _id: { $lt: settled },
    $or: [{ "expoPushTokens.0": { $exists: true } }, { "webPushTokens.0": { $exists: true } }, { lastActiveDate: { $gte: since } }],
  };
}
