import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "./firebaseClient";

const SW_PATH = "/firebase-messaging-sw.js";

/**
 * Register (or reuse) the FCM service worker and wait until it is fully active.
 */
async function getActiveSWRegistration() {
  if (!("serviceWorker" in navigator)) return undefined;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });

    if (reg.active) return reg;

    return new Promise((resolve) => {
      const sw = reg.installing ?? reg.waiting;
      if (!sw) {
        resolve(reg);
        return;
      }
      sw.addEventListener("statechange", function onStateChange() {
        if (this.state === "activated") {
          sw.removeEventListener("statechange", onStateChange);
          resolve(reg);
        }
      });
      // Safety timeout — if the SW stalls, resolve anyway so getToken can proceed
      setTimeout(() => resolve(reg), 10_000);
    });
  } catch (err) {
    console.error("❌ Service worker registration failed:", err);
    return undefined;
  }
}

/**
 * Request push permission and return the FCM registration token.
 * Returns null when unsupported, denied, or misconfigured.
 */
export const getNotificationPermission = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return null;

    const supported = await isSupported();
    if (!supported) {
      console.warn("⚠️ FCM not supported in this browser");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("⚠️ Notification permission not granted:", permission);
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
    if (!vapidKey) {
      console.error("❌ NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured");
      return null;
    }

    const swRegistration = await getActiveSWRegistration();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.error("❌ FCM returned an empty token — check VAPID key and service worker");
    }

    return token || null;
  } catch (err) {
    console.error("❌ Error retrieving FCM token:", err);
    return null;
  }
};

/**
 * Subscribe to foreground messages (app is open and focused).
 * Returns an unsubscribe function.
 */
export const onForegroundMessage = async (callback) => {
  try {
    if (typeof window === "undefined") return () => {};
    const supported = await isSupported();
    if (!supported) return () => {};

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      if (callback) callback(payload);
    });
  } catch (err) {
    console.error("❌ Error setting up foreground message listener:", err);
    return () => {};
  }
};
