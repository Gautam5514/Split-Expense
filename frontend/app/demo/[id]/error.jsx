"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function GroupDetailsErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
