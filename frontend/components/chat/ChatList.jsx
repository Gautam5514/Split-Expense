"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { Search, MoreVertical, MessageSquarePlus, Users, Trash2, X, Check } from "lucide-react";
import toast from "@/lib/toast";
import AddContactModal from "@/components/chat/AddContactModal";

export default function ChatList({ onSelect, activeFriend }) {
  const [friends, setFriends] = useState([]);
  const [me, setMe] = useState(null);
  const [online, setOnline] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const pressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const [showAddContact, setShowAddContact] = useState(false);

  const handleContactAdded = (newContact) => {
    setFriends((prev) => {
      if (prev.some((f) => f._id === newContact._id)) return prev;
      return [newContact, ...prev];
    });
    onSelect(newContact);
    
    api.get("/chat/my-contacts").then((res) => {
      const sorted = (res.data.items || []).sort(
        (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
      );
      setFriends(sorted);
    }).catch(() => {});
  };

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await api.get("/users/me");
        setMe(userRes.data);

        const contactsRes = await api.get("/chat/my-contacts");

        // Sort by lastMessageAt desc
        const sorted = (contactsRes.data.items || []).sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0) -
            new Date(a.lastMessageAt || 0)
        );

        setFriends(sorted);
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

    socket.on("newMessage", (msg) => {
      setFriends((prev) => {
        const updated = prev.map((u) =>
          u._id === msg.sender || u._id === msg.receiver
            ? {
              ...u,
              lastMessage: msg.text || "📎 Media",
              lastMessageAt: msg.createdAt,
              unread: (u.unread || 0) + 1,
            }
            : u
        );

        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0) -
            new Date(a.lastMessageAt || 0)
        );
      });
    });

    return () => {
      socket.off("userStatus");
      socket.off("newMessage");
    };
  }, []);

  // Filter friends based on search
  const filteredFriends = friends.filter((user) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getColorForName = (name) => {
    const colors = [
      "bg-teal-500",
      "bg-emerald-500",
      "bg-cyan-600",
      "bg-blue-600",
      "bg-cyan-600",
      "bg-teal-600",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const resetUnread = async (userId) => {
    try {
      await api.post("/chat/reset-unread", { otherUserId: userId });

      setFriends((prev) =>
        prev.map((f) =>
          f._id === userId ? { ...f, unread: 0 } : f
        )
      );
    } catch { }
  };

  const toggleSelect = (userId) => {
    setSelectedIds((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      if (next.length === 0) setSelectMode(false);
      return next;
    });
  };

  const startSelect = (userId) => {
    setSelectMode(true);
    setSelectedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;

    try {
      await api.post("/chat/delete-conversations", { userIds: selectedIds });
      setFriends((prev) => prev.filter((user) => !selectedIds.includes(user._id)));
      if (activeFriend && selectedIds.includes(activeFriend._id)) {
        onSelect(null);
      }
      toast.success(
        `Deleted ${selectedIds.length} chat${selectedIds.length > 1 ? "s" : ""}`
      );
      cancelSelect();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete chats");
    }
  };

  const handlePointerDown = (userId) => {
    longPressTriggeredRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      startSelect(userId);
    }, 550);
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card md:w-[360px] lg:w-[410px] md:shrink-0">
      {/* Header */}
      <div className="h-16 bg-muted/80 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {me?.imageUrl ? (
            <img
              src={me.imageUrl}
              alt={me.name || "User"}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-muted-foreground/20 rounded-full flex items-center justify-center font-bold text-muted-foreground">
              {me?.name?.charAt(0) || "ME"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {selectMode ? `${selectedIds.length} selected` : "Messages"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selectMode ? "Tap more chats to select" : `${friends.length} contacts`}
            </p>
          </div>
        </div>

        {selectMode ? (
          <div className="flex gap-2">
            <button
              onClick={deleteSelected}
              className="rounded-lg p-2 text-destructive transition hover:bg-destructive/10"
              title="Delete selected chats"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={cancelSelect}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-background hover:text-foreground"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 text-muted-foreground">
            <button 
              onClick={() => setShowAddContact(true)}
              className="rounded-lg p-2 transition hover:bg-background hover:text-foreground cursor-pointer" 
              title="Add Contact"
            >
              <Users className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowAddContact(true)}
              className="rounded-lg p-2 transition hover:bg-background hover:text-foreground cursor-pointer" 
              title="New Chat"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground cursor-pointer" title="More">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="flex items-center bg-muted rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/40">
          <Search className="w-4 h-4 text-muted-foreground mr-3" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-foreground w-full text-sm focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredFriends.map((user) => (
          <div
            key={user._id}
            onPointerDown={() => handlePointerDown(user._id)}
            onPointerUp={clearPressTimer}
            onPointerLeave={clearPressTimer}
            onContextMenu={(e) => {
              e.preventDefault();
              startSelect(user._id);
            }}
            onClick={() => {
              if (longPressTriggeredRef.current) {
                longPressTriggeredRef.current = false;
                return;
              }
              if (selectMode) {
                toggleSelect(user._id);
                return;
              }
              onSelect(user);
              resetUnread(user._id);
            }}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border transition-colors ${
              selectedIds.includes(user._id)
                ? "bg-primary/10 hover:bg-primary/15"
                : "hover:bg-muted/60"
            }`}
          >
            {selectMode && (
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  selectedIds.includes(user._id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent"
                }`}
              >
                <Check size={14} />
              </div>
            )}

            {/* Avatar */}
            <div className="relative shrink-0">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.name || "Contact"}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${getColorForName(
                    user.name
                  )}`}
                >
                  {user.name?.charAt(0)}
                </div>
              )}

              {online.includes(user._id) && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full"></span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="font-medium text-foreground truncate">
                  {user.name}
                </span>

                {user.lastMessageAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(user.lastMessageAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground truncate mr-2">
                  {user.lastMessage || "Say hello 👋"}
                </span>

                {user.unread > 0 && (
                  <span className="bg-green-500 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    {user.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredFriends.length === 0 && (
          <div className="p-5 text-center text-sm text-muted-foreground">
            No contacts found.
          </div>
        )}
      </div>

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onSelectContact={handleContactAdded}
        />
      )}
    </aside>
  );
}
