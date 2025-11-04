import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserNotifications);
router.put("/mark-read", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markNotificationAsRead); // ✅ this one

export default router;
