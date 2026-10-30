"use client";

import { useCallback, useSyncExternalStore } from "react";

const serverSnapshot = () => false;

export default function useMediaQuery(query) {
  const subscribe = useCallback((listener) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
