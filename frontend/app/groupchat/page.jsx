"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import GroupChatList from "@/components/groupchat/GroupChatList";
import GroupChatWindow from "@/components/groupchat/GroupChatWindow";
import GroupDetailsPanel from "@/components/groupchat/GroupDetailsPanel";

function GroupChatPageInner() {
  const searchParams = useSearchParams();
  // Deep-link target from global search: /groupchat?open=<groupId>
  const openGroupId = searchParams.get("open");
  const [activeGroup, setActiveGroup] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  const selectGroup = (group) => {
    setActiveGroup(group);
    setDetailsOpen(false);
  };

  const handleRemoved = () => {
    setActiveGroup(null);
    setDetailsOpen(false);
    setListKey((k) => k + 1);
  };

  const handleGroupUpdated = (updatedGroup) => {
    if (!updatedGroup) return;
    setActiveGroup((prev) => (prev ? { ...prev, ...updatedGroup } : updatedGroup));
    setListKey((k) => k + 1);
  };

  return (
    <div className="flex overflow-hidden bg-card h-[calc(100dvh-72px)] pb-20 sm:pb-3 md:h-[calc(100dvh-64px)]">
      <div className={`h-full ${activeGroup ? (detailsOpen ? "hidden xl:block" : "hidden lg:block") : "w-full lg:w-auto"}`}>
        <GroupChatList key={listKey} onSelect={selectGroup} activeGroup={activeGroup} openGroupId={openGroupId} />
      </div>
      <div className={`h-full flex-1 min-w-0 ${activeGroup ? "block" : "hidden lg:block"}`}>
        <GroupChatWindow
          activeGroup={activeGroup}
          onBack={() => setActiveGroup(null)}
          detailsOpen={detailsOpen}
          onToggleDetails={() => setDetailsOpen((o) => !o)}
          onRemoved={handleRemoved}
        />
      </div>
      {detailsOpen && (
        <GroupDetailsPanel activeGroup={activeGroup} onClose={() => setDetailsOpen(false)} onUpdated={handleGroupUpdated} />
      )}
    </div>
  );
}

export default function GroupChatPage() {
  return (
    <Suspense fallback={null}>
      <GroupChatPageInner />
    </Suspense>
  );
}
