import ContactMessage from "../models/contactMessageModel.js";
import { isValidEmail, isValidObjectId } from "../middleware/validate.js";

// -------------------- PUBLIC --------------------
export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name?.trim() || name.trim().length < 2)
      return res.status(400).json({ field: "name", message: "Name must be at least 2 characters." });
    if (!isValidEmail(email))
      return res.status(400).json({ field: "email", message: "Please enter a valid email address." });
    if (!message?.trim() || message.trim().length < 10)
      return res.status(400).json({ field: "message", message: "Message must be at least 10 characters." });

    const saved = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    });

    res.status(201).json({ id: saved._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- ADMIN --------------------
export const listContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateContactMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
    if (!["new", "read", "resolved"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const updated = await ContactMessage.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Message not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await ContactMessage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Message not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
