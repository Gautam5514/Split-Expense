"use client";
import { useState } from "react";
import GroupChatList from "@/components/groupchat/GroupChatList";
import GroupChatWindow from "@/components/groupchat/GroupChatWindow";

export default function GroupChatPage() {
  const [activeGroup, setActiveGroup] = useState(null);

  return (
    <div className="overflow-hidden bg-background h-[calc(100dvh-96px)] md:h-[calc(100dvh-108px)] px-3 md:px-6 pt-3 pb-20 sm:pb-3">
      <div className="h-full mx-auto flex max-w-[1500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <GroupChatList onSelect={setActiveGroup} activeGroup={activeGroup} />
        <GroupChatWindow activeGroup={activeGroup} onBack={() => setActiveGroup(null)} />
      </div>
    </div>
  );
}
