"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";

/* Puts the .theme-glass class on <html> only while BOTH are true:
   the user owns/enabled the Aurora Glass theme AND they are logged in.
   The landing page and auth pages (logged out) always stay un-glassed. */
export default function GlassThemeGate() {
  const { token } = useAuth();
  const { glassEnabled } = useThemeContext();

  useEffect(() => {
    const active = !!token && glassEnabled;
    document.documentElement.classList.toggle("theme-glass", active);
    return () => document.documentElement.classList.remove("theme-glass");
  }, [token, glassEnabled]);

  return null;
}
