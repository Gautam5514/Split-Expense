"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function SettingsErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
