import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "./firebaseClient";
import { purgeStaleFirebaseDatabases } from "./firebaseIdbGuard";

const SW_PATH = "/firebase-messaging-sw.js";

/**
 * Ensure the FCM service worker is registered and active before getToken() runs.
 * Returning the registration lets getToken() use this exact worker instead of
 * trying its own default registration and timing out.
 */
async function getActiveSWRegistration() {
  if (!("serviceWorker" in navigator)) return undefined;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active && existing.active.scriptURL.endsWith(SW_PATH)) {
      return existing;
    }

    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });

    if (reg.active) return reg;

    // Wait for the SW to finish installing → activating
    return await new Promise((resolve) => {
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
      setTimeout(() => resolve(reg), 10_000); // safety timeout
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

    // Clear any stale higher-versioned Firebase IndexedDB stores before FCM
    // reads its token cache, otherwise getToken() fails with a VersionError.
    await purgeStaleFirebaseDatabases();

    const swRegistration = await getActiveSWRegistration();
    const messaging = getMessaging(app);

    const requestToken = () =>
      getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });

    let token;
    try {
      token = await requestToken();
    } catch (err) {
      if (err?.name !== "VersionError" && !/existing version/i.test(err?.message ?? "")) {
        throw err;
      }
      // The open() guard has now deleted the offending database, so this second
      // attempt gets a freshly created store at the version the SDK expects.
      console.warn("⚠️ Stale FCM IndexedDB detected - retrying getToken()");
      token = await requestToken();
    }

    if (!token) {
      console.error("❌ FCM returned an empty token - check VAPID key and SW registration");
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
