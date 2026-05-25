"use client";
import { useState } from "react";
import GroupChatList from "@/components/groupchat/GroupChatList";
import GroupChatWindow from "@/components/groupchat/GroupChatWindow";

export default function GroupChatPage() {
  const [activeGroup, setActiveGroup] = useState(null);

  return (
    <div className="bg-background px-3 pb-24 sm:pb-4 pt-8 md:px-6">
      <div className="mx-auto flex h-[calc(100vh-200px)] sm:h-[calc(100vh-118px)] max-w-[1500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <GroupChatList onSelect={setActiveGroup} activeGroup={activeGroup} />
        <GroupChatWindow activeGroup={activeGroup} onBack={() => setActiveGroup(null)} />
      </div>
    </div>
  );
}
