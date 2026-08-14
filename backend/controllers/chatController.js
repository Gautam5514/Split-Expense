import mongoose from "mongoose";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import UserProfile from "../models/userProfileModel.js";
import cloudinary from "../config/cloudinary.js";
import Group from "../models/groupModel.js";
import { onlineUsers } from "../index.js";
import { sendPushToUsers } from "./notificationController.js";
import { isValidObjectId } from "../middleware/validate.js";

// Recipients whose socket sits in the given room are actively viewing that
// conversation — they see the message live and shouldn't also get a push.
export const usersViewingRoom = (io, roomName) => {
  const room = io?.sockets?.adapter?.rooms?.get(roomName);
  const viewing = new Set();
  if (!room) return viewing;
  for (const [userId, socketId] of onlineUsers) {
    if (room.has(socketId)) viewing.add(userId);
  }
  return viewing;
};

export const chatPushBody = (text, hasMedia) =>
  text
    ? text.length > 120
      ? `${text.slice(0, 117)}...`
      : text
    : hasMedia
    ? "Sent an attachment"
    : "New message";

// ---------------------------------------------
// CREATE OR GET CONVERSATION
// ---------------------------------------------
export const getOrCreateConversation = async (req, res) => {
  try {
    const { otherEmail } = req.body;
    const me = req.user.id;

    const other = await User.findOne({ email: otherEmail });
    if (!other) return res.status(404).json({ message: "User not found" });

    let convo = await Conversation.findOne({
      members: { $all: [me, other._id] },
    });

    if (!convo) {
      convo = await Conversation.create({
        members: [me, other._id],
        unread: {},
      });
    }

    await User.findByIdAndUpdate(me, {
      $pull: { hiddenDirectChats: other._id },
    });

    res.json(convo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------
// GET CONVERSATIONS (for full chat list page)
// ---------------------------------------------
export const getConversations = async (req, res) => {
  try {
    const me = req.user.id;

    const convos = await Conversation.find({ members: me })
      .populate("members", "name email photoURL isOnline lastActive")
      .sort({ lastMessageAt: -1 })
      .lean();

    const memberIds = convos.flatMap((c) =>
      c.members.map((m) => m._id.toString())
    );

    const profiles = await UserProfile.find({
      userId: { $in: memberIds },
    }).select("userId profileImage.url");

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.userId.toString()] = p.profileImage?.url || null;
    });

    const formatted = convos.map((c) => {
      const other = c.members.find((m) => m._id.toString() !== me);

      const imageUrl =
        other.photoURL || profileMap[other._id.toString()] || null;

      return {
        _id: c._id,
        user: {
          _id: other._id,
          name: other.name,
          email: other.email,
          imageUrl,
          isOnline: other.isOnline,
          lastActive: other.lastActive,
        },
        lastMessage: c.lastMessage || "",
        lastMessageAt: c.lastMessageAt || c.updatedAt,
        unread: (c.unread && c.unread[me]) || 0,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ message: "Error fetching conversations" });
  }
};

// ---------------------------------------------
// GET MESSAGES FOR A CONVERSATION (cursor-paginated)
// GET /api/chat/:id/messages?before=<messageId>&limit=40
// ---------------------------------------------
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user.id;
    const { before, limit = 40 } = req.query;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const convo = await Conversation.findById(id).select("members").lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    const isMember = (convo.members || []).some((m) => String(m) === String(me));
    if (!isMember) {
      return res.status(403).json({ message: "You are not a participant in this conversation" });
    }

    const query = { conversationId: id };
    // Cursor: fetch messages older than the given message ID
    if (before && isValidObjectId(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    // Fetch newest N messages first, then reverse so UI gets chronological order
    const msgs = await Message.find(query)
      .sort({ _id: -1 })
      .limit(Math.min(Number(limit), 100))
      .populate("sender", "name email photoURL")
      .lean();

    msgs.reverse();

    if (msgs.length === 0) return res.json([]);

    // Batch profile lookup using a Map for O(1) merge
    const senderIds = [...new Set(msgs.map((m) => m.sender?._id?.toString()).filter(Boolean))];
    const profiles = await UserProfile.find({ userId: { $in: senderIds } })
      .select("userId profileImage.url")
      .lean();

    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p.profileImage?.url || null]));

    const finalMsgs = msgs.map((m) => ({
      ...m,
      sender: {
        ...m.sender,
        imageUrl: m.sender?.photoURL || profileMap.get(m.sender._id.toString()) || null,
      },
    }));

    res.json(finalMsgs);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------
// SEND MESSAGE
// ---------------------------------------------
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, file } = req.body;
    const sender = req.user.id;

    if (!conversationId || !isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    const isMember = (convo.members || []).some((m) => String(m) === String(sender));
    if (!isMember) {
      return res.status(403).json({ message: "You are not a participant in this conversation" });
    }

    let mediaData = null;

    if (file) {
      const uploaded = await cloudinary.uploader.upload(file, {
        folder: "splitwise_chat_media",
        resource_type: "auto",
      });

      mediaData = {
        url: uploaded.secure_url,
        resource_type: uploaded.resource_type,
      };
    }

    const message = await Message.create({
      conversationId,
      sender,
      text: text || "",
      mediaUrl: mediaData?.url || null,
      mediaType: mediaData?.resource_type || null,
      seenBy: [sender],
    });

    convo.lastMessage = text || (mediaData ? "📎 Media" : "");
    convo.lastMessageAt = new Date();

    await User.updateMany(
      { _id: { $in: convo.members } },
      { $pull: { hiddenDirectChats: { $in: convo.members } } }
    );

    convo.members.forEach((m) => {
      if (m.toString() !== sender.toString()) {
        convo.unread = convo.unread || {};
        convo.unread[m] = (convo.unread[m] || 0) + 1;
      }
    });

    await convo.save();

    const io = req.app.get("io");
    if (io) io.to(conversationId).emit("newMessage", { ...message.toObject() });

    res.json({ data: message });

    // Push to members not actively viewing this conversation (fire-and-forget,
    // after the response so it never adds latency to the send).
    const viewing = usersViewingRoom(io, String(conversationId));
    const pushRecipients = convo.members
      .map(String)
      .filter((m) => m !== String(sender) && !viewing.has(m));

    if (pushRecipients.length) {
      sendPushToUsers(pushRecipients, {
        title: req.user.name || "New message",
        body: chatPushBody(text, !!mediaData),
        data: {
          link: "/chat",
          type: "chat",
          senderId: String(sender),
          senderName: req.user.name || "",
          senderEmail: req.user.email || "",
        },
      }).catch((err) => console.error("chat push error:", err.message));
    }
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------
// GET ONLY REAL CONTACTS (GROUP MEMBERS + CHAT USERS)
// ---------------------------------------------
export const getMyContacts = async (req, res) => {
  try {
    const me = req.user.id;

    // All 3 are independent - run in parallel
    const [groups, currentUser, convos] = await Promise.all([
      Group.find({ members: me }).select("members").lean(),
      User.findById(me).select("hiddenDirectChats").lean(),
      Conversation.find({ members: me }).select("members lastMessage lastMessageAt unread").lean(),
    ]);

    const hiddenDirect = new Set(
      (currentUser?.hiddenDirectChats || []).map((id) => id.toString())
    );

    const related = new Set();

    groups.forEach((g) => {
      g.members.forEach((m) => {
        const memberId = m.toString();
        if (memberId !== me && !hiddenDirect.has(memberId)) related.add(memberId);
      });
    });

    convos.forEach((c) => {
      c.members.forEach((m) => {
        const memberId = m.toString();
        if (memberId !== me && !hiddenDirect.has(memberId)) related.add(memberId);
      });
    });

    const ids = Array.from(related);

    if (ids.length === 0) return res.json({ items: [] });

    // Batch both user lookups in parallel - Map for O(1) merge
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: ids } }, "_id name email photoURL isOnline lastActive").lean(),
      UserProfile.find({ userId: { $in: ids } }).select("userId profileImage.url").lean(),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p.profileImage?.url || null]));

    // attach lastMessage info
    const convoMap = {};
    convos.forEach((c) => {
      const other = c.members.find((m) => m.toString() !== me.toString());
      convoMap[other.toString()] = {
        lastMessage: c.lastMessage || "",
        lastMessageAt: c.lastMessageAt || c.updatedAt,
        unread: (c.unread && c.unread[me]) || 0,
      };
    });

    const final = users
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        imageUrl: u.photoURL || profileMap.get(u._id.toString()) || null,
        isOnline: u.isOnline,
        lastActive: u.lastActive,
        lastMessage: convoMap[u._id.toString()]?.lastMessage || "",
        lastMessageAt:
          convoMap[u._id.toString()]?.lastMessageAt || new Date(0),
        unread: convoMap[u._id.toString()]?.unread || 0,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );

    res.json({ items: final });
  } catch (err) {
    console.error("getMyContacts error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const resetUnreadCount = async (req, res) => {
  try {
    const me = req.user.id;
    const { otherUserId } = req.body;

    const convo = await Conversation.findOne({
      members: { $all: [me, otherUserId] }
    });

    if (!convo) return res.json({ message: "No conversation" });

    convo.unread = convo.unread || {};
    convo.unread[me] = 0;

    await convo.save();

    // Mark all incoming messages in this conversation as seen by me
    await Message.updateMany(
      {
        conversationId: convo._id,
        sender: otherUserId,
        seenBy: { $ne: me }
      },
      {
        $addToSet: { seenBy: me }
      }
    );

    // Emit live seen event to conversation socket room
    const io = req.app.get("io");
    if (io) {
      io.to(convo._id.toString()).emit("messagesSeen", {
        conversationId: convo._id.toString(),
        seenBy: me,
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteConversations = async (req, res) => {
  try {
    const me = req.user.id;
    const { userIds = [] } = req.body;

    const ids = [...new Set(userIds.map(String).filter(Boolean))];
    if (!ids.length) {
      return res.status(400).json({ message: "No conversations selected" });
    }

    const convos = await Conversation.find({
      members: me,
      $or: ids.map((id) => ({ members: id })),
    }).select("_id members");

    const convoIds = convos.map((c) => c._id);
    if (convoIds.length) {
      await Message.deleteMany({ conversationId: { $in: convoIds } });
      await Conversation.deleteMany({ _id: { $in: convoIds } });
    }

    await User.findByIdAndUpdate(me, {
      $addToSet: { hiddenDirectChats: { $each: ids } },
    });

    res.json({
      success: true,
      deleted: convoIds.length,
      userIds: ids,
    });
  } catch (err) {
    console.error("deleteConversations error:", err);
    res.status(500).json({ message: err.message });
  }
};
