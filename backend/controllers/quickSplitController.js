import QuickSplit from "../models/quickSplitModel.js";
import UserProfile from "../models/userProfileModel.js";
import { isValidObjectId } from "../middleware/validate.js";
import { buildParticipants } from "../utils/quickSplit.js";

const asId = (u) => (typeof u === "string" ? u : u?.id || u?._id?.toString());

// The creator's UPI details (id + QR) so the client can render "pay me" —
// everyone in a quick split pays the one person who footed the bill.
const payeeUpiFor = async (userId) => {
  const profile = await UserProfile.findOne({ userId }).select("upiId upiQr.url").lean();
  return { upiId: profile?.upiId || null, upiQrUrl: profile?.upiQr?.url || null };
};

// Shape a stored doc for the client, adding a live paidCount/settled summary
// and (optionally) the creator's UPI details.
const shape = (doc, payee) => {
  const participants = (doc.participants || []).map((p) => ({
    id: String(p._id),
    name: p.name,
    share: p.share,
    paid: !!p.paid,
    paidAt: p.paidAt || null,
  }));
  const paidCount = participants.filter((p) => p.paid).length;
  const collected = participants.filter((p) => p.paid).reduce((a, p) => a + p.share, 0);
  return {
    id: String(doc._id),
    title: doc.title,
    totalAmount: doc.totalAmount,
    currency: doc.currency || "INR",
    splitType: doc.splitType,
    note: doc.note || "",
    participants,
    paidCount,
    collected: Math.round(collected * 100) / 100,
    settled: participants.length > 0 && paidCount === participants.length,
    createdAt: doc.createdAt,
    ...(payee ? { payee } : {}),
  };
};

// POST /api/quick-splits
export const createQuickSplit = async (req, res) => {
  try {
    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const title = typeof req.body.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : "Quick Split";
    if (title.length > 120) return res.status(400).json({ field: "title", message: "Title must be under 120 characters." });

    const splitType = req.body.splitType === "custom" ? "custom" : "equal";
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 300) : "";
    const currency = typeof req.body.currency === "string" && req.body.currency.trim()
      ? req.body.currency.trim().slice(0, 8)
      : "INR";

    const built = buildParticipants({
      totalAmount: req.body.totalAmount,
      splitType,
      participants: req.body.participants,
      peopleCount: req.body.peopleCount,
    });
    if (built.error) return res.status(400).json({ message: built.error });

    const doc = await QuickSplit.create({
      createdBy: uid,
      title,
      totalAmount: Math.round(Number(req.body.totalAmount) * 100) / 100,
      currency,
      splitType,
      note,
      participants: built.participants,
    });

    const payee = await payeeUpiFor(uid);
    res.status(201).json(shape(doc.toObject(), payee));
  } catch (err) {
    console.error("createQuickSplit error:", err.message);
    res.status(500).json({ message: "Couldn't create the quick split." });
  }
};

// GET /api/quick-splits — the caller's own splits, newest first.
export const listQuickSplits = async (req, res) => {
  try {
    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const docs = await QuickSplit.find({ createdBy: uid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ items: docs.map((d) => shape(d)) });
  } catch (err) {
    console.error("listQuickSplits error:", err.message);
    res.status(500).json({ message: "Couldn't load your quick splits." });
  }
};

// GET /api/quick-splits/:id — owner only (includes the payee UPI so the
// pay screen can be reopened later).
export const getQuickSplit = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id." });

    const doc = await QuickSplit.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Quick split not found." });
    if (String(doc.createdBy) !== String(uid))
      return res.status(403).json({ message: "This isn't your quick split." });

    const payee = await payeeUpiFor(doc.createdBy);
    res.json(shape(doc, payee));
  } catch (err) {
    console.error("getQuickSplit error:", err.message);
    res.status(500).json({ message: "Couldn't load that quick split." });
  }
};

// PATCH /api/quick-splits/:id/participants/:pid — owner marks a person
// paid/unpaid. Body: { paid: boolean }.
export const setParticipantPaid = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { id, pid } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(pid))
      return res.status(400).json({ message: "Invalid id." });

    const doc = await QuickSplit.findById(id);
    if (!doc) return res.status(404).json({ message: "Quick split not found." });
    if (String(doc.createdBy) !== String(uid))
      return res.status(403).json({ message: "This isn't your quick split." });

    const participant = doc.participants.id(pid);
    if (!participant) return res.status(404).json({ message: "Person not found in this split." });

    const paid = req.body.paid === true;
    participant.paid = paid;
    participant.paidAt = paid ? new Date() : null;
    await doc.save();

    res.json(shape(doc.toObject()));
  } catch (err) {
    console.error("setParticipantPaid error:", err.message);
    res.status(500).json({ message: "Couldn't update that person." });
  }
};

// DELETE /api/quick-splits/:id — owner only.
export const deleteQuickSplit = async (req, res) => {
  try {
    const uid = asId(req.user);
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id." });

    const doc = await QuickSplit.findById(id).select("createdBy").lean();
    if (!doc) return res.status(404).json({ message: "Quick split not found." });
    if (String(doc.createdBy) !== String(uid))
      return res.status(403).json({ message: "This isn't your quick split." });

    await QuickSplit.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (err) {
    console.error("deleteQuickSplit error:", err.message);
    res.status(500).json({ message: "Couldn't delete that quick split." });
  }
};
