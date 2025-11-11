"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";

export default function GroupChatList({ onSelect, activeGroup }) {
  const [groups, setGroups] = useState([]);
  const [online, setOnline] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/groups");
        setGroups(res.data || []);
      } catch (err) {
        console.error("Error loading groups:", err);
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
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  return (
    <div className="w-1/4 border-r h-full overflow-y-auto bg-white">
      <h2 className="text-lg font-semibold text-gray-900 p-4 border-b sticky top-0 bg-gray-50">
        Groups
      </h2>

      {groups.map((group) => (
        <div
          key={group._id}
          onClick={() => onSelect(group)}
          className={`flex items-center gap-3 p-3 cursor-pointer transition ${
            activeGroup?._id === group._id
              ? "bg-gray-100"
              : "hover:bg-gray-100"
          }`}
        >
          {/* Group avatar */}
          <div className="relative shrink-0">
            {group.members?.[0]?.photoURL ? (
              <img
                src={group.members[0].photoURL}
                alt={group.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-full text-white font-semibold uppercase ${getColorForName(
                  group.name
                )}`}
              >
                {group.name?.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{group.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {group.members?.length || 0} members
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
