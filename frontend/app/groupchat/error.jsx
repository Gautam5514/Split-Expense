"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function GroupChatErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
