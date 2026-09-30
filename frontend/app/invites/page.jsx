"use client";

import PendingInvitesList from "@/components/invites/PendingInvitesList";

export default function InvitesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-6 pb-32 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-extrabold text-foreground">Group invites</h1>
        <p className="text-xs text-muted-foreground mt-1 mb-5">
          You join a group only when you accept. Block anyone you don&apos;t know.
        </p>
        <PendingInvitesList />
      </div>
    </div>
  );
}
