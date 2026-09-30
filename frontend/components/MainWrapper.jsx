"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";

// Routes that render full-bleed (no navbar) must not get the logged-in top
// padding that normally offsets content below the fixed navbar.
const FULL_BLEED_ROUTES = ["/mcp-login"];

export default function MainWrapper({ children }) {
  const { token } = useAuth();
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  const isFullBleed = FULL_BLEED_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );
  const isLoggedIn = !!token && !isFullBleed;

  return (
    <main className={`min-h-screen transition-[margin,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      isLoggedIn
        ? `pt-[72px] md:pt-16 ${collapsed ? "md:ml-20" : "md:ml-[248px]"}`
        : ""
    }`}>
      {children}
    </main>
  );
}
