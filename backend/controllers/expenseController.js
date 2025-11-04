import mongoose from "mongoose";
import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";
import { createNotification } from "../controllers/notificationController.js";

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
}) => {
  if (!participants?.length) throw new Error("No participants provided.");

  if (splitType === "equal") {
    const share = Number((amount / participants.length).toFixed(2));
    const splits = participants.map((uid) => ({ userId: uid, share }));
    const sum = splits.reduce((a, s) => a + s.share, 0);
    const drift = Number((amount - sum).toFixed(2));
    splits[splits.length - 1].share = Number(
      (splits[splits.length - 1].share + drift).toFixed(2)
    );
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
      participants, // optional
      exactSplits = [], // for exact
      percentSplits = [], // for percent
    } = req.body;

    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    // ALWAYS fetch the latest group state
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!ensureMember(group, uid))
      return res
        .status(403)
        .json({ message: "You are not a member of this group." });

    const amt = Number(amount);
    if (!amt || amt <= 0)
      return res
        .status(400)
        .json({ message: "Amount must be a positive number." });
    if (!description?.trim())
      return res.status(400).json({ message: "Description is required." });

    // ACTIVE members only
    const activeMemberIds = group.members.map((m) => String(m));
    let selected = participants?.length
      ? participants.map(String)
      : activeMemberIds;
    selected = selected.filter((p) => activeMemberIds.includes(p));
    if (selected.length === 0)
      return res
        .status(400)
        .json({ message: "No valid participants found in group." });

    const part = selected.map((id) => new mongoose.Types.ObjectId(id));

    const splits = buildSplits({
      splitType,
      amount: amt,
      participants: part,
      exactSplits,
      percentSplits,
    });

    const expense = await Expense.create({
      groupId: new mongoose.Types.ObjectId(groupId), // <-- ensure ObjectId
      description: description.trim(),
      amount: amt,
      paidBy: new mongoose.Types.ObjectId(uid), // <-- ensure ObjectId
      splitType,
      category,
      participants: part,
      splits,
      date: new Date(),
    });

    const populated = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .lean();

    // 🟢 Notify other members
    const allMembers = group.members.map((m) => String(m));
    const payerId = String(uid);
    const recipients = allMembers.filter((id) => id !== payerId);

    if (recipients.length > 0) {
      await createNotification(
        recipients,
        `${req.user.name} added an expense "${description}" of ₹${amt} in group "${group.name}"`,
        `/groups/${groupId}`,
        "expense"
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
    const expenses = await Expense.find({ groupId })
      .sort({ date: -1 })
      .populate("paidBy", "name email")
      .lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
