"use client";

import { ProgressProvider } from "@bprogress/next/app";

export default function ProgressBarProvider({ children }) {
  return (
    <ProgressProvider
      height="3px"
      color="#0891B2"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
}
