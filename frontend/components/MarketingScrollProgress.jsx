"use client";

import { usePathname } from "next/navigation";
import ScrollProgressAndTop from "./ScrollProgressAndTop";

const ROUTES = ["/about", "/what-we-offer", "/how-it-works", "/platforms", "/mobile-app", "/downloadapp", "/mcp", "/features", "/blog", "/careers", "/contact", "/help-center", "/privacy", "/terms", "/cookies", "/legal", "/security"];

export default function MarketingScrollProgress() {
  const pathname = usePathname() || "";
  const publicPage = pathname === "/" || ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return publicPage ? <ScrollProgressAndTop key={pathname} /> : null;
}
