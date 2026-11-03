import User from "../../models/userModel.js";
import UserProfile from "../../models/userProfileModel.js";
import Group from "../../models/groupModel.js";
import { sendEngagementNotifications } from "../../controllers/notificationController.js";
import { EngagementSend, EngagementState } from "./models.js";
import { dueSlots, istDayKey } from "./schedule.js";
import { messageFor, inHoldout } from "./copy.js";
import { audienceFilter } from "./audience.js";
import { RULES, assetOrigin } from "./config.js";
import { isEnabled } from "./models.js";

const BATCH = 500;
const DAY_MS = 86400_000;

const defaults = () => ({ ...RULES, assetOrigin: assetOrigin() });

// The group a tip is about: for the new-month reminder, the person's most recently active
// flat (roommate) group; for the weekend nudge, their most recently active group of any kind
// except business. One indexed query per batch ({members, updatedAt}).
export async function relevantGroups(userIds, campaign) {
  const rows = await Group.find({ members: { $in: userIds }, isCompleted: { $ne: true }, ...(campaign === "monthly" ? { groupType: "roommate" } : { groupType: { $ne: "business" } }) })
    .select("_id name members").sort({ updatedAt: -1 }).limit(userIds.length * 4).lean();
  const wanted = new Set(userIds.map(String));
  const pick = new Map();
  for (const g of rows) for (const m of g.members) {
    const id = String(m);
    if (wanted.has(id) && !pick.has(id)) pick.set(id, g);
  }
  return pick;
}

// Bulk writes report per-row duplicate-key failures instead of failing the batch.
async function bulk(model, ops) {
  if (!ops.length) return { upserted: new Set(), duplicates: new Set() };
  try {
    const res = await model.bulkWrite(ops, { ordered: false });
    return { upserted: new Set(Object.keys(res.upsertedIds || {}).map(Number)), duplicates: new Set() };
  } catch (err) {
    const errors = err.writeErrors || [];
    if (!errors.length || errors.some(e => (e.code ?? e.err?.code) !== 11000)) throw err;
    return { upserted: new Set(Object.keys(err.result?.upsertedIds || err.result?.result?.upsertedIds || {}).map(Number)), duplicates: new Set(errors.map(e => e.index)) };
  }
}

/*
 * One campaign slot, in batches of BATCH users. Cost per person (N = collection size):
 *  - claim the (slot, person) row:   one unique-index upsert, O(log N). Retries, restarts and
 *    other servers hit the same row, so nobody is sent a slot twice.
 *  - frequency cap:                  one conditional upsert on the person's state document,
 *    O(log N). The document holds their last tip day and up to `per30Days` recent send times,
 *    so "1 a day, 5 in 30 days" is checked and recorded in a single atomic write, with no
 *    history scan and no race between campaigns.
 *  - trip suppression, profile city: one indexed lookup per batch, O(k log N).
 * The whole run is O(n log N) for n recipients, which is the floor: everyone needs a message.
 */
export async function sendSlot(slot, { now = new Date(), cfg: overrides = {}, send = sendEngagementNotifications } = {}) {
  const cfg = { ...defaults(), ...overrides };
  const day = istDayKey(now);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const startedAt = Date.now();
  const stats = { slot: slot.key, sent: 0, holdout: 0, capped: 0, already: 0, suppressed: 0, stoppedEarly: false };
  let lastId = null;
  for (;;) {
    // A very large audience must not spill past the send window into quiet hours.
    if (slot.until && now.getTime() + (Date.now() - startedAt) >= slot.until.getTime()) { stats.stoppedEarly = true; break; }
    const audience = audienceFilter(now, cfg);
    if (lastId) audience._id = { ...audience._id, $gt: lastId };
    const users = await User.find(audience).select("_id name").sort({ _id: 1 }).limit(BATCH).lean();
    if (!users.length) break;
    lastId = users.at(-1)._id;

    // Someone who already set up a trip this season doesn't need to be told to plan one.
    let eligible = users;
    if (slot.campaign === "trip") {
      const planning = new Set((await Group.find({ members: { $in: users.map(u => u._id) }, groupType: "trip", createdAt: { $gte: new Date(now.getTime() - 45 * DAY_MS) } }).select("members").lean()).flatMap(g => g.members.map(String)));
      eligible = users.filter(u => !planning.has(String(u._id)));
      stats.suppressed += users.length - eligible.length;
    }
    if (!eligible.length) continue;
    const profiles = slot.campaign === "trip"
      ? new Map((await UserProfile.find({ userId: { $in: eligible.map(u => u._id) } }).select("userId city state").lean()).map(p => [String(p.userId), p]))
      : new Map();
    const groups = slot.campaign === "trip" ? new Map() : await relevantGroups(eligible.map(u => u._id), slot.campaign);
    const planned = eligible.map(u => ({ user: u, msg: messageFor(slot, u, profiles.get(String(u._id)), groups.get(String(u._id))), holdout: inHoldout(u._id, slot.key, cfg.holdoutPct) }));

    // 1. Claim (slot, person). Only rows inserted by this call go further.
    const claim = await bulk(EngagementSend, planned.map(p => ({
      updateOne: { filter: { key: slot.key, userId: p.user._id }, update: { $setOnInsert: { campaign: slot.campaign, day, variant: p.msg.variant, personalised: p.msg.personalised, status: p.holdout ? "holdout" : "claimed", createdAt: now } }, upsert: true },
    })));
    const claimed = planned.filter((_, i) => claim.upserted.has(i));
    stats.already += planned.length - claimed.length;
    stats.holdout += claimed.filter(p => p.holdout).length;
    const candidates = claimed.filter(p => !p.holdout);
    if (!candidates.length) continue;

    // 2. Frequency cap, atomically. The filter only matches when today is free and the
    //    oldest of the last `per30Days` sends is over 30 days old; otherwise the upsert
    //    collides with the existing document and that person is capped.
    const full = `recent.${cfg.per30Days - 1}`;
    const cap = await bulk(EngagementState, candidates.map(p => ({
      updateOne: {
        filter: { _id: p.user._id, lastDay: { $ne: day }, $or: [{ [full]: { $exists: false } }, { "recent.0": { $lt: monthAgo } }] },
        update: { $set: { lastDay: day }, $push: { recent: { $each: [now], $sort: 1, $slice: -cfg.per30Days } } },
        upsert: true,
      },
    })));
    const capped = candidates.filter((_, i) => cap.duplicates.has(i));
    const toSend = candidates.filter((_, i) => !cap.duplicates.has(i));
    stats.capped += capped.length;
    if (capped.length) await EngagementSend.updateMany({ key: slot.key, userId: { $in: capped.map(p => p.user._id) }, status: "claimed" }, { $set: { status: "capped" } });
    if (!toSend.length) continue;

    // 3. Deliver. A failed batch is marked, never retried, so nobody is spammed by a retry loop.
    const ids = toSend.map(p => p.user._id);
    try {
      await send(toSend.map(({ user, msg }) => ({
        userId: user._id, title: msg.title, body: msg.body, prompt: msg.prompt, groupId: msg.groupId, appLink: msg.appLink, webLink: msg.webLink, cta: msg.cta, campaign: slot.key,
        image: `${cfg.assetOrigin}/notifications/${msg.image}`,
      })));
      await EngagementSend.updateMany({ key: slot.key, userId: { $in: ids }, status: "claimed" }, { $set: { status: "sent" } });
      stats.sent += toSend.length;
    } catch (err) {
      await EngagementSend.updateMany({ key: slot.key, userId: { $in: ids }, status: "claimed" }, { $set: { status: "failed" } });
      console.error(`❌ Tips ${slot.key} batch failed:`, err.message);
    }
  }
  return stats;
}

let running = false;
export async function runDue(now = new Date(), overrides = {}) {
  const cfg = { ...defaults(), ...overrides };
  if (running) return [];
  running = true;
  try {
    // Paused from the admin page: check again next tick.
    if (!(await isEnabled())) return [];
    const out = [];
    for (const slot of dueSlots(now, { tripPerMonth: cfg.tripPerMonth })) {
      const stats = await sendSlot(slot, { now, cfg });
      if (stats.sent || stats.holdout || stats.stoppedEarly) console.log(`📣 Tips ${slot.key}: ${stats.sent} sent, ${stats.holdout} held back, ${stats.capped} capped${stats.stoppedEarly ? ", window closed before everyone was reached" : ""}`);
      out.push(stats);
    }
    return out;
  } finally { running = false; }
}

// Always running (outside tests); checks every 10 minutes whether a send window is open.
export function startEngagementRunner({ intervalMs = 10 * 60_000 } = {}) {
  const tick = () => runDue().catch(err => console.error("❌ Tips runner:", err.message));
  setTimeout(tick, 30_000);
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return timer;
}
