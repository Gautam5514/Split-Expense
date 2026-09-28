"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function AdminMessagesErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
