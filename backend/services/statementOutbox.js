// Settlement-statement email workflow (durable outbox).
//
//  trigger (group completed / last debt settled / creator resend)
//    -> queueGroupStatement(): freeze the report, one batch + one delivery per member
//    -> quiet window (settled 2 min, completed 30 s, manual 0)
//    -> activate: re-check the ledger; if it changed, drop this statement and queue a fresh one
//    -> deliver: each member separately, PDF attached, retried with backoff
//    -> finalize: done / partial / failed, in-app notifications, live update
//
// Everything is stored in MongoDB, so a restart or crash never loses an email,
// and every step is a conditional update, so several server instances can run
// the worker side by side without sending anything twice.

import Group from "../models/groupModel.js";
import { StatementBatch, StatementDelivery } from "../models/statementEmailModel.js";
import { sendEmail } from "../utils/emailService.js";
import { isPermanentRecipientError } from "../utils/emailErrors.js";
import { renderReportPdf } from "../utils/settlementReport.js";
import { createNotification } from "../controllers/notificationController.js";
import { notifyGroupChange } from "../utils/realtime.js";
import {
  loadGroupAndReport, reportSignature, reportFileName, buildMemberEmail, appBaseUrl, emailImageAttachments,
} from "./groupReportService.js";

const envMs = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

export const QUIET_WINDOW_MS = {
  settled: envMs("STATEMENT_SETTLED_DELAY_MS", 2 * 60_000),
  completed: envMs("STATEMENT_COMPLETED_DELAY_MS", 30_000),
  manual: 0,
};
// Wait before attempt 2, 3, 4, 5, 6. After the 6th failure the delivery is failed.
export const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000];
export const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length + 1;
const LOCK_MS = 3 * 60_000;
const PENDING = ["waiting", "queued", "sending"];

const log = (...a) => { if (process.env.NODE_ENV !== "test") console.log(...a); };
const errMsg = (err) => String(err?.response || err?.message || err).slice(0, 300);

// ── queue ───────────────────────────────────────────────────────────────────

/**
 * Queue a statement email to every member of a group. Never throws.
 * @param {string} groupId
 * @param {object} o
 * @param {"completed"|"settled"|"manual"} o.reason
 * @param {{userId?: any, name?: string}} [o.triggeredBy]
 * @param {boolean} [o.onlyIfSettled] skip unless every balance is zero
 * @returns {Promise<{queued: boolean, batchId?: string, sendAfter?: Date, recipients?: number, skipped?: string, error?: string}>}
 */
export async function queueGroupStatement(groupId, { reason = "completed", triggeredBy = {}, onlyIfSettled = false, now = new Date() } = {}) {
  try {
    const loaded = await loadGroupAndReport(groupId, { completedByName: triggeredBy.name || "", completedAt: now });
    if (!loaded) return { queued: false, skipped: "group-not-found" };
    const { group, data } = loaded;
    if (data.totals.expenseCount === 0) return { queued: false, skipped: "no-expenses" };
    if (onlyIfSettled && !data.fullySettled) return { queued: false, skipped: "not-settled" };

    const recipients = data.members.filter((m) => m.email);
    if (!recipients.length) return { queued: false, skipped: "no-recipients" };

    const signature = reportSignature(data);
    const sendAfter = new Date(now.getTime() + (QUIET_WINDOW_MS[reason] ?? 0));

    let batch;
    try {
      batch = await StatementBatch.create({
        groupId: group._id,
        reason,
        signature,
        ...(reason === "manual" ? {} : { dedupeKey: `${group._id}:${signature}` }),
        triggeredBy: { userId: triggeredBy.userId || null, name: triggeredBy.name || "" },
        sendAfter,
        snapshot: JSON.parse(JSON.stringify(data)),
        stats: { total: recipients.length },
      });
    } catch (err) {
      if (err?.code === 11000) return { queued: false, skipped: "already-queued" };
      throw err;
    }

    try {
      await StatementDelivery.insertMany(recipients.map((m) => ({
        batchId: batch._id, groupId: group._id, userId: m.userId, to: m.email, name: m.name,
        status: "waiting", nextAttemptAt: sendAfter,
      })));
    } catch (err) {
      await StatementBatch.deleteOne({ _id: batch._id }).catch(() => {});
      throw err;
    }

    // The newest statement replaces any older one still in its quiet window.
    const older = await StatementBatch.find({ groupId: group._id, status: "scheduled", _id: { $ne: batch._id } }).select("_id").lean();
    for (const o of older) await closeUnsent(o._id, "superseded", "A newer statement replaced this one.");

    wakeAt(sendAfter);
    log(`Statement queued (${reason}) for "${group.name}" to ${recipients.length} member(s), sends ${sendAfter.toISOString()}`);
    return { queued: true, batchId: String(batch._id), sendAfter, recipients: recipients.length };
  } catch (err) {
    console.error("queueGroupStatement error:", err.message);
    return { queued: false, error: err.message };
  }
}

// Closes a batch that never started sending. Its dedupe key is released so the
// same ledger state can be queued again later.
async function closeUnsent(batchId, status, note) {
  const r = await StatementBatch.updateOne(
    { _id: batchId, status: "scheduled" },
    { $set: { status, note, finishedAt: new Date(), lockedUntil: null }, $unset: { dedupeKey: 1 } },
  );
  if (!r.modifiedCount) return false;
  const c = await StatementDelivery.updateMany({ batchId, status: { $in: ["waiting", "queued"] } }, { $set: { status: "cancelled" } });
  await StatementBatch.updateOne({ _id: batchId }, { $set: { "stats.cancelled": c.modifiedCount || 0 } });
  return true;
}

// Group deleted: stop everything not yet sent.
export async function cancelGroupStatements(groupId) {
  try {
    const scheduled = await StatementBatch.find({ groupId, status: "scheduled" }).select("_id").lean();
    for (const b of scheduled) await closeUnsent(b._id, "cancelled", "Group was deleted.");
    await StatementDelivery.updateMany({ groupId, status: { $in: ["waiting", "queued"] } }, { $set: { status: "cancelled" } });
  } catch (err) {
    console.error("cancelGroupStatements error:", err.message);
  }
}

// ── worker ──────────────────────────────────────────────────────────────────

// Quiet window over: re-check the ledger, then release the deliveries.
async function activateDueBatches(now) {
  const due = await StatementBatch.find({ status: "scheduled", sendAfter: { $lte: now } }).select("_id").limit(25).lean();
  let activated = 0;
  for (const { _id } of due) {
    const batch = await StatementBatch.findOneAndUpdate(
      { _id, status: "scheduled", $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
      { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
      { new: true },
    ).lean();
    if (!batch) continue;

    try {
      if (batch.reason === "manual") {
        if (!(await Group.exists({ _id: batch.groupId }))) {
          await closeUnsent(batch._id, "cancelled", "Group was deleted.");
          continue;
        }
      } else {
        const fresh = await loadGroupAndReport(batch.groupId);
        if (!fresh) {
          await closeUnsent(batch._id, "cancelled", "Group was deleted.");
          continue;
        }
        if (reportSignature(fresh.data) !== batch.signature) {
          // Someone added, edited or settled something during the wait. Drop
          // this statement and queue one for the ledger as it is now.
          await closeUnsent(batch._id, "superseded", "The group's expenses changed before sending.");
          await queueGroupStatement(batch.groupId, {
            reason: batch.reason,
            triggeredBy: batch.triggeredBy || {},
            onlyIfSettled: batch.reason === "settled",
          });
          continue;
        }
      }

      await StatementDelivery.updateMany({ batchId: batch._id, status: "waiting" }, { $set: { status: "queued", nextAttemptAt: now } });
      await StatementBatch.updateOne({ _id: batch._id, status: "scheduled" }, { $set: { status: "sending", lockedUntil: null } });
      activated += 1;
    } catch (err) {
      // Lock expires and the next tick tries again.
      console.error(`statement activate ${batch._id} failed:`, err.message);
    }
  }
  return activated;
}

const dueDeliveryFilter = (now) => ({
  $or: [
    { status: "queued", nextAttemptAt: { $lte: now } },
    // A worker died mid-send: its lock ran out, pick it up again.
    { status: "sending", lockedUntil: { $lte: now } },
  ],
});

async function deliverDue(now) {
  const due = await StatementDelivery.find(dueDeliveryFilter(now)).select("_id").sort({ nextAttemptAt: 1 }).limit(50).lean();
  const ctxCache = new Map(); // batchId -> batch | null
  const stats = { sent: 0, retried: 0, failed: 0 };

  const batchCtx = async (batchId) => {
    const key = String(batchId);
    if (!ctxCache.has(key)) {
      const batch = await StatementBatch.findById(batchId).lean();
      ctxCache.set(key, batch ? { batch, fileName: reportFileName(batch.snapshot) } : null);
    }
    return ctxCache.get(key);
  };

  for (const { _id } of due) {
    const d = await StatementDelivery.findOneAndUpdate(
      { _id, ...dueDeliveryFilter(now) },
      { $set: { status: "sending", lockedUntil: new Date(now.getTime() + LOCK_MS) }, $inc: { attempts: 1 } },
      { new: true },
    ).lean();
    if (!d) continue;

    const ctx = await batchCtx(d.batchId).catch((err) => { console.error("statement batch load failed:", err.message); return undefined; });
    if (ctx === undefined) {
      await StatementDelivery.updateOne({ _id, status: "sending" }, { $set: { status: "queued", nextAttemptAt: new Date(now.getTime() + RETRY_BACKOFF_MS[0]), lockedUntil: null, lastError: "Could not load the statement" } });
      continue;
    }
    const member = ctx?.batch.snapshot.members.find((m) => m.userId === String(d.userId));
    if (!ctx || !member || ["superseded", "cancelled"].includes(ctx.batch.status)) {
      await StatementDelivery.updateOne({ _id, status: "sending" }, { $set: { status: "cancelled", lockedUntil: null } });
      continue;
    }

    try {
      const refId = String(d._id).slice(-8).toUpperCase();
      // Every member gets their own copy: "Prepared for" them, with their position on page 1.
      const pdf = await renderReportPdf(ctx.batch.snapshot, { viewerId: String(d.userId), refId });
      const { images, ...content } = buildMemberEmail(ctx.batch.snapshot, { ...member, email: d.to }, {
        appUrl: appBaseUrl(), reason: ctx.batch.reason, refId, fileName: ctx.fileName,
      });
      const info = await sendEmail({
        to: d.to,
        ...content,
        attachments: [
          { filename: ctx.fileName, content: pdf, contentType: "application/pdf" },
          ...emailImageAttachments(images),
        ],
        headers: {
          "X-Mailin-Tag": `settlement-statement-${ctx.batch.reason}`, // Brevo dashboard tag
          "X-Entity-Ref-ID": String(d._id), // stops Gmail collapsing statements into one thread
        },
      }, { retries: 1 });
      await StatementDelivery.updateOne({ _id, status: "sending" }, {
        $set: { status: "sent", sentAt: new Date(), messageId: info?.messageId || "", lastError: "", lockedUntil: null },
      });
      stats.sent += 1;
    } catch (err) {
      const giveUp = isPermanentRecipientError(err) || d.attempts >= MAX_ATTEMPTS;
      const next = new Date(now.getTime() + RETRY_BACKOFF_MS[Math.min(d.attempts - 1, RETRY_BACKOFF_MS.length - 1)]);
      await StatementDelivery.updateOne({ _id, status: "sending" }, {
        $set: giveUp
          ? { status: "failed", lastError: errMsg(err), lockedUntil: null }
          : { status: "queued", nextAttemptAt: next, lastError: errMsg(err), lockedUntil: null },
      });
      if (giveUp) stats.failed += 1; else { stats.retried += 1; wakeAt(next); }
      console.error(`Statement email to ${d.to} ${giveUp ? "failed for good" : `failed (attempt ${d.attempts}), retrying ${next.toISOString()}`}:`, errMsg(err));
    }
  }
  return stats;
}

// Close out batches whose deliveries are all finished.
async function finalizeBatches() {
  const open = await StatementBatch.find({ status: "sending" }).select("_id groupId reason snapshot.group triggeredBy").limit(50).lean();
  let finalized = 0;
  for (const b of open) {
    const rows = await StatementDelivery.find({ batchId: b._id }).select("status userId").lean();
    if (rows.some((r) => PENDING.includes(r.status))) continue;

    const count = (s) => rows.filter((r) => r.status === s).length;
    const sent = count("sent"), failed = count("failed"), cancelled = count("cancelled");
    const status = sent === 0 && failed === 0 ? "cancelled" : failed === 0 ? "done" : sent === 0 ? "failed" : "partial";

    const r = await StatementBatch.updateOne(
      { _id: b._id, status: "sending" },
      {
        $set: { status, finishedAt: new Date(), "stats.sent": sent, "stats.failed": failed, "stats.cancelled": cancelled },
        // Nothing reached anyone: let the next trigger queue this state again.
        ...(sent === 0 ? { $unset: { dedupeKey: 1 } } : {}),
      },
    );
    if (!r.modifiedCount) continue;
    finalized += 1;

    const groupName = b.snapshot?.group?.name || "your group";
    const link = `/groups/${b.groupId}`;
    const sentTo = rows.filter((x) => x.status === "sent").map((x) => String(x.userId));
    if (sentTo.length) {
      void createNotification(sentTo, `Your settlement statement for "${groupName}" has been emailed to you.`, link, "group",
        { groupName, groupId: b.groupId, kind: "statement" }).catch(() => {});
    }
    if (failed) {
      const g = await Group.findById(b.groupId).select("createdBy").lean().catch(() => null);
      if (g?.createdBy) {
        void createNotification([String(g.createdBy)], `The statement for "${groupName}" couldn't be emailed to ${failed} member(s). You can retry from the group.`, link, "group",
          { groupName, groupId: b.groupId, kind: "statement_failed" }).catch(() => {});
      }
    }
    void notifyGroupChange(null, b.groupId, "statement");
    log(`Statement ${b.reason} for "${groupName}": ${status} (${sent} sent, ${failed} failed, ${cancelled} cancelled)`);
  }
  return finalized;
}

let running = false;
let rerun = false;
/** One pass of the workflow. Safe to call any time, from any instance. */
export async function runStatementOutbox(now = new Date()) {
  if (running) { rerun = true; return null; }
  running = true;
  try {
    const activated = await activateDueBatches(now);
    const delivery = await deliverDue(now);
    const finalized = await finalizeBatches();
    return { activated, ...delivery, finalized };
  } finally {
    running = false;
    if (rerun) { rerun = false; wakeAt(new Date()); }
  }
}

// Precise wake-ups so a statement goes out right when its window ends, not on
// the next poll. Only for the near future; the poll covers the rest.
const timers = new Set();
function wakeAt(at) {
  if (process.env.NODE_ENV === "test" && !process.env.STATEMENT_TIMERS) return;
  const delay = Math.max(0, new Date(at).getTime() - Date.now()) + 750;
  if (delay > 60 * 60_000) return;
  const t = setTimeout(() => {
    timers.delete(t);
    runStatementOutbox().catch((err) => console.error("Statement outbox error:", err.message));
  }, delay);
  t.unref?.();
  timers.add(t);
}

export function startStatementRunner({ intervalMs = 60_000 } = {}) {
  const tick = () => runStatementOutbox().catch((err) => console.error("Statement outbox error:", err.message));
  setTimeout(tick, 20_000).unref?.(); // after boot, picks up anything left from before a restart
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return timer;
}

// ── status & control (used by the group routes) ─────────────────────────────

/** Latest statement + recent history for a group. Emails only for the creator. */
export async function getGroupStatementStatus(groupId, { includeEmails = false } = {}) {
  const batches = await StatementBatch.find({ groupId }).select("-snapshot").sort({ createdAt: -1 }).limit(6).lean();
  if (!batches.length) return { latest: null, history: [] };
  const latest = batches[0];
  const rows = await StatementDelivery.find({ batchId: latest._id }).sort({ name: 1 }).lean();
  const shape = (b) => ({
    id: String(b._id), reason: b.reason, status: b.status, createdAt: b.createdAt, sendAfter: b.sendAfter,
    finishedAt: b.finishedAt, triggeredBy: b.triggeredBy?.name || "", stats: b.stats, note: b.note || "",
  });
  return {
    latest: {
      ...shape(latest),
      recipients: rows.map((r) => ({
        userId: String(r.userId), name: r.name, status: r.status, attempts: r.attempts,
        sentAt: r.sentAt, nextAttemptAt: ["queued", "waiting"].includes(r.status) ? r.nextAttemptAt : null,
        ...(includeEmails ? { email: r.to, lastError: r.lastError || "" } : {}),
      })),
    },
    history: batches.slice(1).map(shape),
  };
}

/** Re-queue failed deliveries of the latest statement. Returns how many. */
export async function retryFailedStatement(groupId) {
  const latest = await StatementBatch.findOne({ groupId }).sort({ createdAt: -1 }).select("_id status").lean();
  if (!latest || !["failed", "partial"].includes(latest.status)) return 0;
  const now = new Date();
  const r = await StatementDelivery.updateMany(
    { batchId: latest._id, status: "failed" },
    { $set: { status: "queued", nextAttemptAt: now, attempts: 0, lastError: "" } },
  );
  if (r.modifiedCount) {
    await StatementBatch.updateOne({ _id: latest._id }, { $set: { status: "sending", finishedAt: null } });
    wakeAt(now);
  }
  return r.modifiedCount || 0;
}

/** Was a manual send made for this group within `withinMs`? */
export const recentManualStatement = (groupId, withinMs) =>
  StatementBatch.exists({ groupId, reason: "manual", createdAt: { $gte: new Date(Date.now() - withinMs) } });
