"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

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

// Accent theme (unlocked with coins / Elite tier on the Appearance page). It
// only recolours the primary "ink" of the logged-in app; White/Black stays as
// is. Stored as { key, light, dark } and applied as data-accent on <html> plus
// two custom properties that globals.css maps onto --primary (see
// ".app-mono[data-accent]"). They are deliberately NOT the LEGACY_VARS names,
// so the legacy cleanup below never touches them. The pre-paint script in
// app/layout.jsx reads the same key - keep the two in sync.
export const ACCENT_STORAGE_KEY = "seAccent";
const ACCENT_ATTR = "data-accent";
const ACCENT_LIGHT_VAR = "--se-accent-light";
const ACCENT_DARK_VAR = "--se-accent-dark";
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// Anything that is not a well-formed accent becomes null (= default ink).
export function normalizeAccent(value) {
  if (!value || typeof value !== "object") return null;
  const { key, light, dark } = value;
  if (typeof key !== "string" || !key || !HEX.test(light) || !HEX.test(dark)) return null;
  return { key, light, dark };
}

function readStoredAccent() {
  try {
    return normalizeAccent(JSON.parse(localStorage.getItem(ACCENT_STORAGE_KEY)));
  } catch {
    return null;
  }
}

function applyAccent(accent) {
  const root = document.documentElement;
  if (accent) {
    root.style.setProperty(ACCENT_LIGHT_VAR, accent.light);
    root.style.setProperty(ACCENT_DARK_VAR, accent.dark);
    root.setAttribute(ACCENT_ATTR, accent.key);
  } else {
    root.removeAttribute(ACCENT_ATTR);
    root.style.removeProperty(ACCENT_LIGHT_VAR);
    root.style.removeProperty(ACCENT_DARK_VAR);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [accent, setAccentState] = useState(null);
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

    setAccentState(readStoredAccent());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    applyAccent(accent);
  }, [accent, mounted]);

  // Pass { key, light, dark } to apply a theme, or null to go back to the
  // default ink. Stable identity, so it is safe in effect dependencies.
  const setAccent = useCallback((next) => {
    const value = normalizeAccent(next);
    try {
      if (value) localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(value));
      else localStorage.removeItem(ACCENT_STORAGE_KEY);
    } catch {}
    setAccentState(value);
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const setMode = (mode) => setTheme(mode === "dark" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
