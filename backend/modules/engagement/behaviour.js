import mongoose from "mongoose";
import Expense from "../../models/expenseModel.js";
import Group from "../../models/groupModel.js";
import { computeGroupBalances, buildSettlement } from "../../controllers/balanceController.js";
import { RULES } from "./config.js";

/*
 * Personal nudges are built from the person's own data, fetched once per batch of users
 * (never per user). Each fetcher returns Map<userId, data>; a user missing from the map
 * has nothing worth saying and gets no message at all. That is the rule for this tier:
 * no numbers, no push.
 */
const DAY_MS = 86400_000;
const oid = (id) => new mongoose.Types.ObjectId(String(id));
const dayKeyUTC = (d) => d.toISOString().slice(0, 10);

// Extra audience conditions per campaign, merged into the base filter.
export function audienceExtra(campaign, now, cfg = RULES) {
  if (campaign === "onboard") {
    // Signed up `d` days ago (to the day) and still no expense.
    const ranges = cfg.onboardDays.map((d) => ({
      _id: {
        $gte: mongoose.Types.ObjectId.createFromTime(Math.floor((now.getTime() - (d + 1) * DAY_MS) / 1000)),
        $lt: mongoose.Types.ObjectId.createFromTime(Math.floor((now.getTime() - d * DAY_MS) / 1000)),
      },
    }));
    return { $and: [{ $or: ranges }], expenseCount: { $not: { $gt: 0 } } };
  }
  if (campaign === "winback") {
    const cutoff = dayKeyUTC(new Date(now.getTime() - cfg.winbackAfterDays * DAY_MS));
    return { lastActiveDate: { $lt: cutoff, $type: "string" } };
  }
  return {};
}

// Last week's numbers: the person's own share, how many bills, where most of it went, and
// how much of what they paid is still owed back to them. One query per batch.
export async function weeklyRecap(users, now) {
  const ids = users.map((u) => oid(u._id));
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const rows = await Expense.find({ date: { $gte: since, $lt: now }, isSettlement: { $ne: true }, $or: [{ paidBy: { $in: ids } }, { "splits.userId": { $in: ids } }] })
    .select("groupId paidBy payers amount splits").lean();
  const acc = new Map(); // userId -> { spent, paid, count, byGroup }
  const bump = (uid) => { if (!acc.has(uid)) acc.set(uid, { spent: 0, paid: 0, count: 0, byGroup: new Map() }); return acc.get(uid); };
  const wanted = new Set(ids.map(String));
  for (const e of rows) {
    const gid = String(e.groupId);
    const touched = new Set();
    for (const s of e.splits || []) {
      const uid = String(s.userId);
      if (!wanted.has(uid)) continue;
      const a = bump(uid);
      a.spent += Number(s.share || 0);
      a.byGroup.set(gid, (a.byGroup.get(gid) || 0) + Number(s.share || 0));
      touched.add(uid);
    }
    const credits = e.payers?.length ? e.payers.map((p) => [String(p.userId), Number(p.amount || 0)]) : [[String(e.paidBy), Number(e.amount || 0)]];
    for (const [uid, amt] of credits) if (wanted.has(uid)) { bump(uid).paid += amt; touched.add(uid); }
    for (const uid of touched) acc.get(uid).count += 1;
  }
  const topIds = [...acc.values()].map((a) => [...a.byGroup.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]).filter(Boolean);
  const names = new Map((await Group.find({ _id: { $in: topIds.map(oid) } }).select("name").lean()).map((g) => [String(g._id), g.name]));
  const out = new Map();
  for (const [uid, a] of acc) {
    if (a.count < 1 || a.spent + a.paid < 1) continue;
    const top = [...a.byGroup.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
    out.set(uid, { spent: Math.round(a.spent), count: a.count, topGroup: names.get(top) || null, back: Math.max(0, Math.round(a.paid - a.spent)) });
  }
  return out;
}

/*
 * The one balance most worth settling: the largest amount between this person and one
 * other member, in a group that has been quiet for `settleAfterDays`. Group balances are
 * computed once per group per run (`memo`), using the same maths as the app, so the
 * push never disagrees with the screen it opens.
 */
export async function settleCandidates(users, now, { cfg = RULES, memo = new Map(), maxGroups = 400 } = {}) {
  const ids = users.map((u) => oid(u._id));
  const groups = await Group.find({ members: { $in: ids }, isCompleted: { $ne: true } }).select("_id members").sort({ updatedAt: -1 }).limit(maxGroups).lean();
  if (!groups.length) return new Map();
  const quietBefore = new Date(now.getTime() - cfg.settleAfterDays * DAY_MS);
  const activity = await Expense.aggregate([
    { $match: { groupId: { $in: groups.map((g) => g._id) } } },
    { $group: { _id: "$groupId", last: { $max: "$date" }, n: { $sum: 1 } } },
  ]);
  const quiet = new Set(activity.filter((a) => a.last <= quietBefore && a.n <= 3000).map((a) => String(a._id)));
  const best = new Map(); // userId -> candidate
  for (const g of groups) {
    const gid = String(g._id);
    if (!quiet.has(gid)) continue;
    if (!memo.has(gid)) memo.set(gid, await computeGroupBalances(gid));
    const computed = memo.get(gid);
    if (!computed) continue;
    const names = new Map(computed.uniqueMembers.map((m) => [String(m._id), m.name]));
    for (const t of buildSettlement(computed.balances)) {
      if (t.amount < cfg.settleMinAmount) continue;
      for (const [uid, direction, other] of [[t.to, "owed", t.from], [t.from, "owe", t.to]]) {
        if (!g.members.some((m) => String(m) === uid)) continue;
        const cur = best.get(uid);
        // Being owed is the better message to get; otherwise the bigger amount wins.
        if (!cur || (direction === "owed" && cur.direction !== "owed") || (direction === cur.direction && t.amount > cur.amount)) {
          best.set(uid, { direction, amount: Math.round(t.amount), other: names.get(other) || "", group: computed.group.name, groupId: gid });
        }
      }
    }
  }
  const wanted = new Set(ids.map(String));
  return new Map([...best].filter(([uid]) => wanted.has(uid)));
}

// What happened in their groups since they last opened the app: the group with the most
// new bills and the count. Nothing new means no message.
export async function winbackChanges(users, now, { cfg = RULES } = {}) {
  const byUser = new Map(users.filter((u) => typeof u.lastActiveDate === "string").map((u) => [String(u._id), new Date(`${u.lastActiveDate}T00:00:00Z`)]));
  if (!byUser.size) return new Map();
  const ids = [...byUser.keys()].map(oid);
  const groups = await Group.find({ members: { $in: ids }, isCompleted: { $ne: true } }).select("_id name members").lean();
  if (!groups.length) return new Map();
  const earliest = new Date(Math.max(Math.min(...byUser.values()), now.getTime() - cfg.inactiveAfterDays * DAY_MS));
  const rows = await Expense.find({ groupId: { $in: groups.map((g) => g._id) }, createdAt: { $gte: earliest }, isSettlement: { $ne: true } }).select("groupId createdAt").lean();
  const byGroup = new Map();
  for (const r of rows) { const k = String(r.groupId); if (!byGroup.has(k)) byGroup.set(k, []); byGroup.get(k).push(r.createdAt); }
  const out = new Map();
  for (const [uid, lastActive] of byUser) {
    let top = null;
    for (const g of groups) {
      if (!g.members.some((m) => String(m) === uid)) continue;
      const n = (byGroup.get(String(g._id)) || []).filter((d) => d > lastActive).length;
      if (n > 0 && (!top || n > top.newCount)) top = { newCount: n, group: g.name, groupId: String(g._id) };
    }
    if (top) out.set(uid, { ...top, days: Math.max(1, Math.floor((now - lastActive) / DAY_MS)) });
  }
  return out;
}

// Onboarding: which day it is and the group they made (if any), so the message can name it.
export async function onboardingState(users, now) {
  const ids = users.map((u) => oid(u._id));
  const groups = await Group.find({ members: { $in: ids } }).select("_id name members").sort({ createdAt: -1 }).lean();
  const out = new Map();
  for (const u of users) {
    const uid = String(u._id);
    const created = oid(u._id).getTimestamp();
    const g = groups.find((x) => x.members.some((m) => String(m) === uid));
    out.set(uid, { day: Math.floor((now - created) / DAY_MS), group: g?.name || null, groupId: g ? String(g._id) : null });
  }
  return out;
}

export const FETCHERS = { recap: weeklyRecap, settle: settleCandidates, winback: winbackChanges, onboard: onboardingState };
