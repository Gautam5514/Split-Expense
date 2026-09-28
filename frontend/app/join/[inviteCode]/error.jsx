"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function InviteErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
