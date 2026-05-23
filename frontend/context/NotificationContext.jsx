"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import toast from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { BellRing, Clock3, ReceiptText, UsersRound, AlertTriangle, AlertCircle, Info, Copy, ShieldCheck, Send } from "lucide-react";


const NotificationContext = createContext();

const getOneSignal = async () => (await import("react-onesignal")).default;

const unregisterLegacyFirebaseWorkers = async () => {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.getRegistrations) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        registration.active?.scriptURL?.includes("/firebase-messaging-sw.js") ||
        registration.installing?.scriptURL?.includes("/firebase-messaging-sw.js") ||
        registration.waiting?.scriptURL?.includes("/firebase-messaging-sw.js")
      )
      .map((registration) => registration.unregister())
  );
};

const initOneSignalOnce = async (config) => {
  if (typeof window === "undefined") return null;

  if (window.__splitEaseOneSignalInitPromise) {
    return window.__splitEaseOneSignalInitPromise;
  }

  window.__splitEaseOneSignalInitPromise = getOneSignal()
    .then(async (OneSignal) => {
      await unregisterLegacyFirebaseWorkers();

      try {
        await OneSignal.init(config);
      } catch (err) {
        const message = err?.message || String(err || "");
        if (!message.toLowerCase().includes("already initialized")) {
          throw err;
        }
      }

      return OneSignal;
    })
    .catch((err) => {
      window.__splitEaseOneSignalInitPromise = null;
      throw err;
    });

  return window.__splitEaseOneSignalInitPromise;
};

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
      className={`pointer-events-auto w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
      }`}
    >
      {/* Dynamic top gradient line */}
      <div className={`h-[3px] bg-gradient-to-r ${accentClass}`} />
      
      <div className="relative p-5">
        {/* Soft backlighting ambient glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-10 dark:opacity-20 blur-xl pointer-events-none`} />
        
        <div className="relative flex gap-4">
          {/* Animated pulsing icon container */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-inner transition-transform duration-300 hover:scale-110 ${iconClass}`}>
            <Icon size={20} className="animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Clock3 size={11} />
                {formatToastTime(notif.createdAt)}
              </span>
            </div>

            <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              {notif.message}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-500 dark:text-indigo-400 uppercase tracking-wider">
                <BellRing size={12} className="animate-bounce" />
                <span>SplitEase Live</span>
              </div>
              <button 
                onClick={() => toast.dismiss()}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Dismiss
              </button>
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
  const seenNotifsRef = useRef(new Set());
  const [oneSignalSubscriptionId, setOneSignalSubscriptionId] = useState(null);
  const [oneSignalPermission, setOneSignalPermission] = useState("default");
  const [oneSignalError, setOneSignalError] = useState(null);

  // 🔔 OneSignal setup silently on login
  useEffect(() => {
    if (!token) {
      setOneSignalSubscriptionId(null);
      setOneSignalPermission("default");
      setOneSignalError(null);
      return;
    }

    let isMounted = true;
    let pushSubscriptionChangeListener = null;

    const setupOneSignal = async () => {
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      const safariWebId = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID;
      const currentHostname = window.location.hostname;

      if (!appId) {
        const warnMsg = "OneSignal App ID is missing. Set NEXT_PUBLIC_ONESIGNAL_APP_ID in frontend/.env and restart Next.js.";
        console.warn(warnMsg);
        setOneSignalError(warnMsg);
        return;
      }



      // 🧠 2. Intercept global errors to prevent Next.js dev crash overlays
      const handleGlobalError = (event) => {
        const msg = event.message || "";
        if (msg.includes("OneSignal") || msg.includes("split-expense-vert.vercel.app")) {
          event.preventDefault();
          console.warn("⚠️ OneSignal Global Error caught and bypassed:", msg);
          setOneSignalError("Domain mismatch or setup issue. Push is bypassed.");
        }
      };

      const handleRejection = (event) => {
        const reason = event.reason?.message || String(event.reason || "");
        if (reason.includes("OneSignal") || reason.includes("split-expense-vert.vercel.app")) {
          event.preventDefault();
          console.warn("⚠️ OneSignal Promise Rejection caught and bypassed:", reason);
          setOneSignalError("Domain mismatch or setup issue. Push is bypassed.");
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("error", handleGlobalError);
        window.addEventListener("unhandledrejection", handleRejection);
      }

      try {
        const isProduction = 
          currentHostname === "split-expense-vert.vercel.app" || 
          currentHostname.endsWith(".vercel.app");
        const isLocal = currentHostname === "localhost" || currentHostname === "127.0.0.1";

        // Gracefully bypass if running on an unsupported development domain/IP
        if (!isProduction && !isLocal) {
          const warnMsg = `⚠️ OneSignal: Domain '${currentHostname}' is not configured. Push is bypassed. Use localhost or https://split-expense-vert.vercel.app to test.`;
          console.warn(warnMsg);
          setOneSignalError(warnMsg);
          return;
        }

        console.log("📣 Initializing OneSignal...", {
          appId,
          origin: window.location.origin,
          hostname: currentHostname,
        });
        const OneSignal = await initOneSignalOnce({
          appId: appId,
          ...(safariWebId ? { safari_web_id: safariWebId } : {}),
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
          },
        });

        if (!isMounted) return;

        // Sync initial state
        const permission = OneSignal.Notifications.permission ? "granted" : (Notification?.permission || "default");
        setOneSignalPermission(permission);

        const subId = OneSignal.User.PushSubscription.id;
        const isOptedIn = OneSignal.User.PushSubscription.optedIn;

        if (subId && isOptedIn) {
          console.log("🚀 OneSignal active subscription ID:", subId);
          setOneSignalSubscriptionId(subId);
          // Silently register subscription ID on backend
          await api.post("/notifications/register-onesignal", { subscriptionId: subId });
        }

        // Listen for subscription changes (e.g. permission granted, or opted out)
        pushSubscriptionChangeListener = async (event) => {
          if (!isMounted) return;
          const currentId = event.current.id;
          const optedIn = event.current.optedIn;
          
          console.log("🔄 OneSignal subscription changed event:", { currentId, optedIn });
          
          if (currentId && optedIn) {
            setOneSignalSubscriptionId(currentId);
            await api.post("/notifications/register-onesignal", { subscriptionId: currentId });
          } else {
            setOneSignalSubscriptionId(null);
            if (event.previous?.id) {
              await api.delete("/notifications/unregister-onesignal", {
                data: { subscriptionId: event.previous.id },
              });
            }
          }
        };

        OneSignal.User.PushSubscription.addEventListener("change", pushSubscriptionChangeListener);

      } catch (err) {
        console.error("❌ OneSignal setup failed:", err);
        setOneSignalError(err.message || "Initialization failed.");
      } finally {
        // Remove the error interceptors after bootstrap has finished
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.removeEventListener("error", handleGlobalError);
            window.removeEventListener("unhandledrejection", handleRejection);
          }
        }, 3000);
      }
    };

    setupOneSignal();

    return () => {
      isMounted = false;
      if (pushSubscriptionChangeListener) {
        getOneSignal().then((OneSignal) => {
          try {
            OneSignal.User.PushSubscription.removeEventListener("change", pushSubscriptionChangeListener);
          } catch {}
        }).catch(() => {});
      }
    };
  }, [token]);

  // Request permission manually via UI toggle
  const requestOneSignalPermission = async () => {
    try {
      const OneSignal = await getOneSignal();
      console.log("📣 Requesting OneSignal push permission...");
      
      await OneSignal.Notifications.requestPermission();
      
      const permission = OneSignal.Notifications.permission ? "granted" : "denied";
      setOneSignalPermission(permission);

      const subId = OneSignal.User.PushSubscription.id;
      const isOptedIn = OneSignal.User.PushSubscription.optedIn;

      if (subId && isOptedIn) {
        setOneSignalSubscriptionId(subId);
        await api.post("/notifications/register-onesignal", { subscriptionId: subId });
        toast.success("Push notifications enabled successfully! 🔔");
        return subId;
      } else {
        toast.error("Push permission not granted or failed.");
        return null;
      }
    } catch (err) {
      console.error("❌ OneSignal Request Permission error:", err);
      toast.error("Failed to request push notification permission.");
      return null;
    }
  };

  // Disable push notifications manually via UI
  const disableOneSignalNotifications = async () => {
    try {
      const OneSignal = await getOneSignal();
      console.log("📣 Disabling OneSignal push notifications...");

      // Pull active subscription ID
      const subId = OneSignal.User.PushSubscription.id;
      
      if (subId) {
        // Call backend to unregister
        await api.delete("/notifications/unregister-onesignal", {
          data: { subscriptionId: subId },
        });
      }

      // Opt out of push notifications in OneSignal
      await OneSignal.User.PushSubscription.optOut();
      
      setOneSignalSubscriptionId(null);
      setOneSignalPermission("default");
      toast.success("Push notifications disabled successfully.");
    } catch (err) {
      console.error("❌ OneSignal Disable error:", err);
      toast.error("Failed to disable push notifications.");
    }
  };

  // Trigger test push notification from backend
  const sendTestPushNotification = async () => {
    try {
      if (!oneSignalSubscriptionId) {
        toast.error("Please enable push notifications first!");
        return;
      }

      const response = await api.post("/notifications/send-onesignal-test", {
        subscriptionId: oneSignalSubscriptionId
      });

      if (response.data?.success) {
        toast.success("Test push notification dispatched! 🚀 Check your desktop/device.");
      } else {
        toast.error(response.data?.message || "Failed to dispatch test push.");
      }
    } catch (err) {
      console.error("❌ Send Test Push error:", err);
      toast.error(err.response?.data?.message || "Error dispatching test push notification.");
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
  useEffect(() => {
    if (!token) return;

    const socketInstance = io(API_URL, {
      transports: ["websocket", "polling"],
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

      // Smart Socket Notification Deduplication:
      // Prevents duplicate notifications of the exact same ID or message within 3.5 seconds
      const notifKey = notif._id || notif.message;
      if (seenNotifsRef.current.has(notifKey)) {
        console.log("⚠️ Bypassed duplicate socket notification:", notifKey);
        return;
      }
      seenNotifsRef.current.add(notifKey);
      setTimeout(() => {
        seenNotifsRef.current.delete(notifKey);
      }, 3500);

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
        oneSignalSubscriptionId,
        oneSignalPermission,
        oneSignalError,
        requestOneSignalPermission,
        disableOneSignalNotifications,
        sendTestPushNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
