"use client";

import { usePathname } from "next/navigation";

/**
 * Hides global "chrome" (navbar, footer, cursor, prompts) on routes that should
 * render full-bleed. Currently only the MCP connect page (/mcp-login) opts out,
 * so it can present a clean, premium two-panel layout with no site navbar.
 *
 * Every other route renders children exactly as before.
 */
const CHROMELESS_ROUTES = ["/mcp-login"];

export default function ChromeGate({ children }) {
  const pathname = usePathname();
  const hidden = CHROMELESS_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  if (hidden) return null;
  return <>{children}</>;
}
