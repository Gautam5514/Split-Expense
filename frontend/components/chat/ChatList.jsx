"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";

export default function ChatList({ onSelect }) {
  const [friends, setFriends] = useState([]);
  const [me, setMe] = useState(null);
  const [online, setOnline] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await api.get("/users/me");
        setMe(userRes.data);

        const listRes = await api.get("/users");
        const users = listRes.data.items.filter(
          (u) => u._id !== userRes.data._id
        );
        setFriends(users);
      } catch (err) {
        console.error("Error loading users:", err);
      }
    };
    load();

    connectSocket();
    socket.on("userStatus", ({ userId, online: isOnline }) => {
      setOnline((prev) => {
        if (isOnline) return [...new Set([...prev, userId])];
        return prev.filter((id) => id !== userId);
      });
    });

    return () => socket.off("userStatus");
  }, []);

  // 🎨 Helper for random pastel colors
  const getColorForName = (name) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-rose-500",
    ];
    const index = name
      ? name.charCodeAt(0) % colors.length
      : Math.floor(Math.random() * colors.length);
    return colors[index];
  };

  return (
    <div className="w-1/4 border-r h-full overflow-y-auto bg-white">
      <h2 className="text-lg text-gray-900 font-semibold p-4 border-b sticky top-0 bg-gray-50">
        Chats
      </h2>

      {friends.map((user) => (
        <div
          key={user._id}
          onClick={() => onSelect(user)}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-all duration-200"
        >
          <div className="relative shrink-0">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-full text-white font-semibold uppercase ${getColorForName(
                  user.name
                )}`}
              >
                {user.name?.charAt(0) || "?"}
              </div>
            )}

            {online.includes(user._id) && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
