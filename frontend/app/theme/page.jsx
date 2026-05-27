"use client";

import { useState, useEffect } from "react";
import useTheme from "@/hooks/useTheme";
import toast from "@/lib/toast";
import { 
  Palette, Sun, Moon, ArrowLeft, RotateCcw, Check, Sparkles, AlertTriangle, Eye, ShieldCheck
} from "lucide-react";
import Link from "next/link";

const PRESETS = [
  {
    name: "Default Accent",
    desc: "Standard indigo & violet theme",
    bgDark: "#0a0a0a",
    bgLight: "#ffffff",
    textDark: "#ededed",
    textLight: "#171717",
    primary: "#0E7490",
    borderDark: "#374151",
    borderLight: "#e5e7eb"
  },
  {
    name: "Emerald Zen",
    desc: "Relaxing mint and dark forest tones",
    bgDark: "#051f15",
    bgLight: "#f0fdf4",
    textDark: "#e6f4ea",
    textLight: "#064e3b",
    primary: "#10b981",
    borderDark: "#064e3b",
    borderLight: "#bbf7d0"
  },
  {
    name: "Midnight Nebula",
    desc: "Deep nebula space violet vibes",
    bgDark: "#090615",
    bgLight: "#faf5ff",
    textDark: "#f5d0fe",
    textLight: "#581c87",
    primary: "#d946ef",
    borderDark: "#3b0764",
    borderLight: "#f3e8ff"
  },
  {
    name: "Sunset Glow",
    desc: "Warm clay background and orange highlight",
    bgDark: "#1c0d02",
    bgLight: "#fff7ed",
    textDark: "#ffedd5",
    textLight: "#7c2d12",
    primary: "#f97316",
    borderDark: "#7c2d12",
    borderLight: "#ffedd5"
  },
  {
    name: "Ocean Frost",
    desc: "Cool marine depths and icy cyan",
    bgDark: "#021224",
    bgLight: "#f0f9ff",
    textDark: "#e0f2fe",
    textLight: "#075985",
    primary: "#06b6d4",
    borderDark: "#075985",
    borderLight: "#bae6fd"
  },
  {
    name: "Cyberpunk",
    desc: "Radical high contrast neon magenta & green",
    bgDark: "#080010",
    bgLight: "#fff0f6",
    textDark: "#39ff14",
    textLight: "#ff007f",
    primary: "#ff007f",
    borderDark: "#ff007f",
    borderLight: "#ffb3d9"
  }
];

const DARK_BACKGROUNDS = [
  { hex: "#0a0a0a", label: "Pure Carbon" },
  { hex: "#0f172a", label: "Slate Blue" },
  { hex: "#051f15", label: "Emerald Pine" },
  { hex: "#090615", label: "Nebula Dark" },
  { hex: "#1c0d02", label: "Earth Amber" },
  { hex: "#021224", label: "Deep Ocean" }
];

const LIGHT_BACKGROUNDS = [
  { hex: "#ffffff", label: "Pure White" },
  { hex: "#f8fafc", label: "Cool Slate" },
  { hex: "#f0fdf4", label: "Mint Herb" },
  { hex: "#faf5ff", label: "Lilac Petal" },
  { hex: "#fff7ed", label: "Warm Sand" },
  { hex: "#f0f9ff", label: "Ocean Breeze" }
];

const DARK_TEXTS = [
  { hex: "#ededed", label: "Default Silver" },
  { hex: "#ffffff", label: "Pure White" },
  { hex: "#a7f3d0", label: "Mint Glow" },
  { hex: "#f5d0fe", label: "Soft Violet" },
  { hex: "#e0f2fe", label: "Ice Blue" },
  { hex: "#39ff14", label: "Neon Lime" }
];

const LIGHT_TEXTS = [
  { hex: "#171717", label: "Deep Black" },
  { hex: "#334155", label: "Slate Grey" },
  { hex: "#064e3b", label: "Forest Green" },
  { hex: "#581c87", label: "Royal Purple" },
  { hex: "#075985", label: "Navy Blue" },
  { hex: "#7c2d12", label: "Burnt Sienna" }
];

const ACCENTS = [
  { hex: "#0E7490", label: "Indigo" },
  { hex: "#0891B2", label: "Violet" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#ff007f", label: "Magenta" },
  { hex: "#06b6d4", label: "Teal" }
];

const DARK_BORDERS = [
  { hex: "#374151", label: "Slate Grey" },
  { hex: "#064e3b", label: "Forest Green" },
  { hex: "#3b0764", label: "Nebula Plum" },
  { hex: "#7c2d12", label: "Warm Clay" },
  { hex: "#075985", label: "Navy Steel" }
];

const LIGHT_BORDERS = [
  { hex: "#e5e7eb", label: "Light Grey" },
  { hex: "#bbf7d0", label: "Mint Herb" },
  { hex: "#f3e8ff", label: "Lilac Edge" },
  { hex: "#ffedd5", label: "Clay Line" },
  { hex: "#bae6fd", label: "Sky Steel" }
];

// Helper to check text-background contrast
const hexToRgb = (hex) => {
  if (!hex) return null;
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

const getLuminance = (rgb) => {
  if (!rgb) return 0;
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
};

const evaluateContrast = (bgHex, textHex) => {
  const bgRgb = hexToRgb(bgHex);
  const textRgb = hexToRgb(textHex);
  if (!bgRgb || !textRgb) return { safe: true, score: 100 };
  
  const bgL = getLuminance(bgRgb);
  const textL = getLuminance(textRgb);
  const diff = Math.abs(bgL - textL);
  
  return {
    safe: diff > 48,
    score: Math.round(diff)
  };
};

export default function ThemeCustomizerPage() {
  const { 
    theme, 
    toggleTheme, 
    customBg, 
    customText, 
    customPrimary, 
    customBorder, 
    applyColors, 
    resetColors 
  } = useTheme();

  const [localBg, setLocalBg] = useState("");
  const [localText, setLocalText] = useState("");
  const [localPrimary, setLocalPrimary] = useState("");
  const [localBorder, setLocalBorder] = useState("");

  useEffect(() => {
    setLocalBg(customBg || (theme === "dark" ? "#0a0a0a" : "#ffffff"));
    setLocalText(customText || (theme === "dark" ? "#ededed" : "#171717"));
    setLocalPrimary(customPrimary || "#0E7490");
    setLocalBorder(customBorder || (theme === "dark" ? "#374151" : "#e5e7eb"));
  }, [customBg, customText, customPrimary, customBorder, theme]);

  const selectPreset = (preset) => {
    const isDark = theme === "dark";
    const bg = isDark ? preset.bgDark : preset.bgLight;
    const text = isDark ? preset.textDark : preset.textLight;
    const border = isDark ? preset.borderDark : preset.borderLight;

    setLocalBg(bg);
    setLocalText(text);
    setLocalPrimary(preset.primary);
    setLocalBorder(border);
    toast.success(`Loaded "${preset.name}" details! Click save to apply globally. 🎨`);
  };

  const contrastCheck = evaluateContrast(localBg, localText);

  const handleSave = () => {
    if (!contrastCheck.safe) {
      toast.error("Low Contrast warning! Please increase standard text readability first.");
      return;
    }
    applyColors({
      bg: localBg,
      text: localText,
      primary: localPrimary,
      border: localBorder
    });
    toast.success("Theme settings saved and applied globally! 🚀");
  };

  const handleReset = () => {
    resetColors();
    setLocalBg(theme === "dark" ? "#0a0a0a" : "#ffffff");
    setLocalText(theme === "dark" ? "#ededed" : "#171717");
    setLocalPrimary("#0E7490");
    setLocalBorder(theme === "dark" ? "#374151" : "#e5e7eb");
    toast.success("Reverted workspace color settings to defaults!");
  };

  const activeBgOptions = theme === "dark" ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS;
  const activeTextOptions = theme === "dark" ? DARK_TEXTS : LIGHT_TEXTS;
  const activeBorderOptions = theme === "dark" ? DARK_BORDERS : LIGHT_BORDERS;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 pt-28">
      {/* Decorative Orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 w-full">
        
        {/* Navigation Head */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link 
            href="/users" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group pl-2"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Overview
          </Link>
          
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <RotateCcw size={13} />
            Revert to default theme
          </button>
        </div>

        {/* Headline */}
        <div className="flex items-start gap-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/15 shrink-0 shadow-sm">
            <Palette size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Theme Customizer</h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-1 leading-relaxed max-w-xl font-medium">
              Choose your perfect combination of colors. All changes are reactive and apply automatically across the entire app workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* ── LEFT: Single Unified Design Card (3 Cols) ── */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-sm space-y-8">
            
            {/* System Mode (Pill Switcher) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 block ml-1">System Mode</h3>
              <div className="grid grid-cols-2 gap-3 bg-slate-550/5 dark:bg-slate-950/20 p-1.5 rounded-full border border-slate-100 dark:border-slate-800/60 max-w-md">
                <button
                  onClick={() => { if (theme !== "light") toggleTheme(); }}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full font-extrabold text-xs transition-all active:scale-95 cursor-pointer ${
                    theme === "light"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350"
                  }`}
                >
                  <Sun size={15} />
                  Light Mode
                </button>
                <button
                  onClick={() => { if (theme !== "dark") toggleTheme(); }}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full font-extrabold text-xs transition-all active:scale-95 cursor-pointer ${
                    theme === "dark"
                      ? "bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350"
                  }`}
                >
                  <Moon size={15} />
                  Dark Mode
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 block ml-1">
                <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                Premium Theme Presets
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => selectPreset(preset)}
                    className="flex flex-col text-left p-4 rounded-[20px] border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-850/10 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-slate-850 dark:text-slate-100 group-hover:text-cyan-600 dark:text-cyan-400 transition-colors">
                        {preset.name}
                      </span>
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme === "dark" ? preset.bgDark : preset.bgLight }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Palette Customizer */}
            <div className="space-y-6 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 block ml-1 border-t border-slate-100 dark:border-slate-800/60 pt-6">Custom Palette Editor</h3>

              {/* Background Color Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-450 ml-1">
                  Background Color (5+ Options)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeBgOptions.map((option) => (
                    <button
                      key={option.hex}
                      onClick={() => setLocalBg(option.hex)}
                      className={`flex items-center gap-2 p-2.5 rounded-[16px] border text-xs font-semibold transition-all cursor-pointer ${
                        localBg === option.hex
                          ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-slate-50 dark:bg-slate-850"
                          : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent"
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-md border border-black/10 shrink-0" style={{ backgroundColor: option.hex }} />
                      <span className="text-slate-700 dark:text-slate-350 truncate">{option.label}</span>
                      {localBg === option.hex && <Check size={12} className="ml-auto text-cyan-600 dark:text-cyan-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Color Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-450 ml-1">
                  Text Color (Multiple Options)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeTextOptions.map((option) => (
                    <button
                      key={option.hex}
                      onClick={() => setLocalText(option.hex)}
                      className={`flex items-center gap-2 p-2.5 rounded-[16px] border text-xs font-semibold transition-all cursor-pointer ${
                        localText === option.hex
                          ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-slate-50 dark:bg-slate-850"
                          : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent"
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-md border border-black/10 shrink-0 flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: option.hex, color: localBg }}>
                        T
                      </span>
                      <span className="text-slate-700 dark:text-slate-350 truncate">{option.label}</span>
                      {localText === option.hex && <Check size={12} className="ml-auto text-cyan-600 dark:text-cyan-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Button Color Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-450 ml-1">
                  Buttons & Accent Color (Maximum)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCENTS.map((option) => (
                    <button
                      key={option.hex}
                      onClick={() => setLocalPrimary(option.hex)}
                      className={`flex items-center gap-2 p-2.5 rounded-[16px] border text-xs font-semibold transition-all cursor-pointer ${
                        localPrimary === option.hex
                          ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-slate-50 dark:bg-slate-850"
                          : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent"
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-md border border-black/10 shrink-0" style={{ backgroundColor: option.hex }} />
                      <span className="text-slate-700 dark:text-slate-350 truncate">{option.label}</span>
                      {localPrimary === option.hex && <Check size={12} className="ml-auto text-cyan-600 dark:text-cyan-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Color Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-450 ml-1">
                  Borders & Card Edges
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeBorderOptions.map((option) => (
                    <button
                      key={option.hex}
                      onClick={() => setLocalBorder(option.hex)}
                      className={`flex items-center gap-2 p-2.5 rounded-[16px] border text-xs font-semibold transition-all cursor-pointer ${
                        localBorder === option.hex
                          ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-slate-50 dark:bg-slate-850"
                          : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent"
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-md shrink-0 border-2" style={{ borderColor: option.hex, backgroundColor: "transparent" }} />
                      <span className="text-slate-700 dark:text-slate-350 truncate">{option.label}</span>
                      {localBorder === option.hex && <Check size={12} className="ml-auto text-cyan-600 dark:text-cyan-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Save Form Action */}
            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={!contrastCheck.safe}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs rounded-full shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-99 cursor-pointer"
              >
                Apply Custom Theme
              </button>
            </div>

          </div>

          {/* ── RIGHT: Sandbox Theme Preview Card (2 Cols) ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-28 space-y-6">
            
            <div 
              className="border rounded-[32px] sm:rounded-[40px] shadow-sm p-6 transition-all duration-350 overflow-hidden relative flex flex-col justify-between min-h-[480px]"
              style={{ 
                backgroundColor: localBg, 
                color: localText, 
                borderColor: localBorder 
              }}
            >
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:16px_16px] pointer-events-none" />
              
              <div className="relative space-y-6">
                
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: localBorder }}>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: localPrimary }}>S</span>
                    <span className="font-extrabold text-xs uppercase tracking-widest opacity-85">SplitEase Sandbox</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full opacity-90 border flex items-center gap-1.5" style={{ borderColor: localBorder }}>
                    <Eye size={10} style={{ color: localPrimary }} />
                    Live View
                  </span>
                </div>

                {/* Simulated Greeting */}
                <div className="space-y-1">
                  <h4 className="text-xl font-bold tracking-tight">Hi, Gautam Pandit</h4>
                  <p className="text-xs opacity-70">Your shared expenses and active trip insights.</p>
                </div>

                {/* Simulated Group Input Form */}
                <div className="space-y-2 p-4 rounded-[20px] border" style={{ borderColor: localBorder, backgroundColor: `rgba(0, 0, 0, ${theme === "dark" ? 0.2 : 0.02})` }}>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">SIMULATED FIELD</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      readOnly 
                      placeholder="Simulated input border..." 
                      className="w-full bg-transparent border rounded-full px-4 py-2 text-xs font-semibold focus:outline-none"
                      style={{ 
                        borderColor: localBorder, 
                        color: localText
                      }}
                    />
                  </div>
                </div>

                {/* Simulated Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-xl space-y-1" style={{ borderColor: localBorder }}>
                    <span className="text-[9px] font-bold opacity-60 uppercase">This Month</span>
                    <p className="text-base font-extrabold">₹3,450</p>
                  </div>
                  <div className="p-3 border rounded-xl space-y-1" style={{ borderColor: localBorder }}>
                    <span className="text-[9px] font-bold opacity-60 uppercase">Smart Insight</span>
                    <p className="text-base font-extrabold" style={{ color: localPrimary }}>Saving Mode</p>
                  </div>
                </div>

              </div>

              {/* Simulated Sandbox Buttons */}
              <div className="relative mt-8 space-y-2">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 text-white shrink-0"
                  style={{ backgroundColor: localPrimary }}
                >
                  <Sparkles size={12} />
                  Simulated Primary Button
                </button>
                <div className="flex items-center justify-center text-[10px] opacity-60 font-semibold text-center">
                  Preview card renders in your configured custom palette!
                </div>
              </div>

            </div>

            {/* Smart Contrast Evaluator */}
            <div className={`p-5 border rounded-[24px] sm:rounded-[32px] shadow-xl transition-all duration-300 ${
              contrastCheck.safe 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300 animate-pulse"
            }`}>
              <div className="flex gap-3">
                {contrastCheck.safe ? (
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                )}
                <div className="space-y-1.5 leading-relaxed">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    {contrastCheck.safe ? "Contrast Safety Check: Pass" : "Low Contrast Danger Warning"}
                    <span className="text-xs opacity-75">(Luminance Diff: {contrastCheck.score})</span>
                  </h4>
                  <p className="text-xs">
                    {contrastCheck.safe 
                      ? "Your selected background and text color combination passes readability standards. This combination is highly legible and provides comfortable visibility."
                      : "WARNING: Your text color is too similar to the background color! Text elements may blend in and become invisible to readers. Please choose a higher contrast combination to continue."
                    }
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
