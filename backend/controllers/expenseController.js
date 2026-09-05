import mongoose from "mongoose";
import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";
import SettlementRequest from "../models/settlementRequestModel.js";
import { createNotification } from "../controllers/notificationController.js";
import { invalidateBalanceCache, computeGroupBalances, to2 } from "../controllers/balanceController.js";
import { runOcr } from "../utils/ocrService.js";
import { isValidObjectId } from "../middleware/validate.js";
import { incrementExpenseCount } from "../utils/referralService.js";
import { io } from "../index.js";

const VALID_CATEGORIES = ["general", "food", "travel", "stay", "shopping", "bills"];

const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());
const sameId = (a, b) => String(a) === String(b);
const ensureMember = (group, userId) =>
  (group.members || []).some((m) => sameId(m, userId));

const buildSplits = ({
  splitType,
  amount,
  participants,
  exactSplits = [],
  percentSplits = [],
  payerId = null,   // used to direct rounding drift to the payer
}) => {
  if (!participants?.length) throw new Error("No participants provided.");

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

  if (splitType === "exact") {
    const total = Number(
      exactSplits.reduce((a, s) => a + Number(s.share || 0), 0).toFixed(2)
    );
    if (Math.abs(total - amount) > 0.01)
      throw new Error("Exact splits must sum to total amount.");
    const set = new Set(participants.map(String));
    exactSplits.forEach((s) => {
      if (!set.has(String(s.userId)))
        throw new Error("Exact split contains non-participant.");
    });
    return exactSplits.map((s) => ({
      userId: new mongoose.Types.ObjectId(s.userId),
      share: Number(s.share),
    }));
  }

  if (splitType === "percent") {
    const totalPct = percentSplits.reduce(
      (a, s) => a + Number(s.percent || 0),
      0
    );
    if (Math.abs(totalPct - 100) > 0.01)
      throw new Error("Percent splits must sum to 100%.");
    const set = new Set(participants.map(String));
    percentSplits.forEach((s) => {
      if (!set.has(String(s.userId)))
        throw new Error("Percent split contains non-participant.");
    });
    let splits = percentSplits.map((s) => ({
      userId: new mongoose.Types.ObjectId(s.userId),
      share: Number(((amount * s.percent) / 100).toFixed(2)),
    }));
    const sum = splits.reduce((a, s) => a + s.share, 0);
    const drift = Number((amount - sum).toFixed(2));
    splits[splits.length - 1].share = Number(
      (splits[splits.length - 1].share + drift).toFixed(2)
    );
    return splits;
  }

  throw new Error("Invalid splitType.");
};

export const addExpense = async (req, res) => {
  try {
    const {
      groupId,
      description,
      amount,
      splitType = "equal",
      category = "general",
      participants = [],
      exactSplits = [],
      percentSplits = [],
      fileUrl, // 👈 Cloudinary URL from frontend
    } = req.body;

    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    // Input validation
    if (!groupId || !isValidObjectId(groupId))
      return res.status(400).json({ field: "groupId", message: "A valid group is required." });
    if (!description?.trim())
      return res.status(400).json({ field: "description", message: "Description is required." });
    if (description.trim().length > 200)
      return res.status(400).json({ field: "description", message: "Description must be under 200 characters." });
    if (amount === undefined || amount === null || amount === "")
      return res.status(400).json({ field: "amount", message: "Amount is required." });
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ field: "amount", message: "Amount must be a positive number." });
    if (amt > 9999999)
      return res.status(400).json({ field: "amount", message: "Amount exceeds the maximum limit of ₹99,99,999." });
    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ field: "category", message: "Invalid category. Choose from: " + VALID_CATEGORIES.join(", ") + "." });

    // Validate Group
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!ensureMember(group, uid))
      return res.status(403).json({ message: "You are not a member of this group." });

    // 🔹 OCR - uses persistent worker, no per-request init overhead
    let ocrText = null;
    if (fileUrl) {
      ocrText = await runOcr(fileUrl);
    }

    // 🔹 Participants - deduplicate member list first to prevent split inflation
    const activeMemberIds = [...new Set(group.members.map((m) => String(m)))];
    let selected = participants?.length ? participants.map(String) : activeMemberIds;
    selected = [...new Set(selected.filter((p) => activeMemberIds.includes(p)))];
    const part = selected.map((id) => new mongoose.Types.ObjectId(id));

    // 🔹 Validate paidBy - must be declared before buildSplits (used for drift correction)
    const payerId = req.body.paidBy || uid;
    if (!activeMemberIds.includes(String(payerId)))
      return res.status(400).json({ field: "paidBy", message: "The payer must be a member of this group." });

    const splits = buildSplits({
      splitType,
      amount: amt,
      participants: part,
      exactSplits,
      percentSplits,
      payerId,
    });

    const expense = await Expense.create({
      groupId: new mongoose.Types.ObjectId(groupId),
      description: description.trim(),
      amount: amt,
      paidBy: new mongoose.Types.ObjectId(payerId),
      splitType,
      category,
      participants: part,
      splits,
      imageUrl: fileUrl || null,
      ocrText,
      date: new Date(),
    });

    const populated = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("splits.userId", "name email")
      .lean();

    invalidateBalanceCache(groupId);

    // Referral milestone: count this towards the creator's "meaningful actions".
    incrementExpenseCount(uid).catch((err) => console.error("incrementExpenseCount error:", err.message));

    // 🔹 Notify other members
    const allMembers = group.members.map((m) => String(m));
    const recipients = allMembers.filter((id) => id !== String(uid));
    if (recipients.length > 0) {
      const isSettlement = description.toLowerCase().startsWith("settlement");
      const notificationMessage = isSettlement
        ? `${description} (₹${amt}) in "${group.name}"`
        : `${req.user.name} added an expense "${description}" of ₹${amt} in "${group.name}"`;

      await createNotification(
        recipients,
        notificationMessage,
        `/groups/${groupId}`,
        isSettlement ? "group" : "expense",
        { groupName: group.name, groupId, amount: amt, category }
      );
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ addExpense:", err.message);
    res.status(400).json({ message: err.message });
  }
};


export const getExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    if (!groupId || !isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group ID." });
    }

    const group = await Group.findById(groupId).select("members").lean();
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!ensureMember(group, uid)) {
      return res.status(403).json({ message: "You are not a member of this group." });
    }

    const expenses = await Expense.find({ groupId })
      .sort({ date: -1 })
      .populate("paidBy", "name email")
      .populate("splits.userId", "name email")
      .lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Settlement request/confirm flow ──────────────────────────────────────
//
// A settlement can never be written to Expense (and therefore can never move
// a balance) from a single party's say-so. Whoever clicks first only creates
// a `pending` SettlementRequest; the OTHER party must explicitly confirm it
// before createSettlementExpense() below ever runs. This closes the old
// /expenses/settle bug where any member could silently zero out anyone
// else's debt with no counterparty approval.
//
// Math: paidBy=from (+amount to from's balance), splits=[{to, amount}] (-amount from to's balance)
// Net effect: both balances move toward 0. Future expenses accumulate from the new 0 baseline.
const createSettlementExpense = async ({ groupId, fromUserId, toUserId, amount, method }) => {
  const expense = await Expense.create({
    groupId:      new mongoose.Types.ObjectId(groupId),
    description:  `Settlement (${method === "online" ? "Online" : "Cash"})`,
    amount,
    paidBy:       new mongoose.Types.ObjectId(fromUserId),
    splitType:    "exact",
    category:     "general",
    participants: [new mongoose.Types.ObjectId(toUserId)],
    splits:       [{ userId: new mongoose.Types.ObjectId(toUserId), share: amount }],
    isSettlement: true,
    date:         new Date(),
  });
  invalidateBalanceCache(groupId);
  return expense;
};

// How much `fromUserId` can currently settle with `toUserId`, per the live
// balance sheet - never trust a client-supplied amount against a stale
// balance. Returns null if either user has no live group balance (e.g. not
// a member, or the group vanished).
const maxSettleableBetween = (balances, fromUserId, toUserId) => {
  const fromBal = balances[String(fromUserId)];
  const toBal = balances[String(toUserId)];
  if (fromBal === undefined || toBal === undefined) return null;
  if (fromBal > -0.01) return 0; // fromUser doesn't currently owe anything
  if (toBal < 0.01) return 0;    // toUser isn't currently owed anything
  return to2(Math.min(-fromBal, toBal));
};

const populateRequest = (query) =>
  query
    .populate("fromUserId", "name email")
    .populate("toUserId", "name email")
    .populate("initiatedBy", "name email")
    .lean();

// POST /api/expenses/settle/request
// Either party can initiate ("I paid" / "I received payment") - the OTHER
// party must confirm before anything touches the ledger.
export const requestSettlement = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { groupId, fromUserId, toUserId, amount, method = "cash", note = "" } = req.body;

    if (!groupId || !fromUserId || !toUserId || !amount)
      return res.status(400).json({ message: "groupId, fromUserId, toUserId and amount are required." });
    if (sameId(fromUserId, toUserId))
      return res.status(400).json({ message: "A member cannot settle with themselves." });
    if (!["cash", "online"].includes(method))
      return res.status(400).json({ message: "Invalid payment method." });

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ message: "Amount must be a positive number." });
    if (amt > 9999999)
      return res.status(400).json({ message: "Amount exceeds the maximum limit of ₹99,99,999." });

    // Only the two people actually involved can start a claim about their own debt.
    if (!sameId(uid, fromUserId) && !sameId(uid, toUserId))
      return res.status(403).json({ message: "You can only settle a balance you're a party to." });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!ensureMember(group, fromUserId) || !ensureMember(group, toUserId))
      return res.status(403).json({ message: "Both members must be part of this group." });

    // Math validation: never let a claimed settlement exceed the live outstanding balance.
    const computed = await computeGroupBalances(groupId);
    if (!computed) return res.status(404).json({ message: "Group not found." });
    const maxSettleable = maxSettleableBetween(computed.balances, fromUserId, toUserId);
    if (!maxSettleable) {
      return res.status(400).json({
        message: "There is no outstanding balance between these two members right now.",
      });
    }
    if (amt > maxSettleable + 0.01) {
      return res.status(400).json({
        message: `Amount exceeds the outstanding balance - at most ₹${maxSettleable.toFixed(2)} can be settled between these two members right now.`,
      });
    }

    let request;
    try {
      request = await SettlementRequest.create({
        groupId, fromUserId, toUserId,
        amount: amt, method, note: note.trim().slice(0, 200),
        initiatedBy: uid,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: "A settlement request between these two members is already pending." });
      }
      throw err;
    }

    const populated = await populateRequest(SettlementRequest.findById(request._id));

    const counterpartyId = sameId(uid, fromUserId) ? toUserId : fromUserId;
    const initiatorIsPayer = sameId(uid, fromUserId);
    const message = initiatorIsPayer
      ? `${req.user.name} says they paid you ₹${amt.toFixed(0)} in "${group.name}". Tap to confirm.`
      : `${req.user.name} says they received ₹${amt.toFixed(0)} from you in "${group.name}". Tap to confirm.`;

    await createNotification([counterpartyId], message, `/groups/${groupId}`, "settlement", {
      groupName: group.name,
      groupId,
      amount: amt,
      kind: "requested",
    });
    io.to(`group:${groupId}`).emit("settlementUpdate", { groupId, kind: "requested" });

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ requestSettlement:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/expenses/settle/:requestId/confirm
// Only the party who did NOT initiate the request may confirm it.
export const confirmSettlementRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!isValidObjectId(requestId))
      return res.status(400).json({ message: "Invalid request id." });

    const uid = asId(req.user);
    const request = await SettlementRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Settlement request not found." });
    if (request.status !== "pending")
      return res.status(409).json({ message: `This settlement request was already ${request.status}.` });
    if (!sameId(request.fromUserId, uid) && !sameId(request.toUserId, uid))
      return res.status(403).json({ message: "You are not a party to this settlement." });
    if (sameId(request.initiatedBy, uid))
      return res.status(403).json({ message: "You can't confirm your own settlement request - the other member needs to." });

    const group = await Group.findById(request.groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    // Re-validate against the CURRENT balance, not the balance at request time -
    // other expenses may have changed things since this request was created.
    const computed = await computeGroupBalances(request.groupId);
    if (!computed) return res.status(404).json({ message: "Group not found." });
    const maxSettleable = maxSettleableBetween(computed.balances, request.fromUserId, request.toUserId);
    if (!maxSettleable || Number(request.amount) > maxSettleable + 0.01) {
      return res.status(409).json({
        message: "Balances have changed since this request was made and it no longer matches the outstanding amount. Reject it and ask for a new request.",
      });
    }

    const expense = await createSettlementExpense({
      groupId: request.groupId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      amount: Number(request.amount),
      method: request.method,
    });

    request.status = "confirmed";
    request.expenseId = expense._id;
    request.respondedAt = new Date();
    await request.save();

    await createNotification(
      [request.initiatedBy],
      `${req.user.name} confirmed the ₹${Number(request.amount).toFixed(0)} settlement in "${group.name}".`,
      `/groups/${request.groupId}`,
      "settlement",
      { groupName: group.name, groupId: request.groupId, amount: request.amount, kind: "confirmed" }
    );
    io.to(`group:${request.groupId}`).emit("settlementUpdate", { groupId: String(request.groupId), kind: "confirmed" });

    const populated = await populateRequest(SettlementRequest.findById(request._id));
    res.json({ request: populated, expense });
  } catch (err) {
    console.error("❌ confirmSettlementRequest:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/expenses/settle/:requestId/reject
// The counterparty disputes the claim ("I haven't received/paid this") - no
// balance change, the requester is notified so they can correct and resend.
export const rejectSettlementRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!isValidObjectId(requestId))
      return res.status(400).json({ message: "Invalid request id." });

    const uid = asId(req.user);
    const request = await SettlementRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Settlement request not found." });
    if (request.status !== "pending")
      return res.status(409).json({ message: `This settlement request was already ${request.status}.` });
    if (sameId(request.initiatedBy, uid))
      return res.status(403).json({ message: "You can't reject your own settlement request - cancel it instead." });
    if (!sameId(request.fromUserId, uid) && !sameId(request.toUserId, uid))
      return res.status(403).json({ message: "You are not a party to this settlement." });

    request.status = "rejected";
    request.respondedAt = new Date();
    await request.save();

    const group = await Group.findById(request.groupId).select("name").lean();
    await createNotification(
      [request.initiatedBy],
      `${req.user.name} said this ₹${Number(request.amount).toFixed(0)} settlement wasn't confirmed in "${group?.name || "your group"}". Check the details and try again.`,
      `/groups/${request.groupId}`,
      "settlement",
      { groupName: group?.name, groupId: request.groupId, amount: request.amount, kind: "rejected" }
    );
    io.to(`group:${request.groupId}`).emit("settlementUpdate", { groupId: String(request.groupId), kind: "rejected" });

    const populated = await populateRequest(SettlementRequest.findById(request._id));
    res.json(populated);
  } catch (err) {
    console.error("❌ rejectSettlementRequest:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/expenses/settle/:requestId/cancel
// The initiator can withdraw their own still-pending claim.
export const cancelSettlementRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!isValidObjectId(requestId))
      return res.status(400).json({ message: "Invalid request id." });

    const uid = asId(req.user);
    const request = await SettlementRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Settlement request not found." });
    if (request.status !== "pending")
      return res.status(409).json({ message: `This settlement request was already ${request.status}.` });
    if (!sameId(request.initiatedBy, uid))
      return res.status(403).json({ message: "Only the person who sent this request can cancel it." });

    request.status = "cancelled";
    request.respondedAt = new Date();
    await request.save();

    io.to(`group:${request.groupId}`).emit("settlementUpdate", { groupId: String(request.groupId), kind: "cancelled" });

    const populated = await populateRequest(SettlementRequest.findById(request._id));
    res.json(populated);
  } catch (err) {
    console.error("❌ cancelSettlementRequest:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/expenses/settle/pending/:groupId
export const getPendingSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = asId(req.user);

    const group = await Group.findById(groupId).select("members").lean();
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!ensureMember(group, uid))
      return res.status(403).json({ message: "You are not a member of this group." });

    const pending = await populateRequest(
      SettlementRequest.find({ groupId, status: "pending" }).sort({ createdAt: -1 })
    );
    res.json(pending);
  } catch (err) {
    console.error("❌ getPendingSettlements:", err.message);
    res.status(500).json({ message: err.message });
  }
};
