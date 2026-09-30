"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

// Just two themes: light and dark. Their colours for the logged-in app live
// in globals.css (.app-mono), matching the mobile app's palette.

// Leftovers from the old custom-colour / premium / font themes. Cleared once
// so a returning user doesn't keep a palette that no longer exists.
const LEGACY_KEYS = [
  "customBgLight", "customBgDark", "customPrimary", "customBg",
  "customText", "customBorder", "glassTheme", "appFont", "textSize",
];
const LEGACY_VARS = [
  "--background", "--foreground", "--card", "--card-foreground",
  "--popover", "--popover-foreground", "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--border", "--input", "--ring", "--font-sans",
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");

    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    const root = document.documentElement;
    LEGACY_VARS.forEach((v) => root.style.removeProperty(v));
    root.classList.remove("theme-glass");
    root.style.removeProperty("font-size");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const setMode = (mode) => setTheme(mode === "dark" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
