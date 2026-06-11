"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

/* ── Tiny HSL colour helpers ─────────────────────────────────────────── */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lighten(hex, amt) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return hex;
  try {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, s, Math.min(100, Math.max(0, l + amt)));
  } catch { return hex; }
}

/* ── Derive a full, balanced palette from a single bg hex + primary ── */
function derivePalette(bg, primary, isDark) {
  if (isDark) {
    // bg is a very dark color - lift derived surfaces progressively
    return {
      "--background":         bg,
      "--foreground":         "#E4EAF2",
      "--card":               lighten(bg, 7),
      "--card-foreground":    "#E4EAF2",
      "--popover":            lighten(bg, 7),
      "--popover-foreground": "#E4EAF2",
      "--primary":            primary,
      "--primary-foreground": "#ffffff",
      "--secondary":          lighten(bg, 12),
      "--secondary-foreground":"#A8BECF",
      "--muted":              lighten(bg, 12),
      "--muted-foreground":   "#8494A6",
      "--accent":             lighten(bg, 12),
      "--accent-foreground":  "#E4EAF2",
      "--border":             lighten(bg, 18),
      "--input":              lighten(bg, 18),
      "--ring":               primary,
    };
  } else {
    // bg is a light tinted color - cards are white, muted is slightly darker
    return {
      "--background":         bg,
      "--foreground":         "#1A2332",
      "--card":               "#ffffff",
      "--card-foreground":    "#1A2332",
      "--popover":            "#ffffff",
      "--popover-foreground": "#1A2332",
      "--primary":            primary,
      "--primary-foreground": "#ffffff",
      "--secondary":          lighten(bg, -4),
      "--secondary-foreground":"#155E75",
      "--muted":              lighten(bg, -4),
      "--muted-foreground":   "#667085",
      "--accent":             lighten(bg, -4),
      "--accent-foreground":  "#1A2332",
      "--border":             lighten(bg, -10),
      "--input":              lighten(bg, -10),
      "--ring":               primary,
    };
  }
}

const PALETTE_VARS = [
  "--background", "--foreground",
  "--card", "--card-foreground",
  "--popover", "--popover-foreground",
  "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground",
  "--muted", "--muted-foreground",
  "--accent", "--accent-foreground",
  "--border", "--input", "--ring",
];

export function ThemeProvider({ children }) {
  const [theme, setTheme]     = useState("light");
  const [mounted, setMounted] = useState(false);
  const [font, setFontState]  = useState("inter");

  // Store one bg per mode + the primary for the active custom preset.
  // Per-mode bgs keep the palette readable when the user toggles light/dark
  // from the navbar after applying a preset (a dark bg must never be fed
  // into the light-mode palette derivation).
  const [customBgLight, setCustomBgLight] = useState("");
  const [customBgDark,  setCustomBgDark]  = useState("");
  const [customPrimary, setCustomPrimary] = useState("");

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    const bgLight = localStorage.getItem("customBgLight") || "";
    const bgDark  = localStorage.getItem("customBgDark")  || "";
    const legacy  = localStorage.getItem("customBg");
    if (legacy && !bgLight && !bgDark) {
      // Migrate the old single-bg key to the mode it was applied in.
      const wasDark = (storedTheme || "light") === "dark";
      if (wasDark) {
        setCustomBgDark(legacy);
        localStorage.setItem("customBgDark", legacy);
      } else {
        setCustomBgLight(legacy);
        localStorage.setItem("customBgLight", legacy);
      }
      localStorage.removeItem("customBg");
    } else {
      setCustomBgLight(bgLight);
      setCustomBgDark(bgDark);
    }

    setCustomPrimary(localStorage.getItem("customPrimary") || "");
    setFontState(localStorage.getItem("appFont") || "inter");
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;

    // Apply theme class
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Apply palette or reset to CSS defaults
    const isDark = theme === "dark";
    const bgForMode = isDark ? customBgDark : customBgLight;
    if (bgForMode && customPrimary) {
      const palette = derivePalette(bgForMode, customPrimary, isDark);
      Object.entries(palette).forEach(([k, v]) =>
        root.style.setProperty(k, v)
      );
    } else {
      // Remove all custom overrides → CSS :root / .dark take over,
      // but keep the accent if one was chosen.
      PALETTE_VARS.forEach((v) => root.style.removeProperty(v));
      if (customPrimary) {
        root.style.setProperty("--primary", customPrimary);
        root.style.setProperty("--ring", customPrimary);
      }
    }

    // Font
    const fontMap = {
      inter:     '"Inter", ui-sans-serif, system-ui, sans-serif',
      poppins:   '"Poppins", ui-sans-serif, system-ui, sans-serif',
      nunito:    '"Nunito", ui-sans-serif, system-ui, sans-serif',
      "dm-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
      jakarta:   '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
      outfit:    '"Outfit", ui-sans-serif, system-ui, sans-serif',
    };
    root.style.setProperty("--font-sans", fontMap[font] || fontMap.inter);
    localStorage.setItem("appFont", font);

  }, [theme, mounted, customBgLight, customBgDark, customPrimary, font]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Called by the theme page - presets carry a bg for each mode.
  const applyColors = ({ bgLight, bgDark, primary }) => {
    const lightVal   = bgLight || "";
    const darkVal    = bgDark  || "";
    const primaryVal = primary || "";
    setCustomBgLight(lightVal);
    setCustomBgDark(darkVal);
    setCustomPrimary(primaryVal);
    const persist = (key, val) =>
      val ? localStorage.setItem(key, val) : localStorage.removeItem(key);
    persist("customBgLight", lightVal);
    persist("customBgDark",  darkVal);
    persist("customPrimary", primaryVal);
  };

  const setFont = (f) => setFontState(f);

  const resetColors = () => {
    setCustomBgLight("");
    setCustomBgDark("");
    setCustomPrimary("");
    ["customBgLight", "customBgDark", "customPrimary",
     "customBg", "customText", "customBorder"].forEach((k) => localStorage.removeItem(k));
  };

  return (
    <ThemeContext.Provider value={{
      theme, toggleTheme,
      customBgLight, customBgDark, customPrimary,
      applyColors, resetColors,
      font, setFont,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
