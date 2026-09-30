"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { Search, MoreVertical, MessageSquarePlus, Users, Trash2, X, Check } from "lucide-react";
import toast from "@/lib/toast";
import AddContactModal from "@/components/chat/AddContactModal";

export default function ChatList({ onSelect, activeFriend, openUserId }) {
  const [friends, setFriends] = useState([]);
  const [me, setMe] = useState(null);
  const [online, setOnline] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const pressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const [showAddContact, setShowAddContact] = useState(false);
  // Ensures a deep-link (?open=<userId>) only auto-opens once per navigation.
  const autoOpenedRef = useRef(null);

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

  // Deep-link: when navigated to /chat?open=<userId>, auto-open that chat.
  // Prefer an already-loaded contact row; otherwise fetch the contact profile
  // so brand-new (not-yet-messaged) people from global search still open.
  // (Declared below resetUnread so it can call it without a use-before-declare.)

  // Filter friends based on search
  const searchedFriends = friends.filter((user) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getColorForName = (name) => {
    const colors = [
      "bg-gradient-to-br from-teal-500 to-teal-700",
      "bg-gradient-to-br from-emerald-500 to-green-600",
      "bg-gradient-to-br from-cyan-500 to-teal-600",
      "bg-gradient-to-br from-blue-500 to-blue-600",
      "bg-gradient-to-br from-sky-500 to-cyan-600",
      "bg-gradient-to-br from-cyan-500 to-teal-700",
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

  // Deep-link: when navigated to /chat?open=<userId>, auto-open that chat.
  // Prefer an already-loaded contact row; otherwise fetch the contact profile
  // so brand-new (not-yet-messaged) people from global search still open.
  useEffect(() => {
    if (!openUserId) return;
    if (autoOpenedRef.current === openUserId) return;

    const match = friends.find((f) => String(f._id) === String(openUserId));
    if (match) {
      autoOpenedRef.current = openUserId;
      onSelect(match);
      resetUnread(match._id);
      return;
    }

    // Not in the list yet — the list may still be loading, or it's someone
    // we've never chatted with. Fetch their profile and open directly.
    if (friends.length === 0) return; // wait for the first load to settle
    let cancelled = false;
    api
      .get(`/chat/contact/${openUserId}`)
      .then((res) => {
        if (cancelled || !res.data?._id) return;
        autoOpenedRef.current = openUserId;
        onSelect(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [openUserId, friends]);

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

  const renderRow = (user) => (
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
      className={`group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 ${
        activeFriend?._id === user._id
          ? "bg-gradient-to-r from-primary/12 to-transparent"
          : selectedIds.includes(user._id)
          ? "bg-gradient-to-r from-primary/15 to-primary/5 ring-1 ring-primary/25"
          : "hover:bg-muted/60 active:scale-[0.995]"
      }`}
    >
      {selectMode && (
        <div
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all duration-150 ${
            selectedIds.includes(user._id)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-transparent"
          }`}
        >
          <Check size={13} />
        </div>
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.name || "Contact"}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-[13px] ring-1 ring-white/20 ${getColorForName(
              user.name
            )}`}
          >
            {user.name?.charAt(0)}
          </div>
        )}

        {online.includes(user._id) && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full"></span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span className={`truncate text-[13.5px] font-semibold leading-tight transition-colors ${
            activeFriend?._id === user._id ? "text-primary" : "text-foreground"
          }`}>
            {user.name}
          </span>

          {user.lastMessageAt && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {new Date(user.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex justify-between items-center">
          <span className="text-[11.5px] text-muted-foreground truncate mr-2 leading-tight">
            {user.lastMessage || "Say hello 👋"}
          </span>

          {user.unread > 0 && (
            <span className="bg-primary text-primary-foreground text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0">
              {user.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card lg:w-[320px] lg:shrink-0">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          {me?.imageUrl ? (
            <img
              src={me.imageUrl}
              alt={me.name || "User"}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-600 rounded-full flex items-center justify-center font-bold text-white ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
              {me?.name?.charAt(0) || "ME"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-foreground tracking-tight">
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
              className="rounded-xl p-2 text-destructive transition-all hover:bg-destructive/10 active:scale-90"
              title="Delete selected chats"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={cancelSelect}
              className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1 text-muted-foreground">
            <button
              onClick={() => setShowAddContact(true)}
              className="rounded-xl p-2 transition-all hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-90"
              title="Add Contact"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddContact(true)}
              className="rounded-xl p-2 transition-all hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-90"
              title="New Chat"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex items-center bg-muted/80 rounded-2xl px-3.5 py-2.5 border border-transparent transition-all focus-within:border-primary/40 focus-within:bg-muted focus-within:shadow-[0_0_0_3px_rgba(8,145,178,0.08)]">
          <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-foreground w-full text-sm focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-1.5 pb-2 space-y-px">
        {searchedFriends.map(renderRow)}

        {searchedFriends.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground/60">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No contacts found</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Try a different search term.</p>
            </div>
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
