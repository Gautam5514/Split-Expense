"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function ChatErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
