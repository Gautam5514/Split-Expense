"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { Search, MessageSquarePlus, Trash2, X, Check } from "lucide-react";
import toast from "@/lib/toast";
import GroupAvatar from "./GroupAvatar";

export default function GroupChatList({ onSelect, activeGroup, openGroupId }) {
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [me, setMe] = useState(null); // To show my avatar in header
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const pressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  // Ensures a deep-link (?open=<groupId>) only auto-opens once per navigation.
  const autoOpenedRef = useRef(null);

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

  // Deep-link: when navigated to /groupchat?open=<groupId>, auto-open it.
  useEffect(() => {
    if (!openGroupId) return;
    if (autoOpenedRef.current === openGroupId) return;

    const match = groups.find((g) => String(g._id) === String(openGroupId));
    if (match) {
      autoOpenedRef.current = openGroupId;
      onSelect(match);
      return;
    }

    if (groups.length === 0) return; // wait for the first load to settle
    let cancelled = false;
    api
      .get(`/groups/${openGroupId}`)
      .then((res) => {
        if (cancelled || !res.data?._id) return;
        autoOpenedRef.current = openGroupId;
        onSelect(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [openGroupId, groups]);

  // Filter groups
  const searchedGroups = groups.filter((g) =>
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

  const renderRow = (group) => {
    return (
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
        className={`group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 ${
          selectedIds.includes(group._id)
            ? "bg-gradient-to-r from-primary/15 to-primary/5 ring-1 ring-primary/25"
            : activeGroup?._id === group._id
            ? "bg-gradient-to-r from-primary/12 to-transparent"
            : "hover:bg-muted/60 active:scale-[0.995]"
        }`}
      >
        {selectMode && (
          <div
            className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all duration-150 ${
              selectedIds.includes(group._id)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-transparent"
            }`}
          >
            <Check size={13} />
          </div>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <GroupAvatar group={group} size={36} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className={`block truncate text-[13.5px] font-semibold leading-tight transition-colors ${
            activeGroup?._id === group._id ? "text-primary" : "text-foreground"
          }`}>
            {group.name}
          </span>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground truncate leading-tight">
            {group.members?.length || 0} members
          </p>
        </div>
      </div>
    );
  };

  return (
    <aside className={`flex h-full w-full flex-col border-r border-border bg-card lg:w-[320px] lg:shrink-0`}>

      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          {me?.imageUrl ? (
            <img src={me.imageUrl} alt="Me" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 ring-offset-2 ring-offset-card" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-600 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
              {me?.name?.charAt(0) || "ME"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-foreground tracking-tight">
              {selectMode ? `${selectedIds.length} selected` : "Group Chat"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selectMode ? "Tap more groups to select" : `${groups.length} groups`}
            </p>
          </div>
        </div>
        {selectMode && (
          <div className="flex gap-2">
            <button
              onClick={deleteSelected}
              className="rounded-xl p-2 text-destructive transition-all hover:bg-destructive/10 active:scale-90"
              title="Delete selected group chats"
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
        )}
      </div>

      {/* Search Bar */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex items-center bg-muted/80 rounded-2xl px-3.5 py-2.5 border border-transparent transition-all focus-within:border-primary/40 focus-within:bg-muted focus-within:shadow-[0_0_0_3px_rgba(8,145,178,0.08)]">
          <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-1.5 pb-2 space-y-px">
        {searchedGroups.map(renderRow)}

        {searchedGroups.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground/60">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No groups found</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Try a different search term.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
