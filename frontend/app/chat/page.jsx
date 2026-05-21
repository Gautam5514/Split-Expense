"use client";

import { useState } from "react";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const [activeFriend, setActiveFriend] = useState(null);

  return (
    <div className="bg-background px-3 pb-4 pt-8 md:px-6">
      <div className="mx-auto flex h-[calc(100vh-118px)] max-w-[1500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Left side: Friend list */}
        <div className={`h-full ${activeFriend ? "hidden md:block" : "w-full md:w-auto"}`}>
          <ChatList onSelect={setActiveFriend} activeFriend={activeFriend} />
        </div>

        {/* Right side: Chat window */}
        <div className={`h-full flex-1 min-w-0 ${activeFriend ? "block" : "hidden md:block"}`}>
          <ChatWindow activeFriend={activeFriend} onBack={() => setActiveFriend(null)} />
        </div>
      </div>
    </div>
  );
}
