"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { Search, MoreVertical, Users, MessageSquarePlus, Trash2, X, Check } from "lucide-react";
import toast from "@/lib/toast";

export default function GroupChatList({ onSelect, activeGroup }) {
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [me, setMe] = useState(null); // To show my avatar in header
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const pressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Load me for the header avatar
        const userRes = await api.get("/users/me");
        setMe(userRes.data);

        const res = await api.get("/groups", { params: { context: "chat" } });
        setGroups(res.data || []);
      } catch (err) {
        console.error("Error loading groups:", err);
      }
    };
    load();

    connectSocket();
  }, []);

  const getColorForName = (name) => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-teal-500", "bg-indigo-500"];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  // Filter groups
  const filteredGroups = groups.filter((g) =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (groupId) => {
    setSelectedIds((prev) => {
      const next = prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
      if (next.length === 0) setSelectMode(false);
      return next;
    });
  };

  const startSelect = (groupId) => {
    setSelectMode(true);
    setSelectedIds((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;

    try {
      await api.post("/groups/messages/delete", { groupIds: selectedIds });
      setGroups((prev) => prev.filter((group) => !selectedIds.includes(group._id)));
      if (activeGroup && selectedIds.includes(activeGroup._id)) {
        onSelect(null);
      }
      toast.success(
        `Deleted ${selectedIds.length} group chat${selectedIds.length > 1 ? "s" : ""}`
      );
      cancelSelect();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete group chats");
    }
  };

  const handlePointerDown = (groupId) => {
    longPressTriggeredRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      startSelect(groupId);
    }, 550);
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card md:w-[360px] lg:w-[410px] md:shrink-0">

      {/* Header */}
      <div className="h-16 bg-muted/80 px-4 flex items-center justify-between shrink-0 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          {me?.imageUrl ? (
            <img src={me.imageUrl} alt="Me" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-muted-foreground/20 rounded-full flex items-center justify-center text-muted-foreground font-bold">
              {me?.name?.charAt(0) || "ME"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {selectMode ? `${selectedIds.length} selected` : "Group Chat"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selectMode ? "Tap more groups to select" : `${groups.length} groups`}
            </p>
          </div>
        </div>
        {selectMode ? (
          <div className="flex gap-2">
            <button
              onClick={deleteSelected}
              className="rounded-lg p-2 text-destructive transition hover:bg-destructive/10"
              title="Delete selected group chats"
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
            <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="Groups">
              <Users className="w-4 h-4" />
            </button>
            <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="New group chat">
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <button className="rounded-lg p-2 transition hover:bg-background hover:text-foreground" title="More">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center bg-muted rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/40">
          <Search className="w-4 h-4 text-muted-foreground mr-3" />
          <input
            type="text"
            placeholder="Search groups"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent w-full text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
        {filteredGroups.map((group) => (
          <div
            key={group._id}
            onPointerDown={() => handlePointerDown(group._id)}
            onPointerUp={clearPressTimer}
            onPointerLeave={clearPressTimer}
            onContextMenu={(e) => {
              e.preventDefault();
              startSelect(group._id);
            }}
            onClick={() => {
              if (longPressTriggeredRef.current) {
                longPressTriggeredRef.current = false;
                return;
              }
              if (selectMode) {
                toggleSelect(group._id);
                return;
              }
              onSelect(group);
            }}
            className={`group flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border last:border-none relative transition-colors
              ${selectedIds.includes(group._id)
                ? "bg-primary/10 hover:bg-primary/15"
                : activeGroup?._id === group._id
                ? "bg-muted"
                : "hover:bg-muted/50"}`}
          >
            {selectMode && (
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  selectedIds.includes(group._id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent"
                }`}
              >
                <Check size={14} />
              </div>
            )}

            {/* Avatar */}
            <div className="relative shrink-0">
              {group.members?.[0]?.photoURL ? (
                <img
                  src={group.members[0].photoURL}
                  alt={group.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full text-white font-bold text-lg ${getColorForName(
                    group.name
                  )}`}
                >
                  {group.name?.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-baseline">
                <span className="text-foreground font-semibold text-base truncate">
                  {group.name}
                </span>
                {/* Optional: Add timestamp of last message if available in data */}
                {/* <span className="text-xs text-muted-foreground">Yesterday</span> */}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {group.members?.length || 0} members
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
