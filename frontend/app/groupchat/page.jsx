"use client";
import { useState } from "react";
import GroupChatList from "@/components/groupchat/GroupChatList";
import GroupChatWindow from "@/components/groupchat/GroupChatWindow";

export default function GroupChatPage() {
  const [activeGroup, setActiveGroup] = useState(null);

  return (
    <div className="flex h-screen bg-[#efeae2]">
      <GroupChatList onSelect={setActiveGroup} activeGroup={activeGroup} />
      <GroupChatWindow activeGroup={activeGroup} />
    </div>
  );
}
