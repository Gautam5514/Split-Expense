"use client";

import { useEffect, useState } from "react";
import useTheme from "@/hooks/useTheme";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import PurchaseModal from "@/components/PurchaseModal";
import { playCoinSpend } from "@/lib/coinSound";
import { Check, Coins, Crown, Lock, Monitor, Moon, Palette, RotateCcw, Sparkles, Sun, Type } from "lucide-react";

/* Appearance page: everything is staged (mode, accent, font, text size)
   and lands together on Apply. The live preview mirrors the staged
   choices before anything touches the real app. */

// cost = coins SPENT to purchase the item (one-time, owned forever after).
// Must stay in sync with backend/config/storeConfig.js - the server is the
// source of truth for prices. Inter stays free.
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

// Premium themes bought with coins. Anyone can stage one to see it in the
// live preview; applying requires owning it (one-time purchase).
// card/line are only for the preview mock - the real palette is derived
// from dark+primary by ThemeContext.
// While true, Aurora Glass can be applied without owning it (testing only).
const GLASS_TEST_MODE = false;

// Mini aurora backdrop used by the grid mock + live preview for Aurora Glass.
const GLASS_PREVIEW_BG =
  "radial-gradient(80% 70% at 15% 0%, rgba(56,189,248,0.22), transparent 70%), radial-gradient(70% 60% at 90% 15%, rgba(167,139,250,0.18), transparent 70%), radial-gradient(70% 65% at 30% 100%, rgba(14,116,144,0.25), transparent 72%), #060a14";

const PREMIUM_THEMES = [
  { id: "glass", glass: true, name: "Aurora Glass", desc: "Frosted glass over a live aurora", cost: 1000, primary: "#38bdf8", bg: "#F4F7FB", dark: "#060a14", card: "rgba(255,255,255,0.07)", line: "rgba(255,255,255,0.16)" },
  { id: "midnight-black", name: "Midnight Black", desc: "The landing page look", cost: 200, primary: "#22d3ee", bg: "#F4F7FB", dark: "#030303", card: "#111111", line: "#27272a" },
  { id: "royal-amethyst", name: "Royal Amethyst", desc: "Deep violet, regal glow", cost: 450, primary: "#a855f7", bg: "#faf5ff", dark: "#0b0613", card: "#160d24", line: "#2c1b45" },
  { id: "emerald-noir", name: "Emerald Noir", desc: "Dark forest, mint accents", cost: 550, primary: "#34d399", bg: "#f0fdf4", dark: "#04120c", card: "#0b2015", line: "#16382a" },
  { id: "crimson-velvet", name: "Crimson Velvet", desc: "Moody red, velvet depth", cost: 600, primary: "#fb7185", bg: "#fff1f2", dark: "#140408", card: "#220a10", line: "#3d1520" },
  { id: "aurum-gold", name: "Aurum Gold", desc: "Black and gold, pure luxury", cost: 700, primary: "#f59e0b", bg: "#fffbeb", dark: "#100c02", card: "#1d1607", line: "#38290e" },
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
  const { theme, toggleTheme, font, setFont, applyColors, resetColors, customPrimary, setGlassTheme, glassEnabled } = useTheme();
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

  // Spendable balance + everything already purchased (owned forever).
  const [coins, setCoins] = useState(null);
  const [unlockedItems, setUnlockedItems] = useState([]);
  const [buying, setBuying] = useState(null); // itemId of in-flight purchase
  useEffect(() => {
    api.get("/referrals/me")
      .then((res) => {
        setCoins(res.data?.coins ?? 0);
        setUnlockedItems(res.data?.unlockedItems ?? []);
      })
      .catch(() => setCoins(0));
  }, []);

  // Revoke a glass theme that was switched on during testing (or by editing
  // localStorage) but was never actually purchased.
  useEffect(() => {
    if (coins === null || GLASS_TEST_MODE) return;
    if (glassEnabled && !unlockedItems.includes("theme:glass")) {
      setGlassTheme(false);
    }
  }, [coins, unlockedItems, glassEnabled, setGlassTheme]);

  const premiumStaged = PREMIUM_THEMES.find((t) => t.name === preset?.name) || null;
  const ownsTheme = (t) =>
    unlockedItems.includes(`theme:${t.id}`) || (t.glass && GLASS_TEST_MODE);
  const ownsFont = (f) => f.cost === 0 || unlockedItems.includes(`font:${f.id}`);

  // Purchase flow: a locked item opens the confirm modal; confirming spends
  // the coins. pendingPurchase = { itemId, name, cost, swatch?, fontFamily?, onOwned? }.
  const [pendingPurchase, setPendingPurchase] = useState(null);

  const requestPurchase = (purchase) => {
    if (buying) return;
    const balance = coins ?? 0;
    if (balance < purchase.cost) {
      toast.error(`Not enough coins - you need ${purchase.cost - balance} more to unlock ${purchase.name}.`);
      return;
    }
    setPendingPurchase(purchase);
  };

  const confirmPurchase = async () => {
    if (!pendingPurchase || buying) return;
    const { itemId, name, cost, onOwned } = pendingPurchase;
    setBuying(itemId);
    try {
      const res = await api.post("/referrals/purchase", { itemId });
      const newBalance = res.data?.coins ?? (coins ?? 0) - cost;
      setCoins(newBalance);
      setUnlockedItems(res.data?.unlockedItems ?? [...unlockedItems, itemId]);
      // Keep the earn-chime baseline in sync so spending never re-chimes.
      localStorage.setItem("se_last_coins", String(newBalance));
      playCoinSpend();
      toast.success(`${name} unlocked! It's yours forever.`);
      setPendingPurchase(null);
      onOwned?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Purchase failed. Please try again.");
    } finally {
      setBuying(null);
    }
  };

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
    if (!ownsFont(f)) {
      requestPurchase({
        itemId: `font:${f.id}`,
        name: f.name,
        cost: f.cost,
        fontFamily: f.family,
        onOwned: () => setPendingFont(f.id),
      });
      return;
    }
    setPendingFont(f.id);
  };

  const applyAll = () => {
    // Premium themes can be previewed by anyone but applied only when owned.
    const stagedPremium = PREMIUM_THEMES.find((t) => t.name === preset?.name);
    if (stagedPremium && !ownsTheme(stagedPremium)) {
      toast.error(`Unlock ${stagedPremium.name} for ${stagedPremium.cost} coins to apply it.`);
      return;
    }
    if (stagedPremium?.glass) {
      // Aurora Glass is a CSS-class theme, not a derived color palette.
      // setGlassTheme forces dark mode itself; don't also toggleTheme here -
      // toggling would immediately switch glass back off.
      setGlassTheme(true);
      setFont(pendingFont);
    } else {
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
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4 lg:px-6">
      <div className="max-w-5xl xl:max-w-7xl mx-auto">
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

        {/* < md: single column, preview below controls.
            md+: preview docks right and stays sticky while scrolling. */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px] gap-5 xl:gap-6 items-start">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {PREMIUM_THEMES.map((t) => {
                  const owned = ownsTheme(t);
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
                      <div className="relative p-3.5" style={{ background: t.glass ? GLASS_PREVIEW_BG : t.dark }}>
                        <div className="flex items-center justify-between">
                          <span className="font-serif-premium text-white text-sm lowercase">splitease</span>
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.primary, boxShadow: `0 0 10px ${t.primary}` }} />
                        </div>
                        <div className="mt-2.5 space-y-1.5">
                          <div className="h-1.5 w-3/5 rounded bg-white/15" />
                          <div className="h-1.5 w-2/5 rounded bg-white/10" />
                        </div>
                        <div className="mt-2.5 h-5 w-16 rounded-md" style={{ backgroundColor: t.card, border: `1px solid ${t.line}` }} />
                        {!owned && (
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
                        {owned ? (
                          staged ? (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cyan-600 text-white px-2.5 py-1 text-[10px] font-bold">
                              <Check size={10} strokeWidth={3} /> Staged
                            </span>
                          ) : (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold">
                              <Check size={10} strokeWidth={3} /> Owned
                            </span>
                          )
                        ) : (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestPurchase({
                                itemId: `theme:${t.id}`,
                                name: t.name,
                                cost: t.cost,
                                swatch: { primary: t.primary, dark: t.dark, card: t.card, line: t.line },
                              });
                            }}
                            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                              buying === `theme:${t.id}`
                                ? "bg-muted text-muted-foreground"
                                : (coins ?? 0) >= t.cost
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Coins size={10} />
                            {buying === `theme:${t.id}` ? "Unlocking…" : `Unlock · ${t.cost}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Stage any premium theme to preview it live for free. Unlocking spends your coins once — after that the theme is yours forever, even if your balance drops. Earn coins via Referrals &amp; Rewards on your profile.
              </p>
            </Section>

            <Section icon={Type} title="Font">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {FONTS.map((f) => {
                  const selected = pendingFont === f.id;
                  const unlocked = ownsFont(f);
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
                        {/* Hidden again at xl - the 2-column font grid leaves no room. */}
                        <span className="hidden sm:block xl:hidden text-sm text-muted-foreground" style={{ fontFamily: f.family }}>
                          The quick brown fox
                        </span>
                        {f.cost > 0 && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            unlocked
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : buying === `font:${f.id}`
                              ? "bg-muted text-muted-foreground"
                              : (coins ?? 0) >= f.cost
                              ? "bg-amber-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {unlocked ? (
                              <><Check size={10} strokeWidth={3} /> Owned</>
                            ) : (
                              <><Coins size={10} /> {buying === `font:${f.id}` ? "Unlocking…" : `Unlock · ${f.cost}`}</>
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tap a locked font to unlock it with coins — a one-time purchase, yours forever.
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

          {/* Live preview + apply (sticky from tablet up) */}
          <div className="md:sticky md:top-24 space-y-3 min-w-0">
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

      <PurchaseModal
        item={pendingPurchase}
        balance={coins ?? 0}
        busy={!!buying}
        onConfirm={confirmPurchase}
        onCancel={() => setPendingPurchase(null)}
      />
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

      <div className="p-4" style={{ background: premium?.glass ? GLASS_PREVIEW_BG : c.bg, fontFamily, fontSize: size }}>
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
