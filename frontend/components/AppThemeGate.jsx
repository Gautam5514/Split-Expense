"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/* Puts .app-mono on <html> while the user is logged in, so the app uses the
   same monochrome palette as the mobile app (see globals.css). The landing
   page and auth pages keep the marketing look. */
export default function AppThemeGate() {
  const { token, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // keep whatever the pre-paint script chose until auth resolves
    document.documentElement.classList.toggle("app-mono", !!token);
    // Read by the pre-paint script in layout.jsx so a reload doesn't flash
    // the landing colours before auth restores.
    try {
      if (token) localStorage.setItem("appMono", "1");
      else localStorage.removeItem("appMono");
    } catch {}
  }, [token, loading]);

  return null;
}
