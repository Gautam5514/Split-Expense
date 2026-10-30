"use client";

import { usePathname } from "next/navigation";

/**
 * Hides global "chrome" (navbar, footer, cursor, prompts) on routes that should
 * render full-bleed. No route opts out right now; add paths to the list below.
 *
 * Every other route renders children exactly as before.
 */
const CHROMELESS_ROUTES = [];

export default function ChromeGate({ children }) {
  const pathname = usePathname();
  const hidden = CHROMELESS_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  if (hidden) return null;
  return <>{children}</>;
}
