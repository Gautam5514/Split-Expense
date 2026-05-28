"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import toast from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { BellRing, Clock3, ReceiptText, UsersRound } from "lucide-react";
import { getNotificationPermission, onForegroundMessage } from "@/lib/firebaseMessaging";

const NotificationContext = createContext();

const getNotificationMeta = (type) => {
  if (type === "expense") {
    return {
      label: "Expense update",
      Icon: ReceiptText,
      iconClass: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/15",
      accentClass: "from-emerald-500/20 via-transparent to-teal-500/10",
    };
  }
  return {
    label: "Group update",
    Icon: UsersRound,
    iconClass: "bg-cyan-500/10 text-cyan-600 ring-cyan-500/15",
    accentClass: "from-cyan-500/20 via-transparent to-teal-500/10",
  };
};

const formatToastTime = (value) => {
  if (!value) return "Just now";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isMongoObjectId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const playNotificationTune = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);

    [
      { frequency: 880, start: 0, duration: 0.08 },
      { frequency: 1175, start: 0.09, duration: 0.1 },
      { frequency: 988, start: 0.2, duration: 0.12 },
    ].forEach(({ frequency, start, duration }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
      osc.connect(gain);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });

    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
    setTimeout(() => ctx.close(), 700);
  } catch {
    // Autoplay may be blocked until the user has interacted with the page.
  }
};

function NotificationToast({ notif, visible }) {
  const { label, Icon, iconClass, accentClass } = getNotificationMeta(notif.type);

  return (
    <div
      className={`pointer-events-auto w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
      }`}
    >
      <div className={`h-[3px] bg-gradient-to-r ${accentClass}`} />

      <div className="relative p-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-10 dark:opacity-20 blur-xl pointer-events-none`} />

        <div className="relative flex gap-4">
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
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
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
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const seenNotifsRef = useRef(new Set());
  // Ref ensures the unsubscribe function is reachable even when cleanup runs
  // before the async setupPush() resolves.
  const foregroundUnsubRef = useRef(null);

  // Register FCM web-push token with the backend once per login session.
  useEffect(() => {
    if (!token) {
      // Clear stored token on logout so the next login always re-registers fresh.
      localStorage.removeItem("fcmToken");
      return;
    }

    let cancelled = false;

    const setupPush = async () => {
      const fcmToken = await getNotificationPermission();
      if (cancelled || !fcmToken) return;

      // Only POST to backend when the token has changed (avoids redundant writes).
      if (fcmToken !== localStorage.getItem("fcmToken")) {
        try {
          await api.post("/notifications/web-push-token", { fcmToken });
          localStorage.setItem("fcmToken", fcmToken);
        } catch (err) {
          console.error("Failed to register FCM token:", err.message);
        }
      }

      // Register foreground listener so FCM doesn't show a duplicate system
      // notification while the app is open. Socket.IO already shows the in-app
      // toast, so this handler is intentionally a no-op.
      if (!cancelled) {
        foregroundUnsubRef.current = await onForegroundMessage(() => {});
      }
    };

    setupPush();

    return () => {
      cancelled = true;
      if (typeof foregroundUnsubRef.current === "function") {
        foregroundUnsubRef.current();
        foregroundUnsubRef.current = null;
      }
    };
  }, [token]);

  // Load existing unread notifications from the database.
  useEffect(() => {
    if (!token) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data || []);
        setHasUnread(res.data.some((n) => !n.isRead));
      } catch (err) {
        console.error("Failed to load notifications:", err.message);
      }
    };
    fetchNotifications();
  }, [token]);

  // Real-time socket notifications.
  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.emit("register", token);

    socket.on("notification", (notif) => {
      const key = notif._id || notif.message;
      if (seenNotifsRef.current.has(key)) return;

      seenNotifsRef.current.add(key);
      setTimeout(() => seenNotifsRef.current.delete(key), 3500);

      setNotifications((prev) => [notif, ...prev]);
      setHasUnread(true);
      playNotificationTune();
      toast.custom(
        (t) => <NotificationToast notif={notif} visible={t.visible} />,
        { position: "top-right", duration: 5200 }
      );
    });

    return () => socket.disconnect();
  }, [token]);

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-read", {});
      setNotifications([]);
      setHasUnread(false);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err.message);
    }
  };

  const markOneAsRead = async (id) => {
    if (!isMongoObjectId(id)) {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      return;
    }
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Failed to mark notification as read:", err.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, setNotifications, hasUnread, setHasUnread, markAllAsRead, markOneAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
