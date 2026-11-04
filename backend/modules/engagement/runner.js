import User from "../../models/userModel.js";
import UserProfile from "../../models/userProfileModel.js";
import Group from "../../models/groupModel.js";
import { sendEngagementNotifications } from "../../controllers/notificationController.js";
import { EngagementSend, EngagementState, Broadcast, getSettings } from "./models.js";
import { dueSlots, istDayKey } from "./schedule.js";
import { messageFor, inHoldout } from "./copy.js";
import { audienceFilter } from "./audience.js";
import { audienceExtra, FETCHERS } from "./behaviour.js";
import { inScope } from "./festivals.js";
import { RULES, assetOrigin, tierOf } from "./config.js";

const BATCH = 500;
const DAY_MS = 86400_000;

const defaults = () => ({ ...RULES, assetOrigin: assetOrigin() });

// The group a tip is about: for the new-month reminder, the person's most recently active
// flat (roommate) group; for the weekend nudge, their most recently active group of any kind
// except business; for a festival, any active group. One indexed query per batch ({members, updatedAt}).
export async function relevantGroups(userIds, campaign) {
  const type = campaign === "monthly" ? { groupType: "roommate" } : { groupType: { $ne: "business" } };
  const rows = await Group.find({ members: { $in: userIds }, isCompleted: { $ne: true }, ...type })
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

const needsProfile = (slot) => slot.campaign === "trip" || slot.campaign === "longweekend" || (slot.campaign === "festival" && slot.festival.states);
const needsGroup = (slot) => ["monthly", "weekend", "festival"].includes(slot.campaign);

/*
 * One campaign slot, in batches of BATCH users. Cost per person (N = collection size):
 *  - claim the (slot, person) row:   one unique-index upsert, O(log N). Retries, restarts and
 *    other servers hit the same row, so nobody is sent a slot twice.
 *  - fatigue check:                  one indexed lookup per batch on the person's state document.
 *  - frequency cap:                  one conditional upsert on the person's state document,
 *    O(log N). The document holds their last tip day and the last few send times, so
 *    "1 a day, 4 a week, 12 in 30 days" is checked and recorded in a single atomic write,
 *    with no history scan and no race between campaigns.
 *  - personal data, profile, group:  one indexed query per batch, O(k log N).
 * The whole run is O(n log N) for n recipients, which is the floor: everyone needs a message.
 */
export async function sendSlot(slot, { now = new Date(), cfg: overrides = {}, send = sendEngagementNotifications } = {}) {
  const cfg = { ...defaults(), ...overrides };
  const tier = tierOf(slot.campaign);
  const day = istDayKey(now);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const startedAt = Date.now();
  const stats = { slot: slot.key, campaign: slot.campaign, sent: 0, holdout: 0, capped: 0, fatigued: 0, already: 0, suppressed: 0, stoppedEarly: false };
  const memo = new Map(); // settle-up: group balances computed once per run
  let lastId = null;
  for (;;) {
    // A very large audience must not spill past the send window into quiet hours.
    if (slot.until && now.getTime() + (Date.now() - startedAt) >= slot.until.getTime()) { stats.stoppedEarly = true; break; }
    const audience = { ...audienceFilter(now, cfg), ...(slot.broadcast ? broadcastAudience(slot.broadcast, now) : audienceExtra(slot.campaign, now, cfg)) };
    if (lastId) audience._id = { ...audience._id, $gt: lastId };
    const users = await User.find(audience).select("_id name lastActiveDate").sort({ _id: 1 }).limit(BATCH).lean();
    if (!users.length) break;
    lastId = users.at(-1)._id;

    let eligible = users;
    // Someone who already set up a trip this season doesn't need to be told to plan one.
    if (slot.campaign === "trip" || slot.campaign === "longweekend") {
      const planning = new Set((await Group.find({ members: { $in: users.map(u => u._id) }, groupType: "trip", createdAt: { $gte: new Date(now.getTime() - 45 * DAY_MS) } }).select("members").lean()).flatMap(g => g.members.map(String)));
      eligible = users.filter(u => !planning.has(String(u._id)));
    }
    const profiles = needsProfile(slot)
      ? new Map((await UserProfile.find({ userId: { $in: eligible.map(u => u._id) } }).select("userId city state").lean()).map(p => [String(p.userId), p]))
      : new Map();
    // Regional festivals only reach people whose profile places them in the region.
    if (slot.campaign === "festival" && slot.festival.states) eligible = eligible.filter(u => inScope(slot.festival, profiles.get(String(u._id))));
    // Personal nudges need something to say; the fetcher decides who has it.
    const data = FETCHERS[slot.campaign] ? await FETCHERS[slot.campaign](eligible, now, { cfg, memo }) : new Map();
    if (FETCHERS[slot.campaign]) eligible = eligible.filter(u => data.has(String(u._id)));
    stats.suppressed += users.length - eligible.length;
    if (!eligible.length) continue;
    const groups = needsGroup(slot) ? await relevantGroups(eligible.map(u => u._id), slot.campaign) : new Map();
    const planned = eligible.map(u => ({
      user: u,
      msg: messageFor(slot, u, profiles.get(String(u._id)), groups.get(String(u._id)), data.get(String(u._id)) || {}),
      holdout: tier !== "broadcast" && inHoldout(u._id, slot.key, cfg.holdoutPct),
    }));

    // 1. Claim (slot, person). Only rows inserted by this call go further.
    const claim = await bulk(EngagementSend, planned.map(p => ({
      updateOne: { filter: { key: slot.key, userId: p.user._id }, update: { $setOnInsert: { campaign: slot.campaign, day, variant: p.msg.variant, personalised: p.msg.personalised, status: p.holdout ? "holdout" : "claimed", createdAt: now } }, upsert: true },
    })));
    const claimed = planned.filter((_, i) => claim.upserted.has(i));
    stats.already += planned.length - claimed.length;
    stats.holdout += claimed.filter(p => p.holdout).length;
    let candidates = claimed.filter(p => !p.holdout);
    if (!candidates.length) continue;

    // 2. Fatigue. Generic nudges stop for anyone who ignored the last few tips; festival
    //    greetings and messages about their own money still go, so the person is never lost.
    if (tier === "generic" && cfg.fatigueAfter > 0) {
      const tired = new Set((await EngagementState.find({ _id: { $in: candidates.map(p => p.user._id) }, streak: { $gte: cfg.fatigueAfter } }).select("_id").lean()).map(s => String(s._id)));
      const skipped = candidates.filter(p => tired.has(String(p.user._id)));
      candidates = candidates.filter(p => !tired.has(String(p.user._id)));
      stats.fatigued += skipped.length;
      if (skipped.length) await EngagementSend.updateMany({ key: slot.key, userId: { $in: skipped.map(p => p.user._id) }, status: "claimed" }, { $set: { status: "fatigued" } });
      if (!candidates.length) continue;
    }

    // 3. Frequency cap, atomically. The filter only matches when today is free, the oldest of
    //    the last `per7Days` sends is over a week old and the oldest of the last `per30Days`
    //    is over 30 days old; otherwise the upsert collides with the existing document and
    //    that person is capped. Broadcasts marked ignoreCaps skip the day/week check.
    const ignore = Boolean(slot.broadcast?.ignoreCaps);
    const cap = await bulk(EngagementState, candidates.map(p => ({
      updateOne: {
        filter: ignore ? { _id: p.user._id } : {
          _id: p.user._id, lastDay: { $ne: day },
          $and: [
            { $or: [{ [`week.${cfg.per7Days - 1}`]: { $exists: false } }, { "week.0": { $lt: weekAgo } }] },
            { $or: [{ [`recent.${cfg.per30Days - 1}`]: { $exists: false } }, { "recent.0": { $lt: monthAgo } }] },
          ],
        },
        update: { $set: { lastDay: day }, $inc: { streak: 1 }, $push: { recent: { $each: [now], $sort: 1, $slice: -cfg.per30Days }, week: { $each: [now], $sort: 1, $slice: -cfg.per7Days } } },
        upsert: true,
      },
    })));
    const capped = candidates.filter((_, i) => cap.duplicates.has(i));
    const toSend = candidates.filter((_, i) => !cap.duplicates.has(i));
    stats.capped += capped.length;
    if (capped.length) await EngagementSend.updateMany({ key: slot.key, userId: { $in: capped.map(p => p.user._id) }, status: "claimed" }, { $set: { status: "capped" } });
    if (!toSend.length) continue;

    // 4. Deliver. A failed batch is marked, never retried, so nobody is spammed by a retry loop.
    const ids = toSend.map(p => p.user._id);
    try {
      await send(toSend.map(({ user, msg }) => ({
        userId: user._id, title: msg.title, body: msg.body, prompt: msg.prompt, groupId: msg.groupId, appLink: msg.appLink, webLink: msg.webLink, cta: msg.cta, campaign: slot.key,
        image: msg.image ? `${cfg.assetOrigin}/notifications/${msg.image}` : undefined,
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

// Broadcast audiences: everyone, people active in the last 30 days, or people away for 30+ days.
function broadcastAudience(b, now) {
  const cutoff = new Date(now.getTime() - 30 * DAY_MS).toISOString().slice(0, 10);
  if (b.audience === "active") return { lastActiveDate: { $gte: cutoff } };
  if (b.audience === "inactive") return { $or: [{ lastActiveDate: { $lt: cutoff } }, { lastActiveDate: null }] };
  return {};
}

// Admin broadcasts whose window is open, as slots. Each is marked "sending" first, so a
// restart continues it (claims make the continuation safe) and a cancel stops it.
export async function dueBroadcasts(now = new Date()) {
  const rows = await Broadcast.find({ status: { $in: ["scheduled", "sending"] }, at: { $lte: now } }).lean();
  const out = [];
  for (const b of rows) {
    const until = new Date(b.at.getTime() + (b.windowMinutes || 180) * 60_000);
    if (now >= until) { await Broadcast.updateOne({ _id: b._id, status: { $ne: "cancelled" } }, { $set: { status: "done", "stats.note": "window closed" } }); continue; }
    out.push({ campaign: "broadcast", key: `broadcast:${b._id}`, at: b.at, until, tier: "broadcast", broadcast: b, label: b.title });
  }
  return out;
}

let running = false;
export async function runDue(now = new Date(), overrides = {}) {
  const cfg = { ...defaults(), ...overrides };
  if (running) return [];
  running = true;
  try {
    const settings = await getSettings();
    // Paused from the admin page: check again next tick.
    if (!settings.enabled) return [];
    const out = [];
    const slots = [...(await dueBroadcasts(now)), ...dueSlots(now, { tripPerMonth: cfg.tripPerMonth, per7Days: cfg.per7Days, overrides: settings.festivalDates, disabled: settings.disabled })];
    for (const slot of slots) {
      if (slot.broadcast) await Broadcast.updateOne({ _id: slot.broadcast._id, status: "scheduled" }, { $set: { status: "sending" } });
      const stats = await sendSlot(slot, { now, cfg });
      if (slot.broadcast) {
        const done = !stats.stoppedEarly;
        await Broadcast.updateOne({ _id: slot.broadcast._id, status: "sending" }, { $set: { ...(done && { status: "done" }), stats: { ...(slot.broadcast.stats || {}), sent: (slot.broadcast.stats?.sent || 0) + stats.sent, capped: (slot.broadcast.stats?.capped || 0) + stats.capped } } });
      }
      if (stats.sent || stats.holdout || stats.stoppedEarly) console.log(`📣 Tips ${slot.key}: ${stats.sent} sent, ${stats.holdout} held back, ${stats.capped} capped, ${stats.fatigued} fatigued${stats.stoppedEarly ? ", window closed before everyone was reached" : ""}`);
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
