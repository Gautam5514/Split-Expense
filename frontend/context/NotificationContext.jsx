"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";


const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

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

    const socketInstance = io(
      process.env.NEXT_PUBLIC_URL || "http://localhost:8080",
      {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
      }
    );

    // 🧠 Instead of sending userId, send the *token*
    socketInstance.emit("register", token);

    socketInstance.on("connect", () => {
      console.log("🟢 Socket connected for notifications");
    });

    socketInstance.on("notification", (notif) => {
      console.log("🔔 Received notification:", notif);

      setNotifications((prev) => [notif, ...prev]);
      setHasUnread(true);

      toast.custom(
        <div className="bg-black text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-500/30 max-w-sm">
          <p className="text-sm font-medium">
            {notif.type === "expense" ? "💸" : "👥"} {notif.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(notif.createdAt).toLocaleTimeString()}
          </p>
        </div>,
        { position: "bottom-right" }
      );
    });

    setSocket(socketInstance);
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
