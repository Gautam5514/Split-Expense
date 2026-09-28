"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function AdminBlogErrorBoundary({ reset }) {
  return <ErrorScreen handleReload={reset} />;
}
