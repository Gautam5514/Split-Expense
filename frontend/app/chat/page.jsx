"use client";

import { useState } from "react";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const [activeFriend, setActiveFriend] = useState(null);

  return (
    <div className="flex h-screen bg-white">
      {/* Left side: Friend list */}
      <ChatList onSelect={setActiveFriend} />
      
      {/* Right side: Chat window */}
      <ChatWindow activeFriend={activeFriend} />
    </div>
  );
}
