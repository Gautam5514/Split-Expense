import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
  registerPushToken,
  unregisterPushToken,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserNotifications);
router.post("/push-token", authMiddleware, registerPushToken);
router.delete("/push-token", authMiddleware, unregisterPushToken);
router.put("/mark-read", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markNotificationAsRead); // ✅ this one

export default router;
