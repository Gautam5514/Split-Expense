import express from "express";
import rateLimit from "express-rate-limit";
import {
  createGroup,
  getGroups,
  getGroupById,
  addMembersByEmail,
  removeMember,
  listAvailableUsers,
  markGroupCompleted,
  updateGroupIcon,
  uploadGroupPhoto,
  removeGroupPhoto,
  deleteGroup,
  generateInviteLink,
  resetInviteLink,
  joinGroupByInvite
} from "../controllers/groupController.js";
import {
  getGroupInvites,
  approveJoinRequest,
  cancelGroupInvite,
  leaveGroup,
} from "../controllers/inviteController.js";
import {
  getGroupMessages,
  sendGroupMessage,
  deleteGroupChats,
  markGroupMessagesSeen,
} from "../controllers/groupChatController.js";
import {
  updateGroupSettings,
  getRecentContacts,
  getGroupSummary,
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from "../controllers/groupExtrasController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Inviting by email sends mail to arbitrary addresses from our domain, so it
// needs a cap or it becomes a spam relay.
const inviteEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id}`,
  message: { message: "Too many invites sent. Please try again later." },
});

// Joining by invite code: throttled so invite codes can't be brute-forced.
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id}`,
  message: { message: "Too many join attempts. Please try again in 15 minutes." },
});

router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getGroups);
// Must sit above "/:groupId" so "recent-contacts" isn't read as a group id.
router.get("/recent-contacts", authMiddleware, getRecentContacts);
router.get("/:groupId", authMiddleware, getGroupById);
router.delete("/:groupId", authMiddleware, deleteGroup);

// list users not in the group (for multi-select UI)
router.get("/:groupId/available-users", authMiddleware, listAvailableUsers);

// add & remove members
router.post("/:groupId/members", authMiddleware, inviteEmailLimiter, addMembersByEmail); // body { emails: [] }
router.delete("/:groupId/members/:userId", authMiddleware, removeMember);
router.put("/:groupId/complete", authMiddleware, markGroupCompleted);
router.put("/:groupId/icon", authMiddleware, updateGroupIcon); // body { icon: "plane" }
router.post("/:groupId/photo", authMiddleware, uploadGroupPhoto); // body { file: "data:image/..." }
router.delete("/:groupId/photo", authMiddleware, removeGroupPhoto);

// Group-type features: settings, type card summary, recurring bills
router.patch("/:groupId/settings", authMiddleware, updateGroupSettings);
router.get("/:groupId/summary", authMiddleware, getGroupSummary);
router.get("/:groupId/recurring", authMiddleware, listRecurring);
router.post("/:groupId/recurring", authMiddleware, createRecurring);
router.patch("/:groupId/recurring/:ruleId", authMiddleware, updateRecurring);
router.delete("/:groupId/recurring/:ruleId", authMiddleware, deleteRecurring);

router.post("/messages/delete", authMiddleware, deleteGroupChats);
router.get("/:groupId/messages", authMiddleware, getGroupMessages);
router.post("/:groupId/message", authMiddleware, sendGroupMessage);
router.post("/:groupId/mark-seen", authMiddleware, markGroupMessagesSeen);

// 🆕 SplitLink: Generate invite + Join via code
router.post("/:groupId/invite", authMiddleware, generateInviteLink);
router.post("/:groupId/invite/reset", authMiddleware, resetInviteLink);
router.get("/:groupId/invites", authMiddleware, getGroupInvites);
router.post("/:groupId/invites/:inviteId/approve", authMiddleware, approveJoinRequest);
router.delete("/:groupId/invites/:inviteId", authMiddleware, cancelGroupInvite);
router.post("/:groupId/leave", authMiddleware, leaveGroup);
router.post("/join/:inviteCode", authMiddleware, joinLimiter, joinGroupByInvite);



export default router;
