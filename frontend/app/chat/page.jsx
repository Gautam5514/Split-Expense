"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatDetailsPanel from "@/components/chat/ChatDetailsPanel";

function ChatPageInner() {
  const searchParams = useSearchParams();
  // Deep-link target from global search: /chat?open=<userId>
  const openUserId = searchParams.get("open");
  const [activeFriend, setActiveFriend] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  const selectFriend = (friend) => {
    setActiveFriend(friend);
    setDetailsOpen(false);
  };

  const handleRemoved = () => {
    setActiveFriend(null);
    setDetailsOpen(false);
    setListKey((k) => k + 1);
  };

  return (
    <div className="flex overflow-hidden bg-card h-[calc(100dvh-72px)] pb-20 sm:pb-3 md:h-[calc(100dvh-64px)]">
      {/* Left side: Friend list */}
      <div className={`h-full ${activeFriend ? (detailsOpen ? "hidden xl:block" : "hidden lg:block") : "w-full lg:w-auto"}`}>
        <ChatList key={listKey} onSelect={selectFriend} activeFriend={activeFriend} openUserId={openUserId} />
      </div>

      {/* Middle: Chat window */}
      <div className={`h-full flex-1 min-w-0 ${activeFriend ? "block" : "hidden lg:block"}`}>
        <ChatWindow
          activeFriend={activeFriend}
          onBack={() => setActiveFriend(null)}
          detailsOpen={detailsOpen}
          onToggleDetails={() => setDetailsOpen((o) => !o)}
          onRemoved={handleRemoved}
        />
      </div>

      {/* Right side: Contact details */}
      {detailsOpen && (
        <ChatDetailsPanel activeFriend={activeFriend} onClose={() => setDetailsOpen(false)} />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
