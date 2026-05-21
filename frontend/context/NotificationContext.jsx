"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { BellRing, Clock3, ReceiptText, UsersRound, AlertTriangle, AlertCircle, Info, Copy, ShieldCheck } from "lucide-react";


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
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [vapidKeyConfigured, setVapidKeyConfigured] = useState(false);
  const [fcmError, setFcmError] = useState(null);
  const [customVapidInput, setCustomVapidInput] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Helper to resolve the active VAPID public key (local storage OR process.env)
  const getActiveVapidKey = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("split_ease_vapid_key");
      if (stored) return stored;
    }
    const envKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    return envKey && envKey !== "YOUR_VAPID_PUBLIC_KEY_HERE" ? envKey : null;
  };

  // Helper to re-run FCM token retrieval
  const runSetup = async (forcedKey = null) => {
    if (!token) return;

    const activeKey = forcedKey || getActiveVapidKey();
    const isConfigured = !!activeKey;
    setVapidKeyConfigured(isConfigured);

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    if (!isConfigured) {
      console.warn("⚠️ FCM Setup: VAPID Key is not configured yet. Paste it in the UI or set NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env");
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      console.log("ℹ️ FCM Setup: Notification permission is not granted yet.");
      return;
    }

    try {
      setFcmError(null);
      const { getNotificationPermission } = await import("@/lib/firebaseMessaging");
      const fcmRegToken = await getNotificationPermission(activeKey);
      if (fcmRegToken) {
        console.log("🚀 FCM registration token retrieved successfully:", fcmRegToken);
        setFcmToken(fcmRegToken);
        // Register on backend
        await api.post("/notifications/register-fcm", { token: fcmRegToken });
      } else {
        setFcmError("Token retrieval returned empty. Check browser console logs.");
      }
    } catch (err) {
      console.error("❌ FCM Setup error:", err);
      setFcmError(err.message || "Failed to initialize Firebase Messaging.");
    }
  };

  const saveLocalVapidKey = async () => {
    if (!customVapidInput.trim()) {
      toast.error("Please enter a valid VAPID Public Key first.");
      return;
    }
    const cleanKey = customVapidInput.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("split_ease_vapid_key", cleanKey);
      toast.success("VAPID Key applied locally!");
      await runSetup(cleanKey);
    }
  };

  const clearLocalVapidKey = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("split_ease_vapid_key");
      setFcmToken(null);
      setVapidKeyConfigured(false);
      setCustomVapidInput("");
      setNotificationPermission("default");
      toast.success("Custom VAPID Key removed!");
    }
  };

  // 🔔 1. Setup Firebase Cloud Messaging (FCM) on login
  useEffect(() => {
    if (!token) {
      setFcmToken(null);
      setFcmError(null);
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
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

  // Request browser permission manually
  const triggerRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications are not supported in this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast.success("Notification permission granted!");
        await runSetup();
      } else if (permission === "denied") {
        toast.error("Notification permission denied. Please allow them in browser settings.");
      }
    } catch (err) {
      console.error("❌ Permission request failed:", err);
      toast.error("Failed to request permission: " + err.message);
    }
  };

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
      {token && !isAuthPage && (() => {
        const isFullyActive = vapidKeyConfigured && notificationPermission === "granted" && fcmToken;
        
        if (isFullyActive && isCollapsed) {
          return (
            <button
              onClick={() => setIsCollapsed(false)}
              className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-zinc-950/90 px-3.5 py-2 shadow-xl backdrop-blur-md hover:bg-zinc-900/95 hover:border-emerald-400 hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer group"
              title="Click to open Web Push Control Center"
            >
              {/* Pulsing indicator */}
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <BellRing size={13} className="text-emerald-400 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 group-hover:text-emerald-400 transition-colors">Push Active</span>
            </button>
          );
        }

        return (
          <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/90 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 max-w-[320px] text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <BellRing size={14} className={fcmToken ? "animate-pulse" : ""} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">Web Push Control Center</span>
              </div>
              {isFullyActive && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.08] hover:bg-white/5 text-white/50 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                  title="Collapse Panel"
                >
                  ✕
                </button>
              )}
            </div>

          {/* Condition 1: Missing VAPID Public Key */}
          {!vapidKeyConfigured && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2 text-amber-400 text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-bold">VAPID Key Missing</span>
                  <span className="text-[11px] text-white/70 leading-relaxed">
                    Firebase needs a Web Push VAPID key. Get it from your Firebase Console and paste it below:
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 rounded bg-white/[0.03] p-2 border border-white/[0.05] text-[10px] text-white/60">
                <div className="flex items-start gap-1">
                  <span className="text-indigo-400">•</span>
                  <span>Go to Project Settings &gt; Cloud Messaging</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="text-indigo-400">•</span>
                  <span>Generate Key Pair under "Web Push certificates"</span>
                </div>
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline font-bold flex items-center gap-1 mt-1 text-[10px]"
                >
                  Open Firebase Console &rarr;
                </a>
              </div>

              <div className="flex flex-col gap-1.5 mt-0.5">
                <input
                  type="text"
                  placeholder="Paste VAPID Public Key here..."
                  value={customVapidInput}
                  onChange={(e) => setCustomVapidInput(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-white/[0.1] px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={saveLocalVapidKey}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 py-1.5 text-[11px] font-semibold text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <ShieldCheck size={13} />
                  Apply & Enable Notifications
                </button>
              </div>

              <div className="text-[9px] text-white/40 text-center border-t border-white/[0.04] pt-2 mt-1">
                Or set <code className="bg-white/10 px-1 py-0.5 rounded text-[9px]">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code> in <code className="bg-white/10 px-1 py-0.5 rounded text-[9px]">.env</code>
              </div>
            </div>
          )}

          {/* Condition 2: VAPID Key is active but Notification Permission is not granted */}
          {vapidKeyConfigured && notificationPermission !== "granted" && (
            <div className="flex flex-col gap-2">
              {notificationPermission === "denied" ? (
                <div className="flex gap-2 text-rose-400 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Notifications Blocked</span>
                    <span className="text-[11px] text-white/70 leading-relaxed">
                      Please reset notification settings in your browser address bar (lock icon) and set to "Allow".
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 text-sky-400 text-xs">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Permission Required</span>
                      <span className="text-[11px] text-white/70 leading-relaxed">
                        SplitEase needs your permission to dispatch native web notifications.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={triggerRequestPermission}
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 py-1.5 text-xs font-semibold text-sky-400 transition-all cursor-pointer"
                  >
                    Enable Notifications
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Condition 3: FCM Token active and copyable */}
          {vapidKeyConfigured && notificationPermission === "granted" && fcmToken && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 text-emerald-400 text-xs">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-emerald-400">Push Status: Active</span>
                  <span className="text-[11px] text-white/70 leading-relaxed">
                    FCM registration token successfully generated and synced with backend.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(fcmToken);
                  toast.success("FCM registration token copied to clipboard!");
                }}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 py-1.5 text-xs font-semibold text-emerald-400 transition-all cursor-pointer"
              >
                <Copy size={13} />
                Copy FCM Device Token
              </button>
              
              {/* Reset Option if custom key was pasted */}
              {typeof window !== "undefined" && localStorage.getItem("split_ease_vapid_key") && (
                <button
                  onClick={clearLocalVapidKey}
                  className="mt-1 text-[10px] text-white/40 hover:text-rose-400 transition-all text-center underline cursor-pointer"
                >
                  Reset / Clear custom VAPID key
                </button>
              )}
            </div>
          )}

          {/* Condition 4: VAPID Key active, permission granted, but token retrieval failed / error */}
          {vapidKeyConfigured && notificationPermission === "granted" && !fcmToken && fcmError && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 text-rose-400 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold">FCM Setup Error</span>
                  <span className="text-[11px] text-white/70 leading-relaxed break-words">
                    {fcmError}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => runSetup()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 py-1.5 text-xs font-semibold text-rose-400 transition-all cursor-pointer"
                >
                  Retry
                </button>
                {typeof window !== "undefined" && localStorage.getItem("split_ease_vapid_key") && (
                  <button
                    onClick={clearLocalVapidKey}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 py-1.5 text-xs font-semibold text-white/60 transition-all cursor-pointer"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Condition 5: VAPID Key active, permission granted, and currently registering */}
          {vapidKeyConfigured && notificationPermission === "granted" && !fcmToken && !fcmError && (
            <div className="flex items-center gap-2.5 text-xs text-white/70 py-1">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              <span>Acquiring FCM Push Token...</span>
            </div>
          )}

          </div>
        );
      })()}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
