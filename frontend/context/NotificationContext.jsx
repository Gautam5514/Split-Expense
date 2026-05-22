"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { BellRing, Clock3, ReceiptText, UsersRound, AlertTriangle, AlertCircle, Info, Copy, ShieldCheck, Send } from "lucide-react";


const NotificationContext = createContext();

const getNotificationMeta = (type) => {
  if (type === "expense") {
    return {
      label: "Expense update",
      Icon: ReceiptText,
      iconClass: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/15",
      accentClass: "from-emerald-500/20 via-transparent to-violet-500/10",
    };
  }

  return {
    label: "Group update",
    Icon: UsersRound,
    iconClass: "bg-violet-500/10 text-violet-500 ring-violet-500/15",
    accentClass: "from-violet-500/20 via-transparent to-indigo-500/10",
  };
};

const formatToastTime = (value) => {
  if (!value) return "Just now";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isMongoObjectId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const playNotificationTune = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);

    const notes = [
      { frequency: 880, start: 0, duration: 0.08 },
      { frequency: 1175, start: 0.09, duration: 0.1 },
      { frequency: 988, start: 0.2, duration: 0.12 },
    ];

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration);
    });

    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38);
    setTimeout(() => context.close(), 700);
  } catch {
    // Browsers can block autoplay until the user interacts with the page.
  }
};

function NotificationToast({ notif, visible }) {
  const { label, Icon, iconClass, accentClass } = getNotificationMeta(notif.type);

  return (
    <div
      className={`pointer-events-auto w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 text-foreground shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      <div className={`h-1 bg-gradient-to-r ${accentClass}`} />
      <div className="relative p-4">
        <div className={`absolute inset-0 bg-gradient-to-br ${accentClass}`} />
        <div className="relative flex gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
            <Icon size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 size={12} />
                {formatToastTime(notif.createdAt)}
              </span>
            </div>

            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {notif.message}
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <BellRing size={13} className="text-violet-500" />
              <span>New notification received</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const pathname = usePathname();
  const cleanPath = pathname?.replace(/\/$/, "") || "";
  const isAuthPage = cleanPath.startsWith("/login") || 
                     cleanPath.startsWith("/register") || 
                     cleanPath.startsWith("/reset-password");
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);

  // Helper to resolve the active VAPID public key (from process.env or local storage if exists)
  const getActiveVapidKey = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("split_ease_vapid_key");
      if (stored) return stored;
    }
    const envKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    return envKey && envKey !== "YOUR_VAPID_PUBLIC_KEY_HERE" ? envKey : null;
  };

  // Helper to handle FCM setup and silent automatic permission request
  const runSetup = async () => {
    if (!token) return;

    const activeKey = getActiveVapidKey();
    if (!activeKey) {
      console.warn("⚠️ FCM Setup: VAPID Key is not configured in .env");
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;

      // Smart/Silent automatic permission request if default
      if (permission === "default") {
        try {
          console.log("📣 FCM Setup: Automatically requesting notification permission...");
          permission = await Notification.requestPermission();
        } catch (err) {
          console.warn("⚠️ FCM Setup: Notification auto-permission request failed:", err);
          return;
        }
      }

      if (permission !== "granted") {
        console.log("ℹ️ FCM Setup: Notification permission is blocked or denied.");
        return;
      }
    }

    try {
      const { getNotificationPermission } = await import("@/lib/firebaseMessaging");
      const fcmRegToken = await getNotificationPermission(activeKey);
      if (fcmRegToken) {
        console.log("🚀 FCM registration token retrieved successfully");
        setFcmToken(fcmRegToken);
        // Register on backend silently
        await api.post("/notifications/register-fcm", { token: fcmRegToken });
      }
    } catch (err) {
      console.error("❌ FCM Setup error:", err);
    }
  };

  // 🔔 1. Setup Firebase Cloud Messaging (FCM) silently on login
  useEffect(() => {
    if (!token) {
      setFcmToken(null);
      return;
    }

    let unsubscribeForeground = null;

    const setupFCM = async () => {
      await runSetup();

      try {
        const { onForegroundMessage } = await import("@/lib/firebaseMessaging");
        // Listen for foreground FCM alerts
        unsubscribeForeground = await onForegroundMessage((payload) => {
          console.log("🔔 FCM Foreground Message received:", payload);
          toast.custom(
            (t) => (
              <NotificationToast
                notif={{
                  type: payload.data?.type || "group",
                  message: payload.notification?.body || "You have a new update!",
                  createdAt: new Date().toISOString(),
                }}
                visible={t.visible}
              />
            ),
            {
              position: "top-right",
              duration: 5200,
            }
          );
        });
      } catch (err) {
        console.warn("⚠️ FCM foreground listener warning:", err.message);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [token]);

  // ✅ Load existing notifications from DB
  useEffect(() => {
    if (!token) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(res.data || []);
        const unread = res.data.some((n) => !n.isRead);
        setHasUnread(unread);
      } catch (err) {
        console.error("Failed to load notifications:", err.message);
      }
    };
    fetchNotifications();
  }, [token]);

  // ✅ Handle Socket.IO live updates
  // ✅ Handle Socket.IO live updates
  useEffect(() => {
    if (!token) return;

    const socketInstance = io(API_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // 🧠 Instead of sending userId, send the *token*
    socketInstance.emit("register", token);

    socketInstance.on("connect", () => {
      console.log("🟢 Socket connected for notifications");
    });

    socketInstance.on("notification", (notif) => {
      console.log("🔔 Received notification:", notif);

      setNotifications((prev) => [notif, ...prev]);
      setHasUnread(true);
      playNotificationTune();

      toast.custom(
        (t) => <NotificationToast notif={notif} visible={t.visible} />,
        {
          position: "top-right",
          duration: 5200,
        }
      );
    });

    return () => socketInstance.disconnect();
  }, [token]);

  // ✅ Mark all notifications as read (API call)
  const markAllAsRead = async () => {
    try {
      await api.put(
        "/notifications/mark-read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications([]); // Clear list from dropdown
      setHasUnread(false);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err.message);
    }
  };

  // ✅ Mark a single notification as read
  const markOneAsRead = async (id) => {
    if (!isMongoObjectId(id)) {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      return;
    }

    try {
      await api.put(
        `/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Failed to mark notification as read:", err.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        hasUnread,
        setHasUnread,
        markAllAsRead,
        markOneAsRead,
        fcmToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
