"use client";

import { useState } from "react";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const [activeFriend, setActiveFriend] = useState(null);

  return (
    <div className="overflow-hidden bg-background h-[calc(100dvh-96px)] md:h-[calc(100dvh-108px)] px-3 md:px-6 pt-3 pb-20 sm:pb-3">
      <div className="h-full mx-auto flex max-w-[1500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
