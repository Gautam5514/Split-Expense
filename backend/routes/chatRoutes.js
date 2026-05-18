import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  getMyContacts,
  resetUnreadCount,
  deleteConversations
} from "../controllers/chatController.js";

const router = express.Router();

// Create or fetch a conversation by email
router.post("/conversation", authMiddleware, getOrCreateConversation);

// List all my conversations
router.get("/conversations", authMiddleware, getConversations);

// Get messages for a conversation
router.get("/messages/:id", authMiddleware, getMessages);

// Send message (text or media)
router.post("/message", authMiddleware, sendMessage);

router.get("/my-contacts", authMiddleware, getMyContacts);

router.post("/reset-unread", authMiddleware, resetUnreadCount);

router.post("/delete-conversations", authMiddleware, deleteConversations);

export default router;
