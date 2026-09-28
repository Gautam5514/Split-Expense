"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function ProfileErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
