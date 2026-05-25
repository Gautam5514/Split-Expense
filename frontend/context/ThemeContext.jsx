"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  // Custom theme overrides
  const [customBg, setCustomBg] = useState("");
  const [customText, setCustomText] = useState("");
  const [customPrimary, setCustomPrimary] = useState("");
  const [customBorder, setCustomBorder] = useState("");

  useEffect(() => {
    setMounted(true);
    // Check local storage or system preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    // Load custom properties
    setCustomBg(localStorage.getItem("customBg") || "");
    setCustomText(localStorage.getItem("customText") || "");
    setCustomPrimary(localStorage.getItem("customPrimary") || "");
    setCustomBorder(localStorage.getItem("customBorder") || "");
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    
    // Class names
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Apply custom styling overrides
    if (customBg) {
      root.style.setProperty("--background", customBg);
      root.style.setProperty("--card", customBg);
      root.style.setProperty("--popover", customBg);
      localStorage.setItem("customBg", customBg);
    } else {
      root.style.removeProperty("--background");
      root.style.removeProperty("--card");
      root.style.removeProperty("--popover");
      localStorage.removeItem("customBg");
    }

    if (customText) {
      root.style.setProperty("--foreground", customText);
      root.style.setProperty("--card-foreground", customText);
      root.style.setProperty("--popover-foreground", customText);
      localStorage.setItem("customText", customText);
    } else {
      root.style.removeProperty("--foreground");
      root.style.removeProperty("--card-foreground");
      root.style.removeProperty("--popover-foreground");
      localStorage.removeItem("customText");
    }

    if (customPrimary) {
      root.style.setProperty("--primary", customPrimary);
      root.style.setProperty("--ring", customPrimary);
      localStorage.setItem("customPrimary", customPrimary);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      localStorage.removeItem("customPrimary");
    }

    if (customBorder) {
      root.style.setProperty("--border", customBorder);
      root.style.setProperty("--input", customBorder);
      localStorage.setItem("customBorder", customBorder);
    } else {
      root.style.removeProperty("--border");
      root.style.removeProperty("--input");
      localStorage.removeItem("customBorder");
    }

  }, [theme, mounted, customBg, customText, customPrimary, customBorder]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const applyColors = ({ bg, text, primary, border }) => {
    setCustomBg(bg || "");
    setCustomText(text || "");
    setCustomPrimary(primary || "");
    setCustomBorder(border || "");
  };

  const resetColors = () => {
    setCustomBg("");
    setCustomText("");
    setCustomPrimary("");
    setCustomBorder("");
    localStorage.removeItem("customBg");
    localStorage.removeItem("customText");
    localStorage.removeItem("customPrimary");
    localStorage.removeItem("customBorder");
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      customBg, 
      customText, 
      customPrimary, 
      customBorder, 
      applyColors, 
      resetColors 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
