"use client";

import useTheme from "@/hooks/useTheme";
import { Check, Moon, Sun } from "lucide-react";

/* Appearance: just two themes - White and Black - the same palette the
   mobile app uses. Picking one applies it straight away. */

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
  const { theme, setMode } = useTheme();

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
                      <span className="w-6 h-6 rounded-md" style={{ background: m.ink }} />
                      <span className="flex-1 space-y-1">
                        <span className="block h-1.5 w-2/3 rounded-full" style={{ background: m.text }} />
                        <span className="block h-1.5 w-1/3 rounded-full" style={{ background: m.sub, opacity: 0.6 }} />
                      </span>
                    </div>
                  ))}
                  <div className="h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                    style={{ background: m.ink, color: m.id === "dark" ? "#141414" : "#FFFFFF" }}>
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
      </div>
    </div>
  );
}
