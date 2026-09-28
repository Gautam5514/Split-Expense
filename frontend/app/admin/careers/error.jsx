"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function AdminCareerErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
