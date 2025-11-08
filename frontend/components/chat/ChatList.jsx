"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "firebase/auth";
import socket, { connectSocket } from "@/lib/socket";

export default function ChatList({ onSelect }) {
  const [friends, setFriends] = useState([]);
  const [me, setMe] = useState(null);
  const [online, setOnline] = useState([]);

  useEffect(() => {
    const load = async () => {
      const userRes = await api.get("/users/me");
      setMe(userRes.data);

      const listRes = await api.get("/users");
      const users = listRes.data.items.filter((u) => u._id !== userRes.data._id);
      setFriends(users);
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

  return (
    <div className="w-1/4 border-r h-full overflow-y-auto bg-white">
      <h2 className="text-lg text-gray-900 font-semibold p-4 border-b sticky top-0 bg-gray-50">
        Chats
      </h2>
      {friends.map((user) => (
        <div
          key={user._id}
          onClick={() => onSelect(user)}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="relative">
            <img
              src={user.photoURL || "/avatar.png"}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {online.includes(user._id) && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
