"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function UsersErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
