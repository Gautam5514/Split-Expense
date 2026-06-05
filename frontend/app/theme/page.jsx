"use client";

import { useState, useEffect } from "react";
import useTheme from "@/hooks/useTheme";
import toast from "@/lib/toast";
import { Check, Type, Palette, Sparkles, RotateCcw } from "lucide-react";

const FONTS = [
  {
    id: "inter",
    name: "Inter",
    desc: "Clean & modern - the default",
    preview: "The quick brown fox",
    style: { fontFamily: "Inter, sans-serif" },
  },
  {
    id: "poppins",
    name: "Poppins",
    desc: "Rounded & friendly",
    preview: "The quick brown fox",
    style: { fontFamily: "Poppins, sans-serif" },
  },
  {
    id: "nunito",
    name: "Nunito",
    desc: "Soft & highly readable",
    preview: "The quick brown fox",
    style: { fontFamily: "Nunito, sans-serif" },
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    desc: "Minimal & geometric",
    preview: "The quick brown fox",
    style: { fontFamily: "DM Sans, sans-serif" },
  },
  {
    id: "jakarta",
    name: "Plus Jakarta Sans",
    desc: "Premium & professional",
    preview: "The quick brown fox",
    style: { fontFamily: "Plus Jakarta Sans, sans-serif" },
  },
  {
    id: "outfit",
    name: "Outfit",
    desc: "Bold & contemporary",
    preview: "The quick brown fox",
    style: { fontFamily: "Outfit, sans-serif" },
  },
];

const TEXT_SIZES = [
  { id: "small",  label: "Small",           className: "text-sm" },
  { id: "medium", label: "Medium (Default)", className: "text-base" },
  { id: "large",  label: "Large",           className: "text-lg" },
];

const PRESETS = [
  { name: "Default Accent",    primary: "#0891B2", bg: "#F4F7FB",   dark: "#0f172a" },
  { name: "Emerald Zen",       primary: "#10b981", bg: "#f0fdf4",   dark: "#051f15" },
  { name: "Midnight Nebula",   primary: "#d946ef", bg: "#faf5ff",   dark: "#090615" },
  { name: "Sunset Glow",       primary: "#f97316", bg: "#fff7ed",   dark: "#1c0d02" },
  { name: "Ocean Frost",       primary: "#06b6d4", bg: "#f0f9ff",   dark: "#021224" },
  { name: "Rose Bloom",        primary: "#f43f5e", bg: "#fff1f2",   dark: "#1a0008" },
];

export default function ThemePage() {
  const { theme, toggleTheme, font, setFont, applyColors, resetColors } = useTheme();
  const [textSize, setTextSize] = useState("medium");
  const [pendingTheme, setPendingTheme] = useState(theme);
  const [pendingFont, setPendingFont] = useState(font || "inter");

  useEffect(() => {
    setPendingTheme(theme);
    setPendingFont(font || "inter");
    setTextSize(localStorage.getItem("textSize") || "medium");
  }, [theme, font]);

  const applyTheme = () => {
    // Apply mode
    if (pendingTheme !== theme) toggleTheme();
    // Apply font
    setFont(pendingFont);
    // Apply text size
    const sizeMap = { small: "14px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--base-font-size", sizeMap[textSize]);
    localStorage.setItem("textSize", textSize);
    toast.success("Appearance updated!");
  };

  const handlePreset = (preset) => {
    const isDark = pendingTheme === "dark";
    applyColors({
      bg: isDark ? preset.dark : preset.bg,
      primary: preset.primary,
      text: "",
      border: "",
    });
    toast.success(`"${preset.name}" applied!`);
  };

  const handleReset = () => {
    resetColors();
    setFont("inter");
    setPendingFont("inter");
    setTextSize("medium");
    localStorage.removeItem("textSize");
    toast.success("Appearance reset to defaults");
  };

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Page title */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Appearance</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose how SplitEase looks for you</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-3 py-2 hover:bg-muted transition cursor-pointer mt-1"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>

        {/* ── Color Theme ── */}
        <Section icon={<Palette size={16} className="text-cyan-600 dark:text-cyan-400" />} title="Color Theme">
          <div className="grid grid-cols-2 gap-4">
            {/* Light Mode preview */}
            <ThemeCard
              selected={pendingTheme === "light"}
              onClick={() => setPendingTheme("light")}
              label="Light Mode"
              desc="Clean and bright"
              preview={
                <div className="bg-[#f1f5f9] rounded-xl p-3 space-y-2 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <div className="h-1.5 w-16 bg-slate-200 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-white border border-slate-200 rounded" />
                    <div className="h-2.5 bg-white border border-slate-200 rounded" />
                    <div className="h-2.5 bg-white border border-slate-200 rounded w-4/5" />
                  </div>
                </div>
              }
            />

            {/* Dark Mode preview */}
            <ThemeCard
              selected={pendingTheme === "dark"}
              onClick={() => setPendingTheme("dark")}
              label="Dark Mode"
              desc="Easy on the eyes"
              preview={
                <div className="bg-slate-900 rounded-xl p-3 space-y-2 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    <div className="h-1.5 w-16 bg-slate-700 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-slate-800 border border-slate-700 rounded" />
                    <div className="h-2.5 bg-slate-800 border border-slate-700 rounded" />
                    <div className="h-2.5 bg-slate-800 border border-slate-700 rounded w-4/5" />
                  </div>
                </div>
              }
            />
          </div>

          {/* Apply button */}
          <button
            type="button"
            onClick={applyTheme}
            className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-sm rounded transition cursor-pointer shadow-sm mt-2"
          >
            Apply Theme
          </button>
          <p className="text-center text-xs text-muted-foreground">Changes apply instantly across the app.</p>
        </Section>

        {/* ── Color Presets ── */}
        <Section icon={<Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" />} title="Color Presets">
          <div className="grid grid-cols-3 gap-2.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePreset(preset)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-cyan-500/40 hover:bg-cyan-500/5 transition cursor-pointer group"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: preset.primary }}
                />
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground text-center leading-tight">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Font ── */}
        <Section icon={<Type size={16} className="text-cyan-600 dark:text-cyan-400" />} title="Font">
          <div className="space-y-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setPendingFont(f.id); setFont(f.id); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition cursor-pointer ${
                  pendingFont === f.id
                    ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-500/10"
                    : "border-border hover:border-cyan-500/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Radio dot */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    pendingFont === f.id ? "border-cyan-600" : "border-border"
                  }`}>
                    {pendingFont === f.id && <div className="w-2 h-2 rounded-full bg-cyan-600" />}
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="text-sm font-bold text-foreground" style={f.style}>{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>

                <span className="text-sm text-muted-foreground shrink-0 ml-3" style={f.style}>
                  {f.preview}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Text Size ── */}
        <Section title="Text Size">
          <div className="flex items-center gap-6">
            {TEXT_SIZES.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setTextSize(s.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                    textSize === s.id ? "border-cyan-600" : "border-border"
                  }`}
                >
                  {textSize === s.id && <div className="w-2.5 h-2.5 rounded-full bg-cyan-600" />}
                </div>
                <span className={`font-medium text-foreground cursor-pointer ${s.className}`} onClick={() => setTextSize(s.id)}>
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ThemeCard({ selected, onClick, label, desc, preview }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition cursor-pointer ${
        selected
          ? "border-cyan-600"
          : "border-border hover:border-cyan-400/50"
      }`}
    >
      {/* Check badge */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center z-10">
          <Check size={13} className="text-white" strokeWidth={3} />
        </div>
      )}

      {/* Visual preview */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800">
        {preview}
      </div>

      {/* Label */}
      <div className="px-3 py-2.5 bg-card">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? "border-cyan-600" : "border-border"}`}>
            {selected && <div className="w-2 h-2 rounded-full bg-cyan-600" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
