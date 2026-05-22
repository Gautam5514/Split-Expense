import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
  registerPushToken,
  unregisterPushToken,
  registerFcmToken,
  unregisterFcmToken,
  sendTestNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserNotifications);
router.post("/push-token", authMiddleware, registerPushToken);
router.delete("/push-token", authMiddleware, unregisterPushToken);

// 🌐 Browser FCM push token registration
router.post("/register-fcm", authMiddleware, registerFcmToken);
router.delete("/unregister-fcm", authMiddleware, unregisterFcmToken);
router.post("/send-test", authMiddleware, sendTestNotification);

router.put("/mark-read", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markNotificationAsRead);

export default router;
