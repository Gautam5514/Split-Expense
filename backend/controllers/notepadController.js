import Notepad from "../models/notepadModel.js";
import Group from "../models/groupModel.js";
import { isValidObjectId, optionalString } from "../middleware/validate.js";

const isGroupMember = (group, userId) =>
  (group?.members || []).some((m) => String(m) === String(userId));

// 📝 Create new notepad for a group
export const createNotepad = async (req, res) => {
  try {
    const { groupId, title } = req.body;
    const userId = req.user.id;

    if (!groupId || !isValidObjectId(groupId))
      return res.status(400).json({ field: "groupId", message: "A valid group is required." });
    if (typeof title !== "string" || !title.trim())
      return res.status(400).json({ field: "title", message: "Notepad title is required." });
    if (title.trim().length < 2)
      return res.status(400).json({ field: "title", message: "Title must be at least 2 characters." });
    if (title.trim().length > 100)
      return res.status(400).json({ field: "title", message: "Title must be under 100 characters." });

    // check if user is part of group
    const group = await Group.findById(groupId).select("members").lean();
    if (!group || !isGroupMember(group, userId)) {
      return res.status(403).json({ message: "Not authorized for this group" });
    }

    const notepad = await Notepad.create({ groupId, title: title.trim(), createdBy: userId });
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

    if (!groupId || !isValidObjectId(groupId))
      return res.status(400).json({ message: "Invalid group ID" });

    const group = await Group.findById(groupId).select("members").lean();
    if (!group || !isGroupMember(group, userId)) {
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

    if (!notepadId || !isValidObjectId(notepadId))
      return res.status(400).json({ message: "Invalid notepad ID" });
    if (typeof title !== "string" || !title.trim())
      return res.status(400).json({ field: "title", message: "Step title is required." });
    if (title.trim().length > 200)
      return res.status(400).json({ field: "title", message: "Step title must be under 200 characters." });
    const notesCheck = optionalString(notes, 20000);
    if (!notesCheck.ok)
      return res.status(400).json({ field: "notes", message: "Notes must be under 20000 characters." });
    const dateCheck = optionalString(date, 100);
    if (!dateCheck.ok)
      return res.status(400).json({ field: "date", message: "Invalid date." });

    const notepad = await Notepad.findById(notepadId);
    if (!notepad) return res.status(404).json({ message: "Notepad not found" });

    // check access via group
    const group = await Group.findById(notepad.groupId).select("members").lean();
    if (!group || !isGroupMember(group, userId)) {
      return res.status(403).json({ message: "Not authorized for this group" });
    }

    if (notepad.steps.length >= 2000)
      return res.status(400).json({ message: "This notepad has reached its step limit." });

    notepad.steps.push({ title: title.trim(), notes: notesCheck.value, date: dateCheck.value, createdBy: userId });
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
    const userId = req.user.id;

    if (!notepadId || !isValidObjectId(notepadId))
      return res.status(400).json({ message: "Invalid notepad ID" });
    if (!Array.isArray(steps))
      return res.status(400).json({ message: "Steps must be an array" });

    const notepad = await Notepad.findById(notepadId);
    if (!notepad) return res.status(404).json({ message: "Notepad not found" });

    const group = await Group.findById(notepad.groupId).select("members").lean();
    if (!group || !isGroupMember(group, userId)) {
      return res.status(403).json({ message: "Not authorized for this group" });
    }

    // Reorder ONLY. The body used to replace the steps array wholesale, so any
    // member could rewrite other people's steps, forge `createdBy`, or inject
    // unbounded data. Now the client sends the existing step ids (or step
    // objects with `_id`) in the new order and must include each exactly once.
    const orderedIds = steps.map((st) => String(st?._id ?? st));
    const byId = new Map(notepad.steps.map((st) => [String(st._id), st]));
    const unique = new Set(orderedIds);
    if (
      orderedIds.length !== notepad.steps.length ||
      unique.size !== orderedIds.length ||
      !orderedIds.every((id) => byId.has(id))
    ) {
      return res.status(400).json({ message: "Steps must be a reordering of the existing steps." });
    }

    notepad.steps = orderedIds.map((id) => byId.get(id));
    await notepad.save();

    res.json({ message: "Reordered successfully", notepad });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
