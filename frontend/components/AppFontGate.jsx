"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/* Puts the .app-shell class on <html> only while logged in, so the app-wide
   heading/bold font (see globals.css) reaches every logged-in surface -
   sidebar, navbar, and every page - without ever touching the logged-out
   landing/marketing pages, which render only when there's no token. */
export default function AppFontGate() {
  const { token } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("app-shell", !!token);
    return () => document.documentElement.classList.remove("app-shell");
  }, [token]);

  return null;
}
