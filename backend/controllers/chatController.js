import mongoose from "mongoose";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import UserProfile from "../models/userProfileModel.js";
import cloudinary from "../config/cloudinary.js";
import Group from "../models/groupModel.js";
import { onlineUsers } from "../index.js";
import { sendPushToUsers } from "./notificationController.js";
import { isValidObjectId, normalizeEmail } from "../middleware/validate.js";
import { getContactIds, isBlockedBetween } from "../utils/contacts.js";

const MAX_MESSAGE_LENGTH = 20000;
import { uploadRejectionReason, CHAT_MIME_TYPES } from "../utils/uploadSecurity.js";

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
    // Accepts the other person's id (search results only carry a masked email
    // for people you don't know yet) or, for older clients, their full email.
    const otherEmail = normalizeEmail(req.body.otherEmail);
    const otherUserId = req.body.otherUserId;
    const me = req.user.id;
    if (!otherEmail && !isValidObjectId(otherUserId))
      return res.status(400).json({ message: "A valid email is required." });

    const other = await User.findOne(isValidObjectId(otherUserId) ? { _id: otherUserId } : { email: otherEmail })
      .select("_id privacy blockedUsers");
    if (!other) return res.status(404).json({ message: "User not found" });
    if (String(other._id) === String(me))
      return res.status(400).json({ message: "You can't start a conversation with yourself." });

    // Same rules as people search: blocked either way, or a stranger who
    // turned off email discovery, looks exactly like "not found".
    const meDoc = await User.findById(me).select("blockedUsers").lean();
    if (isBlockedBetween(meDoc, other)) return res.status(404).json({ message: "User not found" });
    const existing = await Conversation.findOne({ members: { $all: [me, other._id] } }).select("_id").lean();
    if (!existing && other.privacy?.discoverableByEmail === false) {
      const contacts = await getContactIds(me);
      if (!contacts.has(String(other._id))) return res.status(404).json({ message: "User not found" });
    }

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
    res.status(500).json({ message: "Error fetching conversations", expose: true });
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
      .limit(Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100))
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
    const { conversationId, file } = req.body;
    const sender = req.user.id;

    if (!conversationId || !isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    if (req.body.text !== undefined && req.body.text !== null && typeof req.body.text !== "string")
      return res.status(400).json({ message: "Message text must be a string." });
    const text = (req.body.text || "").trim() ? req.body.text : "";
    if (text.length > MAX_MESSAGE_LENGTH)
      return res.status(400).json({ message: `Messages must be under ${MAX_MESSAGE_LENGTH} characters.` });
    if (!text && !file)
      return res.status(400).json({ message: "Message is empty." });

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    const isMember = (convo.members || []).some((m) => String(m) === String(sender));
    if (!isMember) {
      return res.status(403).json({ message: "You are not a participant in this conversation" });
    }

    // A block stops direct messages in both directions.
    const otherIds = (convo.members || []).map(String).filter((m) => m !== String(sender));
    if (otherIds.length) {
      const people = await User.find({ _id: { $in: [sender, ...otherIds] } }).select("blockedUsers").lean();
      const meDoc = people.find((p) => String(p._id) === String(sender));
      if (people.filter((p) => String(p._id) !== String(sender)).some((o) => isBlockedBetween(meDoc, o)))
        return res.status(403).json({ message: "You can't message this person." });
    }

    let mediaData = null;

    if (file) {
      const rejection = uploadRejectionReason(file, CHAT_MIME_TYPES);
      if (rejection) return res.status(400).json({ message: rejection });
      const uploaded = await cloudinary.uploader.upload(file, {
        folder: "splitwise_chat_media",
        resource_type: "auto",
      });

      mediaData = {
        url: uploaded.secure_url,
        resource_type: uploaded.resource_type,
      };
    }

    // Recipients with a live socket right now have received it the moment it's
    // broadcast below; everyone else is marked delivered when they next connect.
    const onlineRecipients = convo.members
      .map(String)
      .filter((m) => m !== String(sender) && onlineUsers.has(m));

    const message = await Message.create({
      conversationId,
      sender,
      text: text || "",
      mediaUrl: mediaData?.url || null,
      mediaType: mediaData?.resource_type || null,
      seenBy: [sender],
      deliveredTo: onlineRecipients,
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
        conversationId: c._id,
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
        // Lets the chat window skip the get-or-create round trip for
        // contacts that already have a conversation.
        conversationId: convoMap[u._id.toString()]?.conversationId || null,
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

// ---------------------------------------------
// GET ONE CONTACT'S DETAILS PANEL DATA
// Only for users who already share a conversation or a group with the
// caller - same "related" trust boundary as getMyContacts, so this can't
// be used to scrape arbitrary strangers' profiles.
// ---------------------------------------------
export const getContactProfile = async (req, res) => {
  try {
    const me = req.user.id;
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (userId === me) {
      return res.status(400).json({ message: "Cannot fetch your own contact profile" });
    }

    const [sharesConvo, sharesGroup] = await Promise.all([
      Conversation.exists({ members: { $all: [me, userId] } }),
      Group.exists({ members: { $all: [me, userId] } }),
    ]);
    if (!sharesConvo && !sharesGroup) {
      return res.status(403).json({ message: "Not a contact" });
    }

    const [user, profile] = await Promise.all([
      User.findById(userId).select("_id name email photoURL createdAt").lean(),
      UserProfile.findOne({ userId }).select("profileImage.url mobile city profession bio").lean(),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      imageUrl: user.photoURL || profile?.profileImage?.url || null,
      mobile: profile?.mobile || null,
      city: profile?.city || null,
      profession: profile?.profession || null,
      bio: profile?.bio || null,
      memberSince: user.createdAt,
    });
  } catch (err) {
    console.error("getContactProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ---------------------------------------------
// CONVERSATION SUMMARY (contact info page)
// GET /api/chat/conversation/:id/summary
// Only the two participants can read it. Read-only.
// ---------------------------------------------
const SUMMARY_MEDIA_LIMIT = 60;

export const getConversationSummary = async (req, res) => {
  try {
    const me = req.user.id;
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid conversation ID" });

    const convo = await Conversation.findById(id).select("members").lean();
    if (!convo) return res.status(404).json({ message: "Conversation not found" });
    const members = (convo.members || []).map(String);
    if (!members.includes(String(me))) {
      return res.status(403).json({ message: "You are not a participant in this conversation" });
    }
    const otherId = members.find((m) => m !== String(me));

    // Voice notes are uploaded as media too, but they aren't photos/videos.
    const mediaFilter = { conversationId: id, mediaUrl: { $nin: [null, ""] }, text: { $ne: "[Voice Message]" } };

    const [messageCount, mediaCount, media, commonGroups] = await Promise.all([
      Message.countDocuments({ conversationId: id }),
      Message.countDocuments(mediaFilter),
      Message.find(mediaFilter)
        .sort({ _id: -1 })
        .limit(SUMMARY_MEDIA_LIMIT)
        .select("_id mediaUrl mediaType sender createdAt")
        .lean(),
      otherId
        ? Group.find({ members: { $all: [me, otherId] } })
            .select("_id name icon photo.url members isCompleted")
            .sort({ updatedAt: -1 })
            .lean()
        : [],
    ]);

    res.json({
      messageCount,
      mediaCount,
      media: media.map((m) => ({
        _id: m._id,
        url: m.mediaUrl,
        type: m.mediaType || "image",
        sender: m.sender,
        createdAt: m.createdAt,
      })),
      commonGroups: commonGroups.map((g) => ({
        _id: g._id,
        name: g.name,
        icon: g.icon || null,
        photoUrl: g.photo?.url || null,
        memberCount: (g.members || []).length,
        isCompleted: !!g.isCompleted,
      })),
    });
  } catch (err) {
    console.error("getConversationSummary error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const resetUnreadCount = async (req, res) => {
  try {
    const me = req.user.id;
    const { otherUserId } = req.body;
    if (!isValidObjectId(otherUserId)) return res.status(400).json({ message: "Invalid user id" });

    const convo = await Conversation.findOne({
      members: { $all: [me, otherUserId] }
    });

    if (!convo) return res.json({ message: "No conversation" });

    convo.unread = convo.unread || {};
    convo.unread[me] = 0;

    await convo.save();

    // Mark all incoming messages in this conversation as seen by me
    // (seen implies delivered, so record both).
    await Message.updateMany(
      {
        conversationId: convo._id,
        sender: otherUserId,
        seenBy: { $ne: me }
      },
      {
        $addToSet: { seenBy: me, deliveredTo: me }
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
    if (!Array.isArray(userIds) || userIds.length > 100)
      return res.status(400).json({ message: "Invalid selection" });

    const ids = [...new Set(userIds.map(String).filter(isValidObjectId))];
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
