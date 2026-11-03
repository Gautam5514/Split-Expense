import mongoose from "mongoose";
import Group from "../../models/groupModel.js";
import User from "../../models/userModel.js";
import { AgentRun } from "./models.js";
import { ZodError } from "zod";
import { runInput, decisionSchema, hash, checkDecision, keyOf, intentSchema } from "./contracts.js";
import { resolvePeople } from "./people.js";
import { getContactIds } from "../../utils/contacts.js";
import { isValidEmail, normalizeEmail } from "../../middleware/validate.js";
import { extractIntent, buildPlan, collectPeopleRefs, applyEdits, readCorrection, parseLocal } from "./planner.js";
import Expense from "../../models/expenseModel.js";
import { escapeRegExp } from "../../middleware/validate.js";
import { READ_STEPS } from "./contracts.js";
import { authorizedRun, snapshot, fail, sameContext } from "./context.js";
import { applyStep } from "./domain.js";
import { computeInsights } from "./insights.js";
import { computeGroupBalances, buildSettlement, invalidateBalanceCache } from "../../controllers/balanceController.js";

const APPROVAL_TTL_MS = 24 * 60 * 60_000;
export const event = (type, data = {}) => ({ type, at: new Date().toISOString(), data });
const safeError = err => err.status && err.status < 500 ? err.message : "Autopilot could not finish. Your saved timeline shows which steps committed. Try again or use the manual group screen.";
// A question's answer is only ever a contact of this user or a syntactically valid email.
async function applyAnswers(actorId, answers = [], bindings = {}) {
  const next = { ...bindings };
  const contacts = answers.some(a => a.userId) ? await getContactIds(actorId) : null;
  for (const a of answers) {
    if (a.userId) {
      if (!contacts.has(String(a.userId))) throw fail(400, "NOT_A_CONTACT", "You can only pick people from your contacts. Share their email instead.");
      next[keyOf(a.ref)] = { userId: String(a.userId) };
    } else {
      const email = normalizeEmail(a.email);
      if (!isValidEmail(email)) throw fail(400, "INVALID_EMAIL", "That doesn't look like a valid email address.");
      next[keyOf(a.ref)] = { email };
    }
  }
  return next;
}

// Something the offline reader fully understands on its own, with nothing left to ask.
const isCompleteRequest = (text) => { const local = parseLocal(text); return local.actions.length > 0 && !local.clarification; };

export async function createRun(actor, body) {
  let input = runInput.parse(body);
  const existing = await AgentRun.findOne({ actorId: actor.id, requestKey: input.requestKey });
  if (existing) return authorizedRun(AgentRun, actor.id, existing._id);

  // Conversation: a follow-up continues a run that was waiting for details or approval.
  let parent = null, bindings = {}, groupId = input.groupId || null, message = input.message;
  if (input.parentRunId) {
    parent = await authorizedRun(AgentRun, actor.id, input.parentRunId);
    if (!["clarification_required", "waiting_approval"].includes(parent.status)) throw fail(409, "PARENT_CLOSED", "That step is already finished. Start a new request.");
    // Understand what a typed reply is before merging it into the waiting request:
    if (!input.reuse && !input.edits?.length && !input.answers?.length) {
      // 1. A quick correction ("make it 4000", "Rahul ko hata do") edits the plan directly.
      const fix = parent.status === "waiting_approval" && parent.intent ? readCorrection(input.message, parent.plan) : null;
      if (fix) input = { ...input, edits: fix.edits };
      // 2. A complete new request ("who owes whom?") is its own run; the waiting plan stays open.
      else if (isCompleteRequest(input.message)) {
        groupId = input.groupId || (parent.groupId ? String(parent.groupId) : null);
        parent = null;
      }
    }
  }
  if (parent) {
    bindings = await applyAnswers(actor.id, input.answers, parent.bindings || {});
    groupId = input.groupId || (parent.groupId ? String(parent.groupId) : null);
    // Chip answers keep the parsed request; typed replies are merged and re-read by the model.
    if (input.edits?.length && !parent.intent) throw fail(400, "NOTHING_TO_EDIT", "This plan can't be edited. Tell me the change instead.");
    message = input.reuse || input.edits?.length ? parent.message : `${parent.message}\n${input.message}`.slice(-4000);
  }
  if (groupId) await snapshot(actor.id, groupId);

  let run;
  try {
    run = await AgentRun.create({ actorId: actor.id, groupId, requestKey: input.requestKey, message, parentRunId: parent?._id || null, bindings, events: [event("run.started"), event("planning.started")] });
  } catch (err) {
    if (err.code === 11000) return authorizedRun(AgentRun, actor.id, (await AgentRun.findOne({ actorId: actor.id, requestKey: input.requestKey }))._id);
    throw err;
  }
  const savedRunId = run._id;
  try {
    const groups = await Group.find({ members: actor.id }).select("name settings.currency").limit(100).lean();
    const ai = {};
    let intent;
    if (input.edits?.length) { intent = applyEdits(parent.intent, input.edits); Object.assign(ai, parent.ai || {}, { edited: true }); }
    else if (input.reuse && parent?.intent) { intent = intentSchema.parse(parent.intent); Object.assign(ai, parent.ai || {}); }
    else intent = await extractIntent(message, groups, ai, groups.find(g => String(g._id) === String(groupId))?.name || null);
    // A selected group is only context; a request to create a group is about a new one.
    if (intent.actions.some(a => a.type === "create_group")) groupId = null;
    // A group named in the request beats the picker ("add taxi to Goa Trip" while Flat is selected).
    if (intent.groupName && !intent.actions.some(a => a.type === "create_group")) {
      const wanted = intent.groupName.trim().toLowerCase();
      let matches = groups.filter(g => g.name.trim().toLowerCase() === wanted);
      if (!matches.length && wanted.length >= 3) matches = groups.filter(g => g.name.toLowerCase().includes(wanted));
      // Exactly one match moves the request there (the UI follows). Anything else asks, even if a group is selected.
      if (matches.length === 1) groupId = String(matches[0]._id);
      else { groupId = null; intent.clarification = matches.length > 1 ? `More than one group matches “${intent.groupName}”. Which one?` : `I couldn't find a group called “${intent.groupName}”. Which group is this for?`; }
    }
    const context = groupId ? await snapshot(actor.id, groupId) : null;
    const members = context ? await User.find({ _id: { $in: context.group.members } }).select("name").lean() : [];
    const refs = collectPeopleRefs(intent);
    const people = refs.length ? await resolvePeople(actor.id, refs, { groupMembers: members, bindings }) : {};
    // Deletes need to know which expenses are the user's own and what a group holds.
    let ownExpenses = [], groupStats = null;
    if (context && intent.actions.some(a => a.type === "delete_expense")) {
      ownExpenses = await Expense.find({ groupId, paidBy: actor.id, isSettlement: { $ne: true } }).sort({ date: -1, _id: -1 }).limit(50).select("description amount date createdAt").lean();
    }
    if (context && intent.actions.some(a => a.type === "delete_group")) {
      const spend = context.expenses.filter(e => !e.isSettlement);
      groupStats = { expenses: spend.length, totalMinor: spend.reduce((n, e) => n + Math.round(e.amount * 100), 0) };
    }
    let plan;
    try { plan = buildPlan(intent, { actorId: actor.id, group: context?.group, members, hasExpenses: Boolean(context?.expenses.length), people, groups, explicitEqual: /\b(equal(ly)?|evenly|barabar|baraabar)\b/i.test(message), ownExpenses, groupStats, message }); }
    catch (err) { if (err instanceof ZodError) throw err; throw err.status ? err : fail(400, "PLAN_REJECTED", "I couldn't turn that into a safe plan. Try rephrasing it."); }
    const status = plan.clarifications.length ? "clarification_required" : plan.steps.some(s => s.requiresApproval) ? "waiting_approval" : "running";
    run = await AgentRun.findOneAndUpdate({ _id: run._id, status: "planning" }, { $set: { groupId, plan, intent, payloadHash: hash(plan), snapshotHash: context?.fingerprint, status, ai }, $push: { events: { $each: [...plan.steps.map(s => event("step.proposed", { stepId: s.id })), event(plan.clarifications.length ? "clarification.required" : "plan.ready")] } } }, { new: true });
    if (!run) return authorizedRun(AgentRun, actor.id, savedRunId);
    if (parent) await AgentRun.updateOne({ _id: parent._id, status: { $in: ["clarification_required", "waiting_approval"] } }, { $set: { status: "cancelled" }, $push: { events: event("run.superseded") } });
    if (run.status === "running") await executeRun(actor, run._id);
  } catch (err) {
    // No raw model response, prompt, tokens, stack trace or DB error in audit events.
    await AgentRun.updateOne({ _id: savedRunId, status: { $in: ["planning", "running"] } }, { $set: { status: "failed", error: safeError(err) }, $push: { events: event("run.failed") } });
  }
  return authorizedRun(AgentRun, actor.id, run._id);
}

export async function decide(actor, runId, body) {
  const decision = decisionSchema.parse(body);
  const run = await authorizedRun(AgentRun, actor.id, runId);
  checkDecision(run, decision);
  if (decision.decision === "approve" && process.env.AUTOPILOT_WRITES_ENABLED !== "true") throw fail(403, "WRITES_DISABLED", "Execution is disabled. No changes were made.");
  // A reviewed plan is a snapshot of that moment; a day-old one is re-checked by re-asking.
  if (decision.decision === "approve" && Date.now() - new Date(run.createdAt).getTime() > APPROVAL_TTL_MS) throw fail(409, "PLAN_EXPIRED", "This plan is more than a day old. Send the request again so I can re-check it against the group.");
  if (run.groupId && !sameContext(await snapshot(actor.id, run.groupId), run.snapshotHash)) throw fail(409, "STALE_CONTEXT", "Group or expenses changed after preview. Edit the request to prepare a new plan.");
  const updated = await AgentRun.findOneAndUpdate({ _id: runId, actorId: actor.id, status: "waiting_approval", payloadHash: decision.payloadHash, planVersion: decision.planVersion }, {
    $set: { status: decision.decision === "approve" ? "running" : "rejected" },
    $push: { approvals: { ...decision, approverId: actor.id, decidedAt: new Date() }, events: event(`plan.${decision.decision === "approve" ? "approved" : "rejected"}`) },
  }, { new: true });
  if (!updated) throw fail(409, "ALREADY_DECIDED", "This plan has already been decided.");
  if (decision.decision === "approve") {
    // A pre-flight refusal must not leave the approved run stuck in "running".
    try { await executeRun(actor, runId); }
    catch (err) { await AgentRun.updateOne({ _id: runId, status: "running" }, { $set: { status: "failed", error: safeError(err) }, $push: { events: event("run.failed", { code: typeof err.code === "string" ? err.code : "EXECUTION_FAILED" }) } }); }
  }
  return authorizedRun(AgentRun, actor.id, runId);
}

// Read-only: the user's own net position in each active group, from the same balance maths as the app.
async function readOverall(actorId) {
  const groups = await Group.find({ members: actorId, isCompleted: { $ne: true } }).select("name settings.currency").sort({ updatedAt: -1 }).limit(30).lean();
  const rows = [];
  for (const g of groups) {
    const data = await computeGroupBalances(g._id);
    rows.push({ groupId: String(g._id), name: g.name, currency: g.settings?.currency || "INR", balanceMinor: Math.round(Number(data?.balances?.[String(actorId)] || 0) * 100) });
  }
  const totals = {};
  for (const r of rows) {
    const t = totals[r.currency] ||= { owedMinor: 0, oweMinor: 0 };
    if (r.balanceMinor > 0) t.owedMinor += r.balanceMinor; else t.oweMinor -= r.balanceMinor;
  }
  return { verified: true, overall: { groups: rows.filter(r => r.balanceMinor !== 0).sort((a, b) => Math.abs(b.balanceMinor) - Math.abs(a.balanceMinor)), settledCount: rows.filter(r => r.balanceMinor === 0).length, totals } };
}
async function listExpenses(groupId, query) {
  if (!groupId) throw fail(400, "GROUP_REQUIRED", "Pick a group to list its expenses.");
  const filter = { groupId, isSettlement: { $ne: true } };
  const q = query?.trim().toLowerCase();
  if (q) filter.$or = [{ description: { $regex: escapeRegExp(q), $options: "i" } }, { category: q }];
  const rows = await Expense.find(filter).sort({ date: -1, _id: -1 }).limit(15).select("description amount paidBy category date").lean();
  const names = Object.fromEntries((await User.find({ _id: { $in: [...new Set(rows.map(r => String(r.paidBy)))] } }).select("name").lean()).map(u => [String(u._id), u.name]));
  return { verified: true, href: `/groups/${groupId}`, expenses: rows.map(r => ({ id: String(r._id), title: r.description, amountMinor: Math.round(r.amount * 100), paidBy: names[String(r.paidBy)] || "Member", category: r.category || "general", date: r.date })) };
}

export async function executeRun(actor, runId) {
  const initial = await authorizedRun(AgentRun, actor.id, runId);
  if (!["running", "partial_success", "failed"].includes(initial.status) || !initial.plan || initial.plan.clarifications.length) throw fail(409, "NOT_RESUMABLE", "This run cannot be resumed.");
  const writes = initial.plan.steps.some(s => s.requiresApproval || !READ_STEPS.includes(s.type));
  if (writes) {
    if (process.env.AUTOPILOT_WRITES_ENABLED !== "true") throw fail(403, "WRITES_DISABLED", "Execution is disabled.");
    const approval = initial.approvals.find(a => a.decision === "approve" && a.payloadHash === initial.payloadHash && a.planVersion === initial.planVersion && a.approverId === actor.id);
    if (!approval || hash(initial.plan) !== initial.payloadHash) throw fail(403, "APPROVAL_REQUIRED", "A matching approval is required.");
  }
  await AgentRun.updateOne({ _id: runId, status: { $in: ["partial_success", "failed"] } }, { $set: { status: "running", error: null } });
  try {
    for (const step of initial.plan.steps) {
      // Each financial change and its execution ledger commit in one transaction.
      // Retried transactions re-read ledger rows before doing any work.
      const after = [];
      await mongoose.connection.transaction(async session => {
        after.length = 0; // the transaction callback can be retried
        const run = await AgentRun.findOne({ _id: runId, actorId: actor.id }).session(session);
        if (run.status !== "running") throw fail(409, "RUN_STOPPED", "Run stopped; committed steps remain in the timeline.");
        if (run.results.some(r => r.stepId === step.id)) return;
        if (run.groupId) {
          const current = await snapshot(actor.id, run.groupId, session);
          if (!sameContext(current, run.snapshotHash)) throw fail(409, "STALE_CONTEXT", "Group data changed. Prepare and approve a new plan for the remaining actions.");
        }
        let result;
        if (step.type === "read_overall") result = await readOverall(actor.id);
        else if (step.type === "list_expenses") result = await listExpenses(run.groupId, step.payload.query);
        else if (step.type === "read_summary") {
          // The existing authoritative balance service is read-only; group access
          // is checked immediately above and again after the read.
          const data = await computeGroupBalances(run.groupId);
          if (!data) throw fail(404, "GROUP_UNAVAILABLE", "Group unavailable.");
          const members = data.uniqueMembers.map(m => ({ id: String(m._id), name: m.name }));
          const names = Object.fromEntries(members.map(m => [m.id, m.name]));
          const groupDoc = await Group.findById(run.groupId).select("name trip settings").lean();
          result = { verified: true, balances: data.balances, members, settlements: buildSettlement(data.balances), insights: await computeInsights(run.groupId, groupDoc, names), groupName: groupDoc?.name, href: `/groups/${run.groupId}` };
        } else {
          if (!writes || process.env.AUTOPILOT_WRITES_ENABLED !== "true") throw fail(403, "WRITES_DISABLED", "Execution disabled.");
          result = await applyStep(step, run, session, after);
          if (result.groupId) run.groupId = result.groupId;
          // The group is gone; the run stays readable to its owner.
          if (result.deletedGroup) run.groupId = null;
        }
        if (run.groupId) run.snapshotHash = (await snapshot(actor.id, run.groupId, session)).fingerprint;
        run.results.push({ stepId: step.id, idempotencyKey: `${runId}:${step.id}:v${run.planVersion}`, ...result });
        run.events.push(event("step.verified", { stepId: step.id }));
        await run.save({ session });
      });
      // Notifications and emails go out only after the step has committed.
      for (const effect of after) { try { await effect(); } catch { /* best effort; the change itself is already verified */ } }
      const current = await AgentRun.findById(runId).select("groupId").lean();
      if (current?.groupId) invalidateBalanceCache(current.groupId);
    }
    await AgentRun.updateOne({ _id: runId, status: "running" }, { $set: { status: "completed", error: null }, $push: { events: event("run.completed") } });
  } catch (err) {
    const run = await AgentRun.findById(runId);
    await AgentRun.updateOne({ _id: runId, status: "running" }, { $set: { status: run.results.length ? "partial_success" : "failed", error: safeError(err) }, $push: { events: event("run.failed", { code: err.code && typeof err.code === "string" ? err.code : "EXECUTION_FAILED" }) } });
  }
}
