"use client";

import { useEffect, useState } from "react";
import useTheme from "@/hooks/useTheme";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import { Check, Coins, Crown, Lock, Monitor, Moon, Palette, RotateCcw, Sparkles, Sun, Type } from "lucide-react";

/* Appearance page: everything is staged (mode, accent, font, text size)
   and lands together on Apply. The live preview mirrors the staged
   choices before anything touches the real app. */

// cost = coin balance needed to unlock (matches the Elite tier philosophy:
// perks unlock by balance, coins are never spent). Inter stays free.
const FONTS = [
  { id: "inter", name: "Inter", desc: "Clean & modern - the default", family: "Inter, sans-serif", cost: 0 },
  { id: "poppins", name: "Poppins", desc: "Rounded & friendly", family: "Poppins, sans-serif", cost: 100 },
  { id: "nunito", name: "Nunito", desc: "Soft & highly readable", family: "Nunito, sans-serif", cost: 100 },
  { id: "dm-sans", name: "DM Sans", desc: "Minimal & geometric", family: "DM Sans, sans-serif", cost: 120 },
  { id: "jakarta", name: "Plus Jakarta Sans", desc: "Premium & professional", family: "Plus Jakarta Sans, sans-serif", cost: 150 },
  { id: "outfit", name: "Outfit", desc: "Bold & contemporary", family: "Outfit, sans-serif", cost: 150 },
];

const TEXT_SIZES = [
  { id: "small", label: "Small", px: "14px" },
  { id: "medium", label: "Medium", px: "16px" },
  { id: "large", label: "Large", px: "18px" },
];

// Coin-gated premium themes. Anyone can stage one to see it in the live
// preview; applying needs the coin balance (balance unlock, never spent).
// card/line are only for the preview mock - the real palette is derived
// from dark+primary by ThemeContext.
const PREMIUM_THEMES = [
  { name: "Midnight Black", desc: "The landing page look", cost: 200, primary: "#22d3ee", bg: "#F4F7FB", dark: "#030303", card: "#111111", line: "#27272a" },
  { name: "Royal Amethyst", desc: "Deep violet, regal glow", cost: 450, primary: "#a855f7", bg: "#faf5ff", dark: "#0b0613", card: "#160d24", line: "#2c1b45" },
  { name: "Emerald Noir", desc: "Dark forest, mint accents", cost: 550, primary: "#34d399", bg: "#f0fdf4", dark: "#04120c", card: "#0b2015", line: "#16382a" },
  { name: "Crimson Velvet", desc: "Moody red, velvet depth", cost: 600, primary: "#fb7185", bg: "#fff1f2", dark: "#140408", card: "#220a10", line: "#3d1520" },
  { name: "Aurum Gold", desc: "Black and gold, pure luxury", cost: 700, primary: "#f59e0b", bg: "#fffbeb", dark: "#100c02", card: "#1d1607", line: "#38290e" },
];

const PRESETS = [
  { name: "Default Accent", primary: "#0891B2", bg: "#F4F7FB", dark: "#0f172a" },
  { name: "Emerald Zen", primary: "#10b981", bg: "#f0fdf4", dark: "#051f15" },
  { name: "Midnight Nebula", primary: "#d946ef", bg: "#faf5ff", dark: "#090615" },
  { name: "Sunset Glow", primary: "#f97316", bg: "#fff7ed", dark: "#1c0d02" },
  { name: "Ocean Frost", primary: "#06b6d4", bg: "#f0f9ff", dark: "#021224" },
  { name: "Rose Bloom", primary: "#f43f5e", bg: "#fff1f2", dark: "#1a0008" },
];

export default function ThemePage() {
  const { theme, toggleTheme, font, setFont, applyColors, resetColors, customPrimary } = useTheme();
  const [pendingTheme, setPendingTheme] = useState(theme);
  const [pendingFont, setPendingFont] = useState(font || "inter");
  const [preset, setPreset] = useState(null);
  const [textSize, setTextSize] = useState(() =>
    typeof window === "undefined" ? "medium" : localStorage.getItem("textSize") || "medium"
  );

  // Re-stage when the saved theme/font finish loading from context.
  const [seen, setSeen] = useState({ theme, font });
  if (seen.theme !== theme || seen.font !== font) {
    setSeen({ theme, font });
    setPendingTheme(theme);
    setPendingFont(font || "inter");
  }

  // Live coin balance decides whether Midnight Black is unlocked.
  const [coins, setCoins] = useState(null);
  useEffect(() => {
    api.get("/referrals/me")
      .then((res) => setCoins(res.data?.coins ?? 0))
      .catch(() => setCoins(0));
  }, []);

  const premiumStaged = PREMIUM_THEMES.find((t) => t.name === preset?.name) || null;
  const isUnlocked = (t) => (coins ?? 0) >= t.cost;

  // Staging is free for everyone - it only drives the live preview.
  const pickPremium = (t) => {
    if (premiumStaged?.name === t.name) {
      setPreset(null);
    } else {
      setPreset(t);
      setPendingTheme("dark"); // premium themes are dark-mode themes
    }
  };

  const pickMode = (id) => {
    setPendingTheme(id);
    if (id === "light" && premiumStaged) setPreset(null); // premium needs dark mode
  };

  const pickFont = (f) => {
    const balance = coins ?? 0;
    if (balance < f.cost) {
      toast.error(`Earn ${f.cost - balance} more coins to unlock ${f.name}`);
      return;
    }
    setPendingFont(f.id);
  };

  const applyAll = () => {
    // Locked premium themes can be previewed but never applied.
    const stagedPremium = PREMIUM_THEMES.find((t) => t.name === preset?.name);
    if (stagedPremium && (coins ?? 0) < stagedPremium.cost) {
      toast.error(`Earn ${stagedPremium.cost - (coins ?? 0)} more coins to apply ${stagedPremium.name}`);
      return;
    }
    if (pendingTheme !== theme) toggleTheme();
    setFont(pendingFont);
    if (preset) {
      // Both mode bgs are stored, so toggling light/dark later stays readable.
      applyColors({
        bgLight: preset.bg,
        bgDark: preset.dark,
        primary: preset.primary,
      });
    }
    const size = TEXT_SIZES.find((s) => s.id === textSize)?.px || "16px";
    document.documentElement.style.setProperty("--base-font-size", size);
    localStorage.setItem("textSize", textSize);
    toast.success("Appearance updated!");
  };

  const handleReset = () => {
    resetColors();
    setFont("inter");
    setPendingFont("inter");
    setPendingTheme(theme);
    setPreset(null);
    setTextSize("medium");
    document.documentElement.style.removeProperty("--base-font-size");
    localStorage.removeItem("textSize");
    toast.success("Appearance reset to defaults");
  };

  const accent = preset?.primary || customPrimary || "#0891B2";
  const fontFamily = FONTS.find((f) => f.id === pendingFont)?.family;

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Appearance</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose how SplitEase looks for you</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 hover:bg-muted transition cursor-pointer shrink-0"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          {/* Controls */}
          <div className="space-y-5">
            <Section icon={Palette} title="Mode">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "light", label: "Light", desc: "Clean and bright", Icon: Sun },
                  { id: "dark", label: "Dark", desc: "Easy on the eyes", Icon: Moon },
                ].map(({ id, label, desc, Icon }) => {
                  const selected = pendingTheme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickMode(id)}
                      className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition cursor-pointer ${
                        selected ? "border-cyan-600 bg-cyan-500/5" : "border-border hover:border-cyan-400/40"
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        id === "dark" ? "bg-slate-900 text-amber-300" : "bg-amber-100 text-amber-500"
                      }`}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">{desc}</p>
                      </span>
                      {selected && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center">
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section icon={Sparkles} title="Accent color">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESETS.map((p) => {
                  const selected = preset?.name === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setPreset(selected ? null : p)}
                      title={p.name}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer ${
                        selected ? "border-cyan-500 bg-cyan-500/5" : "border-border hover:border-cyan-500/40 hover:bg-muted/50"
                      }`}
                    >
                      <span className="relative w-9 h-9 rounded-full ring-2 ring-white dark:ring-slate-700 shadow" style={{ backgroundColor: p.primary }}>
                        {selected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check size={14} className="text-white drop-shadow" strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{p.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">Tap a color to stage it, tap again to keep your current colors.</p>
            </Section>

            <Section icon={Crown} title="Premium themes">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PREMIUM_THEMES.map((t) => {
                  const unlocked = isUnlocked(t);
                  const staged = premiumStaged?.name === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => pickPremium(t)}
                      className={`rounded-xl border-2 overflow-hidden text-left transition cursor-pointer ${
                        staged ? "border-cyan-500" : "border-border hover:border-cyan-400/40"
                      }`}
                    >
                      {/* Mini theme mock */}
                      <div className="relative p-3.5" style={{ backgroundColor: t.dark }}>
                        <div className="flex items-center justify-between">
                          <span className="font-serif-premium text-white text-sm lowercase">splitease</span>
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.primary, boxShadow: `0 0 10px ${t.primary}` }} />
                        </div>
                        <div className="mt-2.5 space-y-1.5">
                          <div className="h-1.5 w-3/5 rounded bg-white/15" />
                          <div className="h-1.5 w-2/5 rounded bg-white/10" />
                        </div>
                        <div className="mt-2.5 h-5 w-16 rounded-md" style={{ backgroundColor: t.card, border: `1px solid ${t.line}` }} />
                        {!unlocked && (
                          <span className="absolute top-2.5 right-9 flex items-center gap-1 rounded-full bg-black/60 border border-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
                            <Lock size={9} /> {t.cost}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-card">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-foreground truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{t.desc}</p>
                        </div>
                        {staged ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cyan-600 text-white px-2.5 py-1 text-[10px] font-bold">
                            <Check size={10} strokeWidth={3} /> Staged
                          </span>
                        ) : unlocked ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-2.5 py-1 text-[10px] font-bold">
                            <Check size={10} strokeWidth={3} /> Unlocked
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-[10px] font-bold">
                            <Coins size={10} /> {coins === null ? "…" : coins}/{t.cost}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Stage any premium theme to preview it live. Applying needs that coin balance — coins are never spent. Earn coins via Referrals &amp; Rewards on your profile.
              </p>
            </Section>

            <Section icon={Type} title="Font">
              <div className="space-y-2">
                {FONTS.map((f) => {
                  const selected = pendingFont === f.id;
                  const unlocked = f.cost === 0 || (coins ?? 0) >= f.cost;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => pickFont(f)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition cursor-pointer ${
                        selected
                          ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-500/10"
                          : unlocked
                          ? "border-border hover:border-cyan-500/30 hover:bg-muted/50"
                          : "border-border bg-muted/30 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        {unlocked ? (
                          <Radio selected={selected} />
                        ) : (
                          <Lock size={14} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="min-w-0 text-left">
                          <p className="text-sm font-bold text-foreground truncate" style={{ fontFamily: f.family }}>{f.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{f.desc}</p>
                        </span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:block text-sm text-muted-foreground" style={{ fontFamily: f.family }}>
                          The quick brown fox
                        </span>
                        {f.cost > 0 && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            unlocked
                              ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            <Coins size={10} /> {f.cost}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fonts unlock automatically when your coin balance reaches their amount. Coins are never spent.
              </p>
            </Section>

            <Section title="Text size">
              <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1 w-full sm:w-auto">
                {TEXT_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTextSize(s.id)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                      textSize === s.id ? "bg-card text-foreground shadow border border-border" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          {/* Live preview + apply (sticky on desktop) */}
          <div className="lg:sticky lg:top-24 space-y-3">
            <Preview dark={pendingTheme === "dark"} premium={premiumStaged} accent={accent} fontFamily={fontFamily} textSize={textSize} />
            <button
              type="button"
              onClick={applyAll}
              className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-sm"
            >
              Apply appearance
            </button>
            <p className="text-center text-xs text-muted-foreground">Nothing changes until you apply.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Icon size={15} />
          </span>
        )}
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Radio({ selected }) {
  return (
    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-cyan-600" : "border-border"}`}>
      {selected && <span className="w-2 h-2 rounded-full bg-cyan-600" />}
    </span>
  );
}

function Preview({ dark, premium, accent, fontFamily, textSize }) {
  const size = { small: "12px", medium: "13px", large: "15px" }[textSize];
  const c = premium
    ? { bg: premium.dark, card: premium.card, line: premium.line, text: "#f4f4f5", dim: "#9ca3af" }
    : dark
    ? { bg: "#0f172a", card: "#1e293b", line: "#334155", text: "#e2e8f0", dim: "#94a3b8" }
    : { bg: "#f4f7fb", card: "#ffffff", line: "#e2e8f0", text: "#1a2332", dim: "#64748b" };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-sm font-bold text-foreground">Live preview</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dark ? "Dark" : "Light"}</span>
      </div>

      <div className="p-4" style={{ backgroundColor: c.bg, fontFamily, fontSize: size }}>
        {/* Mini navbar */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: c.card, border: `1px solid ${c.line}` }}>
          <span className="font-extrabold" style={{ color: c.text }}>SplitEase</span>
          <span className="w-6 h-6 rounded-full" style={{ backgroundColor: accent }} />
        </div>

        {/* Balance card */}
        <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: accent }}>
          <p className="text-[0.8em] font-semibold text-white/80">Total balance</p>
          <p className="text-[1.3em] font-extrabold text-white">₹4,250</p>
        </div>

        {/* Expense rows */}
        <div className="mt-3 space-y-2">
          {[
            ["Beach Dinner", "₹2,400"],
            ["Taxi Airport", "₹1,200"],
          ].map(([name, amt]) => (
            <div key={name} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: c.card, border: `1px solid ${c.line}` }}>
              <span className="font-semibold" style={{ color: c.text }}>{name}</span>
              <span className="font-bold" style={{ color: accent }}>{amt}</span>
            </div>
          ))}
        </div>

        {/* Button row */}
        <div className="mt-3 flex gap-2">
          <span className="flex-1 rounded-lg py-2 text-center font-bold text-white text-[0.85em]" style={{ backgroundColor: accent }}>
            Settle up
          </span>
          <span className="flex-1 rounded-lg py-2 text-center font-bold text-[0.85em]" style={{ color: c.dim, border: `1px solid ${c.line}` }}>
            Remind
          </span>
        </div>
      </div>
    </div>
  );
}
