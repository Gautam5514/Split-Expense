"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

// Routes that render full-bleed (no navbar) must not get the logged-in top
// padding that normally offsets content below the fixed navbar.
const FULL_BLEED_ROUTES = ["/mcp-login"];

export default function MainWrapper({ children }) {
  const { token } = useAuth();
  const pathname = usePathname();

  const isFullBleed = FULL_BLEED_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  const isLoggedIn = !!token && !isFullBleed;

  return (
    <main className={`min-h-screen ${isLoggedIn ? "pt-[72px] md:pt-[80px]" : ""}`}>
      {children}
    </main>
  );
}
