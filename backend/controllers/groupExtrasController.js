// Group-type features layered on top of the core group/expense flow:
// type settings, the type card summary, "recent people" for
// the create wizard, and recurring monthly bills.
import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import User from "../models/userModel.js";
import RecurringExpense from "../models/recurringExpenseModel.js";
import { isValidObjectId } from "../middleware/validate.js";
import { buildGroupSettingsUpdate } from "../utils/groupSettings.js";
import { EXPENSE_CATEGORIES } from "../utils/groupPresets.js";
import { computeGroupBalances, to2 } from "./balanceController.js";
import { nextRunDate } from "../utils/recurringRunner.js";

const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());
const isMember = (group, userId) =>
  (group.members || []).some((m) => String(m?._id || m) === String(userId));
const isCreator = (group, reqUser) => {
  const stored = String(group.createdBy?._id || group.createdBy);
  return stored === String(reqUser?.id || "") ||
    (reqUser?.firebaseUid && stored === String(reqUser.firebaseUid));
};
const isSettlementExpense = (e) =>
  e.isSettlement || String(e.description || "").toLowerCase().startsWith("settlement");

// Loads the group and checks the caller belongs to it. Sends the error
// response itself and returns null when the request should stop.
const loadGroupForMember = async (req, res) => {
  const { groupId } = req.params;
  if (!isValidObjectId(groupId)) {
    res.status(400).json({ message: "Invalid group ID" });
    return null;
  }
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404).json({ message: "Group not found." });
    return null;
  }
  if (!isMember(group, asId(req.user))) {
    res.status(403).json({ message: "You are not a member of this group." });
    return null;
  }
  return group;
};

/* ── PATCH /api/groups/:groupId/settings ── */
export const updateGroupSettings = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;
    if (!isCreator(group, req.user))
      return res.status(403).json({ message: "Only the group creator can change group settings." });

    // Group type is chosen once at creation and is permanent: never let a
    // settings update change it (guards raw API calls too, not just the UI).
    const { groupType: _ignoredGroupType, ...settingsBody } = req.body || {};

    const { update, error, field } = buildGroupSettingsUpdate(settingsBody, {
      memberIds: group.members.map(String),
    });
    if (error) return res.status(400).json({ field, message: error });
    if (!Object.keys(update).length) return res.status(400).json({ message: "Nothing to update." });

    // Keep dates consistent when only one side is being changed.
    const start = update["trip.startDate"] !== undefined ? update["trip.startDate"] : group.trip?.startDate;
    const end = update["trip.endDate"] !== undefined ? update["trip.endDate"] : group.trip?.endDate;
    if (start && end && new Date(end) < new Date(start))
      return res.status(400).json({ field: "endDate", message: "End date can't be before the start date." });

    await Group.updateOne({ _id: group._id }, { $set: update });
    const updated = await Group.findById(group._id)
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean();
    res.json(updated);
  } catch (err) {
    console.error("updateGroupSettings error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/groups/recent-contacts ──
   People the caller already shares groups with, most shared first - the
   one-tap "Recent" chips in the create wizard. */
export const getRecentContacts = async (req, res) => {
  try {
    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const groups = await Group.find({ members: new mongoose.Types.ObjectId(uid) })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select("members")
      .lean();

    const counts = new Map();
    for (const g of groups) {
      for (const m of g.members || []) {
        const id = String(m);
        if (id === String(uid)) continue;
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
    if (!topIds.length) return res.json([]);

    const users = await User.find({ _id: { $in: topIds } }).select("name email photoURL").lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    res.json(
      topIds
        .map((id) => byId.get(id))
        .filter((u) => u?.email)
        .map((u) => ({ _id: u._id, name: u.name, email: u.email, photoURL: u.photoURL || null }))
    );
  } catch (err) {
    console.error("getRecentContacts error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* ── GET /api/groups/:groupId/summary ──
   Everything the type card at the top of the group page needs. */
export const getGroupSummary = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;
    const uid = String(asId(req.user));

    const expenses = (await Expense.find({ groupId: group._id }).lean()).filter((e) => !isSettlementExpense(e));
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let total = 0, thisMonth = 0, lastMonth = 0, myShare = 0, myPaid = 0, missingReceipts = 0;
    const byCategory = {};
    for (const e of expenses) {
      const amt = Number(e.amount) || 0;
      const date = new Date(e.date || e.createdAt);
      total += amt;
      if (date >= monthStart) thisMonth += amt;
      else if (date >= lastMonthStart) lastMonth += amt;
      byCategory[e.category || "general"] = (byCategory[e.category || "general"] || 0) + amt;
      if (!e.imageUrl) missingReceipts++;
      for (const s of e.splits || []) if (String(s.userId) === uid) myShare += Number(s.share) || 0;
      if (e.payers?.length) {
        for (const p of e.payers) if (String(p.userId) === uid) myPaid += Number(p.amount) || 0;
      } else if (String(e.paidBy) === uid) myPaid += amt;
    }

    // Trip timeline: which day of the trip it is and the average daily spend.
    let trip = null;
    if (group.groupType === "trip") {
      const start = group.trip?.startDate ? startOfDay(new Date(group.trip.startDate)) : null;
      const end = group.trip?.endDate ? startOfDay(new Date(group.trip.endDate)) : null;
      const firstExpense = expenses.reduce(
        (min, e) => { const d = new Date(e.date || e.createdAt); return !min || d < min ? d : min; }, null
      );
      const from = start || (firstExpense ? startOfDay(firstExpense) : startOfDay(now));
      const today = startOfDay(now);
      const lastDay = end && end < today ? end : today;
      const elapsedDays = Math.max(1, Math.round((lastDay - from) / DAY_MS) + 1);
      const totalDays = start && end ? Math.round((end - start) / DAY_MS) + 1 : null;
      const dayNumber = start ? Math.round((today - start) / DAY_MS) + 1 : null;
      trip = {
        startDate: group.trip?.startDate || null,
        endDate: group.trip?.endDate || null,
        budget: group.trip?.budget ?? null,
        totalDays,
        dayNumber,
        status: !start ? "unscheduled" : today < start ? "upcoming" : end && today > end ? "ended" : "ongoing",
        perDay: to2(total / elapsedDays),
        budgetUsedPct: group.trip?.budget ? Math.round((total / group.trip.budget) * 100) : null,
      };
    }

    // "Who should pay next": the member furthest behind on what they owe.
    let nextPayer = null;
    const computed = await computeGroupBalances(group._id);
    if (computed && expenses.length) {
      const [lowestId, lowest] = Object.entries(computed.balances).sort((a, b) => a[1] - b[1])[0] || [];
      if (lowestId && lowest < -0.5) {
        const m = computed.uniqueMembers.find((x) => String(x._id) === lowestId);
        nextPayer = { userId: lowestId, name: m?.name || "Someone", behindBy: to2(-lowest) };
      }
    }

    const recurring = await RecurringExpense.find({ groupId: group._id, active: true })
      .sort({ nextRunAt: 1 })
      .limit(5)
      .select("description amount nextRunAt dayOfMonth")
      .lean();

    res.json({
      groupType: group.groupType,
      currency: group.settings?.currency || "INR",
      total: to2(total),
      count: expenses.length,
      thisMonth: to2(thisMonth),
      lastMonth: to2(lastMonth),
      myShare: to2(myShare),
      myPaid: to2(myPaid),
      missingReceipts,
      byCategory: Object.entries(byCategory)
        .map(([category, amount]) => ({ category, amount: to2(amount) }))
        .sort((a, b) => b.amount - a.amount),
      trip,
      nextPayer,
      upcomingBills: recurring,
    });
  } catch (err) {
    console.error("getGroupSummary error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ── Recurring bills ── */

const validateRecurringBody = (body, group) => {
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return { error: "Description is required.", field: "description" };
  if (description.length > 200) return { error: "Description must be under 200 characters.", field: "description" };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999)
    return { error: "Amount must be a positive number.", field: "amount" };
  const dayOfMonth = Number(body.dayOfMonth);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28)
    return { error: "Day must be between 1 and 28.", field: "dayOfMonth" };
  const category = body.category || "bills";
  if (!EXPENSE_CATEGORIES.includes(category)) return { error: "Invalid category.", field: "category" };
  const memberIds = group.members.map(String);
  // The person setting up a bill is the one who pays it - nobody can put a
  // monthly bill in someone else's name.
  const paidBy = String(body.paidBy || "");
  if (!memberIds.includes(paidBy)) return { error: "The payer must be a member of this group.", field: "paidBy" };
  const participants = Array.isArray(body.participants) ? [...new Set(body.participants.map(String))] : [];
  if (participants.some((p) => !memberIds.includes(p)))
    return { error: "Participants must be group members.", field: "participants" };
  return { value: { description, amount: to2(amount), dayOfMonth, category, paidBy, participants } };
};

export const listRecurring = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;
    const rules = await RecurringExpense.find({ groupId: group._id })
      .sort({ active: -1, nextRunAt: 1 })
      .populate("paidBy", "name email")
      .lean();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createRecurring = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;
    const count = await RecurringExpense.countDocuments({ groupId: group._id });
    if (count >= 20) return res.status(400).json({ message: "A group can have at most 20 recurring bills." });

    const { value, error, field } = validateRecurringBody({ ...req.body, paidBy: asId(req.user) }, group);
    if (error) return res.status(400).json({ field, message: error });

    const rule = await RecurringExpense.create({
      ...value,
      groupId: group._id,
      createdBy: asId(req.user),
      nextRunAt: nextRunDate(value.dayOfMonth),
    });
    const populated = await RecurringExpense.findById(rule._id).populate("paidBy", "name email").lean();
    res.status(201).json(populated);
  } catch (err) {
    console.error("createRecurring error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const updateRecurring = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;
    const { ruleId } = req.params;
    if (!isValidObjectId(ruleId)) return res.status(400).json({ message: "Invalid bill ID" });
    const rule = await RecurringExpense.findOne({ _id: ruleId, groupId: group._id });
    if (!rule) return res.status(404).json({ message: "Recurring bill not found." });

    if (req.body.active !== undefined) {
      rule.active = req.body.active === true;
      // Resuming shouldn't back-fill the months it was paused.
      if (rule.active) rule.nextRunAt = nextRunDate(rule.dayOfMonth);
    }
    if (req.body.description !== undefined || req.body.amount !== undefined || req.body.dayOfMonth !== undefined) {
      const { value, error, field } = validateRecurringBody(
        {
          description: req.body.description ?? rule.description,
          amount: req.body.amount ?? rule.amount,
          dayOfMonth: req.body.dayOfMonth ?? rule.dayOfMonth,
          category: req.body.category ?? rule.category,
          paidBy: String(rule.paidBy), // payer never changes
          participants: req.body.participants ?? rule.participants.map(String),
        },
        group
      );
      if (error) return res.status(400).json({ field, message: error });
      const dayChanged = value.dayOfMonth !== rule.dayOfMonth;
      Object.assign(rule, value);
      if (dayChanged) rule.nextRunAt = nextRunDate(value.dayOfMonth);
    }
    await rule.save();
    const populated = await RecurringExpense.findById(rule._id).populate("paidBy", "name email").lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteRecurring = async (req, res) => {
  try {
    const group = await loadGroupForMember(req, res);
    if (!group) return;
    const { ruleId } = req.params;
    if (!isValidObjectId(ruleId)) return res.status(400).json({ message: "Invalid bill ID" });
    const rule = await RecurringExpense.findOne({ _id: ruleId, groupId: group._id });
    if (!rule) return res.status(404).json({ message: "Recurring bill not found." });
    if (String(rule.createdBy) !== String(asId(req.user)) && !isCreator(group, req.user))
      return res.status(403).json({ message: "Only whoever set up this bill or the group creator can delete it." });
    await rule.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

