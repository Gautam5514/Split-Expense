import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
  registerPushToken,
  unregisterPushToken,
  registerOneSignalSubscription,
  unregisterOneSignalSubscription,
  sendOneSignalTestNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserNotifications);
router.post("/push-token", authMiddleware, registerPushToken);
router.delete("/push-token", authMiddleware, unregisterPushToken);



// 🌐 Browser OneSignal push subscription registration
router.post("/register-onesignal", authMiddleware, registerOneSignalSubscription);
router.delete("/unregister-onesignal", authMiddleware, unregisterOneSignalSubscription);
router.post("/send-onesignal-test", authMiddleware, sendOneSignalTestNotification);

router.put("/mark-read", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markNotificationAsRead);

export default router;
