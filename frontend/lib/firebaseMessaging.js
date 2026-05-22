import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "./firebaseClient";

/**
 * Helper to request push notification permission and return the FCM registration token.
 */
export const getNotificationPermission = async (customVapidKey = null) => {
  try {
    // 🧠 1. SSR check (ensure browser context)
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("⚠️ Push notifications are not supported in this environment (non-browser).");
      return null;
    }

    // 🧠 2. Check if FCM is supported in this browser
    const supported = await isSupported();
    if (!supported) {
      console.warn("⚠️ Firebase Messaging is not supported in this browser (e.g. Safari incognito, older browsers).");
      return null;
    }

    // 🧠 3. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("⚠️ Notification permission was denied by the user.");
      return null;
    }

    // 🧠 4. Get FCM instance and retrieve token
    const messaging = getMessaging(app);
    const vapidKey = customVapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey || vapidKey === "YOUR_VAPID_PUBLIC_KEY_HERE") {
      console.warn("⚠️ NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured or still set to placeholder in .env.");
      return null;
    }

    // 🔒 Robust Validation: VAPID keys must be exactly 87 characters (uncompressed EC public key in base64url)
    const cleanVapidKey = vapidKey.trim();
    if (cleanVapidKey.length !== 87) {
      const errorMsg = `VAPID Public Key is malformed (expected 87 characters, got ${cleanVapidKey.length}). Please verify that you copied the complete key from the Firebase Console without truncation.`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // 🧠 5. Retrieve registration token from Firebase
    const currentToken = await getToken(messaging, { vapidKey: cleanVapidKey });
    if (currentToken) {
      return currentToken;
    } else {
      console.warn("⚠️ No FCM registration token available. Request permission to generate one.");
      return null;
    }
  } catch (error) {
    console.error("❌ An error occurred while retrieving FCM token:", error);
    return null;
  }
};

/**
 * Listen to foreground messages (when the application is active and focused).
 */
export const onForegroundMessage = async (callback) => {
  try {
    if (typeof window === "undefined") return null;
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      console.log("🔔 Foreground notification payload received:", payload);
      if (callback) callback(payload);
    });
  } catch (error) {
    console.error("❌ Error setting up foreground message listener:", error);
    return null;
  }
};
