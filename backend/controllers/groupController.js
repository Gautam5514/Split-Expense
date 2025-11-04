import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import User from "../models/userModel.js";
import { createNotification } from "../controllers/notificationController.js";

// Helper utilities
const asId = (u) =>
  typeof u === "string" ? u : u?.id || u?._id?.toString();
const sameId = (a, b) => String(a) === String(b);
const isMember = (group, userId) =>
  (group.members || []).some((m) => String(m) === String(userId));


export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Group name is required." });

    const uid = asId(req.user);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const group = await Group.create({
      name: name.trim(),
      createdBy: uid,
      members: [uid],
    });

    const populated = await Group.findById(group._id).populate(
      "members",
      "name email"
    );
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getGroups = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?._id?.toString();
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const groups = await Group.find({
      members: new mongoose.Types.ObjectId(uid),
    })
      .sort({ updatedAt: -1 })
      .populate("members", "name email createdAt")
      .populate("createdBy", "name email");

    // 🧩 Add computed status field
    const enrichedGroups = groups.map((g) => {
      const isCreator =
        String(g.createdBy?._id || g.createdBy) === String(uid);

      return {
        ...g.toObject(),
        status: isCreator ? "active" : "inactive",
      };
    });

    res.json(enrichedGroups);
  } catch (err) {
    console.error("getGroups error:", err.message);
    res.status(500).json({ message: err.message });
  }
};



export const getGroupById = async (req, res) => {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    // 🟢 Force cast groupId into ObjectId for proper query
    const group = await Group.findById(req.params.groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean(); // <- use lean() to get plain objects

    if (!group)
      return res.status(404).json({ message: "Group not found." });

    // 🔧 Convert everything to strings for safe comparison
    const memberIds = (group.members || []).map((m) => String(m._id));
    const creatorId = String(group.createdBy?._id || group.createdBy);

    const isMember = memberIds.includes(uid) || creatorId === uid;

    if (!isMember) {
      console.log("❌ Not in members:", { uid, memberIds, creatorId });
      return res.status(403).json({ message: "Not a member of this group." });
    }

    // ✅ Auto-heal: if creator not in members
    if (!memberIds.includes(creatorId)) {
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { members: creatorId } }
      );
    }

    res.json(group);
  } catch (err) {
    console.error("getGroupById error:", err.message);
    res.status(500).json({ message: err.message });
  }
};


export const addMembersByEmail = async (req, res) => {
  try {
    const { emails } = req.body;
    const { groupId } = req.params;

    // 1️⃣ Validate input
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "emails[] required." });
    }

    // 2️⃣ Find the group
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    const uid = asId(req.user);
    if (!sameId(group.createdBy, uid)) {
      return res
        .status(403)
        .json({ message: "Only the group creator can add members." });
    }

    // 3️⃣ Find users by email
    const users = await User.find(
      { email: { $in: emails.map((e) => e.toLowerCase().trim()) } },
      "_id email"
    );

    if (!users.length) {
      return res.status(404).json({ message: "No matching users found." });
    }

    // 4️⃣ Convert all IDs to proper ObjectId (important!)
    const userIds = users.map((u) => new mongoose.Types.ObjectId(u._id));

    // 🟢 FIX 1: Make sure the creator is always in members
    if (!group.members.map(String).includes(String(group.createdBy))) {
      group.members.push(group.createdBy);
    }

    // 🟢 FIX 2: Add new members properly in-memory (not just updateOne)
    group.members = Array.from(
      new Set([...group.members.map(String), ...userIds.map(String)])
    ).map((id) => new mongoose.Types.ObjectId(id));

    await group.save();

    // ✅ Re-fetch with populated data
    const updated = await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    // Notify new members
      await createNotification(
      userIds,
      `You were added to group "${group.name}" by ${req.user.name}`,
      `/groups/${group._id}`,
      "group"
    );


    res.json(updated);
  } catch (err) {
    console.error("❌ addMembersByEmail:", err.message);
    res.status(500).json({ message: err.message });
  }
};


export const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    const uid = asId(req.user);
    if (!sameId(group.createdBy, uid))
      return res
        .status(403)
        .json({ message: "Only the group creator can remove members." });

    if (sameId(group.createdBy, userId))
      return res
        .status(400)
        .json({ message: "Creator cannot be removed from the group." });

    await Group.updateOne({ _id: groupId }, { $pull: { members: userId } });

    const updated = await Group.findById(groupId)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const listAvailableUsers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q = "", limit = 20, page = 1 } = req.query;

    const group = await Group.findById(groupId, "members");
    if (!group) return res.status(404).json({ message: "Group not found." });

    const filter = {
      _id: { $nin: group.members },
      $or: [
        { email: new RegExp(q, "i") },
        { name: new RegExp(q, "i") },
      ],
    };

    const users = await User.find(filter, "name email")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100))
      .skip(((Number(page) || 1) - 1) * (Number(limit) || 20));

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markGroupCompleted = async (req, res) => {
  try {
    const { groupId } = req.params;
    const uid = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (String(group.createdBy) !== String(uid)) {
      return res.status(403).json({ message: "Only the creator can mark as completed" });
    }

    group.isCompleted = true;
    await group.save();

    res.json({ success: true, message: "Trip marked as completed", group });
  } catch (err) {
    console.error("markGroupCompleted error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

