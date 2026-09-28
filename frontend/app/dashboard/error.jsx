"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function DashboardErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
