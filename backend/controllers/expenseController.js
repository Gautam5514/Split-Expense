import mongoose from "mongoose";
import Expense from "../models/expenseModel.js";
import Group from "../models/groupModel.js";
import { createNotification } from "../controllers/notificationController.js";
import Tesseract from "tesseract.js";
import { isValidObjectId } from "../middleware/validate.js";

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

    // 🔹 OCR
    let ocrText = null;
    if (fileUrl) {
      const { data } = await Tesseract.recognize(fileUrl, "eng");
      ocrText = data.text.trim() || null;
    }

    // 🔹 Participants — deduplicate member list first to prevent split inflation
    const activeMemberIds = [...new Set(group.members.map((m) => String(m)))];
    let selected = participants?.length ? participants.map(String) : activeMemberIds;
    selected = [...new Set(selected.filter((p) => activeMemberIds.includes(p)))];
    const part = selected.map((id) => new mongoose.Types.ObjectId(id));

    const splits = buildSplits({
      splitType,
      amount: amt,
      participants: part,
      exactSplits,
      percentSplits,
    });

    // 🔹 Save to DB
    const payerId = req.body.paidBy || uid;
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
      .lean();

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
        isSettlement ? "group" : "expense"
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

// POST /api/expenses/settle
// Records a settlement payment: `from` pays `to` the given amount.
// Math: paidBy=from (+amount to from's balance), splits=[{to, amount}] (-amount from to's balance)
// Net effect: both balances move toward 0. Future expenses accumulate from the new 0 baseline.
export const recordSettlement = async (req, res) => {
  try {
    const { groupId, fromUserId, toUserId, amount } = req.body;

    if (!groupId || !fromUserId || !toUserId || !amount)
      return res.status(400).json({ message: "groupId, fromUserId, toUserId and amount are required." });

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ message: "Amount must be a positive number." });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    const allMemberIds = group.members.map(String);
    if (!allMemberIds.includes(String(fromUserId)) || !allMemberIds.includes(String(toUserId)))
      return res.status(403).json({ message: "Both users must be members of this group." });

    const expense = await Expense.create({
      groupId:      new mongoose.Types.ObjectId(groupId),
      description:  `Settlement`,
      amount:       amt,
      paidBy:       new mongoose.Types.ObjectId(fromUserId),
      splitType:    "exact",
      category:     "general",
      participants: [new mongoose.Types.ObjectId(toUserId)],
      splits:       [{ userId: new mongoose.Types.ObjectId(toUserId), share: amt }],
      isSettlement: true,
      date:         new Date(),
    });

    // Notify both parties
    await createNotification(
      [toUserId],
      `Settlement of ₹${amt.toFixed(0)} has been recorded in "${group.name}"`,
      `/groups/${groupId}`,
      "group"
    );

    const populated = await Expense.findById(expense._id).populate("paidBy", "name email").lean();
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ recordSettlement:", err.message);
    res.status(500).json({ message: err.message });
  }
};
