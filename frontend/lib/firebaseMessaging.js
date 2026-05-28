import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "./firebaseClient";

const SW_PATH = "/firebase-messaging-sw.js";

/**
 * Register (or reuse) the FCM service worker and wait until it is fully active.
 * Using the specific registration — not navigator.serviceWorker.ready — avoids
 * accidentally passing a different SW to getToken().
 */
async function getActiveSWRegistration() {
  if (!("serviceWorker" in navigator)) return undefined;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });

    // Already active — return immediately
    if (reg.active) return reg;

    // Waiting for install → activate lifecycle
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
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
    if (!vapidKey || vapidKey.length !== 87) {
      console.error(
        `❌ VAPID key malformed — expected 87 chars, got ${vapidKey?.length ?? 0}`
      );
      return null;
    }

    const swRegistration = await getActiveSWRegistration();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });

    return token || null;
  } catch (err) {
    console.error("❌ Error retrieving FCM token:", err);
    return null;
  }
};

/**
 * Subscribe to foreground messages (app is open and focused).
 * FCM does NOT show a system notification in this state — the returned
 * unsubscribe function must be called on cleanup to avoid leaks.
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
