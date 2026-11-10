"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useTheme from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import toast from "@/lib/toast";
import PurchaseModal from "@/components/PurchaseModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { AlertCircle, Check, Loader2, Lock, Moon, Sun } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";

/* Appearance: two modes - White and Black - the same palette the mobile app
   uses, plus optional accent themes that recolour only the ink (primary)
   colour. Accent themes come from the coin store (GET /referrals/me → store)
   and are unlocked with coins or an Elite Club tier. Picking anything applies
   it straight away. */

// Where coins are earned: the Rewards block on the profile page.
const EARN_COINS_HREF = "/profile#rewards";
const DEFAULT_INK = { light: "#141414", dark: "#FFFFFF" };

const MODES = [
  {
    id: "light", label: "White", desc: "Clean and bright", Icon: Sun,
    bg: "#F9FAFB", card: "#FFFFFF", line: "#E5E7EB", ink: "#141414", text: "#11181C", sub: "#6B7280",
  },
  {
    id: "dark", label: "Black", desc: "True black, easy on the eyes", Icon: Moon,
    bg: "#000000", card: "#121214", line: "#1F1F22", ink: "#FFFFFF", text: "#FFFFFF", sub: "#A1A1AA",
  },
];

export default function ThemePage() {
  const { theme, setMode, accent, setAccent } = useTheme();
  const { token, loading: authLoading } = useAuth();

  const [store, setStore] = useState(null); // { themes } once loaded
  const [coins, setCoins] = useState(0);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [busyId, setBusyId] = useState(null); // theme id being unlocked
  const [confirmFreeId, setConfirmFreeId] = useState(null); // free pick awaiting a second click
  const [purchaseTheme, setPurchaseTheme] = useState(null); // locked theme in the confirm modal

  const loadStore = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await api.get("/referrals/me");
      setStore(res.data?.store || { themes: [] });
      setCoins(res.data?.coins ?? 0);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (token) loadStore();
  }, [token, loadStore]);

  // Keep the saved accent honest: drop it if this account can't use that theme
  // (e.g. it was saved by someone else on this browser), and pick up a colour
  // change made on the server.
  useEffect(() => {
    if (!accent || !store) return;
    const match = store.themes.find((t) => t.key === accent.key);
    if (!match?.usable) setAccent(null);
    else if (match.colors.light !== accent.light || match.colors.dark !== accent.dark) {
      setAccent({ key: match.key, ...match.colors });
    }
  }, [accent, store, setAccent]);

  const applyTheme = (t) => setAccent({ key: t.key, light: t.colors.light, dark: t.colors.dark });

  // Unlock (free pick or coins), then apply. Returns true on success.
  const unlock = async (t) => {
    setBusyId(t.id);
    try {
      const res = await api.post("/referrals/purchase", { itemId: t.id });
      if (res.data?.store) setStore(res.data.store);
      else {
        // Older response shape: mark it owned locally so it stays applied.
        setStore((prev) => prev && {
          ...prev,
          themes: prev.themes.map((x) => (x.id === t.id ? { ...x, access: "owned", price: 0, usable: true } : x)),
        });
      }
      if (typeof res.data?.coins === "number") setCoins(res.data.coins);
      applyTheme(t);
      toast.success(`${t.name} unlocked`);
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't unlock this theme. Please try again.");
      return false;
    } finally {
      setBusyId(null);
      setConfirmFreeId(null);
    }
  };

  const confirmPurchase = async () => {
    if (!purchaseTheme) return;
    await unlock(purchaseTheme);
    setPurchaseTheme(null);
  };

  const ink = accent || DEFAULT_INK;
  const themes = store?.themes || [];
  const showLoading = status === "loading" && (authLoading || !!token);

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Appearance</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose how SplitEase looks for you</p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODES.map((m) => {
            const selected = theme === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={selected}
                className={`relative rounded-2xl border-2 p-3 text-left transition cursor-pointer ${
                  selected ? "border-primary" : "border-border hover:border-foreground/30"
                }`}
              >
                {/* Mini preview of the theme */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: m.bg, border: `1px solid ${m.line}` }}>
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: m.card, border: `1px solid ${m.line}` }}>
                      <span className="w-6 h-6 rounded-md" style={{ background: ink[m.id] }} />
                      <span className="flex-1 space-y-1">
                        <span className="block h-1.5 w-2/3 rounded-full" style={{ background: m.text }} />
                        <span className="block h-1.5 w-1/3 rounded-full" style={{ background: m.sub, opacity: 0.6 }} />
                      </span>
                    </div>
                  ))}
                  <div className="h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                    style={{ background: ink[m.id], color: m.id === "dark" ? "#141414" : "#FFFFFF" }}>
                    Button
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2.5 px-1">
                  <m.Icon size={16} className="text-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.desc}</span>
                  </span>
                  {selected && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={11} className="text-primary-foreground" strokeWidth={3} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Accent themes */}
        <section className="mt-10" aria-labelledby="accent-themes-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="accent-themes-heading" className="text-lg font-extrabold text-foreground">Accent themes</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Changes the accent colour only. White and Black stay as they are.
              </p>
            </div>
            {status === "ready" && (
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground tabular-nums">
                <CoinIcon size={15} />
                {coins} {coins === 1 ? "coin" : "coins"}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AccentRow
              name="Default"
              note="Classic black and white ink"
              colors={DEFAULT_INK}
              selected={!accent}
              onSelect={() => setAccent(null)}
            />

            {showLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[66px] rounded-2xl" />)}

            {status === "ready" && themes.map((t) => {
              const selected = accent?.key === t.key;
              const busy = busyId === t.id;

              if (t.usable) {
                return (
                  <AccentRow
                    key={t.id}
                    name={t.name}
                    note={t.access === "tier" ? "Included with your tier" : "Unlocked"}
                    colors={t.colors}
                    selected={selected}
                    onSelect={() => applyTheme(t)}
                  />
                );
              }

              if (t.access === "free-pick") {
                const confirming = confirmFreeId === t.id;
                return (
                  <AccentRow
                    key={t.id}
                    name={t.name}
                    note={confirming ? "Use your one free theme on this?" : "Free with Bronze"}
                    colors={t.colors}
                    onSelect={confirming || busyId ? undefined : () => setConfirmFreeId(t.id)}
                    action={confirming ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => unlock(t)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer disabled:opacity-60"
                        >
                          {busy && <Loader2 size={11} className="animate-spin" />}
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmFreeId(null)}
                          disabled={busy}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground cursor-pointer disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Free
                      </span>
                    )}
                  />
                );
              }

              // Locked: costs coins.
              const shortBy = Math.max(t.price - coins, 0);
              return (
                <AccentRow
                  key={t.id}
                  name={t.name}
                  note={shortBy > 0
                    ? `${t.price} coins · ${shortBy} more needed`
                    : `${t.price} coins`}
                  colors={t.colors}
                  action={shortBy > 0 ? (
                    <Link
                      href={EARN_COINS_HREF}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                    >
                      Earn coins
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPurchaseTheme(t)}
                      disabled={!!busyId}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer disabled:opacity-60"
                    >
                      <Lock size={11} /> Unlock
                    </button>
                  )}
                />
              );
            })}
          </div>

          {status === "error" && (
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3">
              <AlertCircle size={15} className="shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                Couldn&apos;t load accent themes. Your current look is unchanged.
              </p>
              <button
                type="button"
                onClick={loadStore}
                className="shrink-0 text-xs font-semibold text-foreground hover:underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Themes unlock with coins or your Elite Club tier.{" "}
              <Link href={EARN_COINS_HREF} className="font-semibold text-foreground hover:underline">
                Earn coins by inviting friends
              </Link>
            </p>
          )}
        </section>
      </div>

      <PurchaseModal
        item={purchaseTheme && {
          name: purchaseTheme.name,
          cost: purchaseTheme.price,
          swatch: { dark: "#000000", primary: purchaseTheme.colors.dark, card: "#121214", line: "#1F1F22" },
        }}
        balance={coins}
        busy={!!busyId}
        onConfirm={confirmPurchase}
        onCancel={() => setPurchaseTheme(null)}
      />
    </div>
  );
}

/* One accent option. With `onSelect` the whole row is a button (apply / pick);
   without it the row is static and `action` carries the control (Unlock, Earn
   coins), so buttons and links are never nested inside a button. */
function AccentRow({ name, note, colors, selected = false, onSelect, action }) {
  const body = (
    <>
      {/* Swatch: the colour in White mode (left) and Black mode (right) */}
      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border">
        <span className="h-full w-1/2" style={{ background: colors.light }} />
        <span className="h-full w-1/2" style={{ background: colors.dark }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{name}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
    </>
  );
  const frame = `flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
    selected ? "border-primary" : "border-border"
  }`;

  if (onSelect && !action) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`${frame} cursor-pointer ${selected ? "" : "hover:border-foreground/30"}`}
      >
        {body}
        {selected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
            <Check size={11} className="text-primary-foreground" strokeWidth={3} />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={frame}>
      {onSelect ? (
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      <span className="shrink-0">{action}</span>
    </div>
  );
}
