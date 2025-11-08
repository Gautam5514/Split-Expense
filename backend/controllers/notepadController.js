import Notepad from "../models/notepadModel.js";
import Group from "../models/groupModel.js";

// 📝 Create new notepad for a group
export const createNotepad = async (req, res) => {
  try {
    const { groupId, title } = req.body;
    const userId = req.user.id;

    // check if user is part of group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ message: "Not authorized for this group" });
    }

    const notepad = await Notepad.create({ groupId, title, createdBy: userId });
    res.status(201).json(notepad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📖 Get all notepads for a group
export const getGroupNotepads = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ message: "Not authorized for this group" });
    }

    const notepads = await Notepad.find({ groupId }).populate("steps.createdBy", "name");
    res.json(notepads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✏️ Add new step to a notepad
export const addStep = async (req, res) => {
  try {
    const { notepadId } = req.params;
    const { title, notes, date } = req.body;
    const userId = req.user.id;

    const notepad = await Notepad.findById(notepadId);
    if (!notepad) return res.status(404).json({ message: "Notepad not found" });

    // check access via group
    const group = await Group.findById(notepad.groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notepad.steps.push({ title, notes, date, createdBy: userId });
    await notepad.save();

    res.status(201).json(notepad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔄 Reorder steps
export const reorderSteps = async (req, res) => {
  try {
    const { notepadId } = req.params;
    const { steps } = req.body; // array of reordered steps

    const notepad = await Notepad.findById(notepadId);
    if (!notepad) return res.status(404).json({ message: "Notepad not found" });

    notepad.steps = steps;
    await notepad.save();

    res.json({ message: "Reordered successfully", notepad });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
