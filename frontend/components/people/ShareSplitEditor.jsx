"use client";

import { Minus, Plus } from "lucide-react";

export const MAX_SHARES = 20;
const PALETTE = ["#0891B2", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#2563EB"];
const tint = (name = "") => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

/**
 * "By shares" editor for the create-group flow: one row per person with a
 * stepper. `shares` is { [rowKey]: number } (missing = 1); the creator's row
 * key is "me". Invite-by-email rows can't be weighted yet (no account), so they
 * show as "1 share" until they join.
 */
export default function ShareSplitEditor({ people, shares, onChange }) {
  const rows = [{ key: "me", name: "You", sub: "Group creator", locked: false }, ...people.map((p) => ({
    key: p.key, name: p.name, sub: p.kind === "email" ? "Gets 1 share once they join" : !p.direct ? "Gets 1 share once they accept" : p.sub, locked: p.kind === "email" || !p.direct,
  }))];
  const get = (k) => shares[k] ?? 1;
  const total = rows.reduce((a, r) => a + (r.locked ? 1 : get(r.key)), 0);
  const set = (k, v) => onChange({ ...shares, [k]: Math.min(MAX_SHARES, Math.max(1, v)) });

  return (
    <div className="rounded-2xl bg-muted/50 p-3 space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-xs font-semibold text-foreground">Set shares for each person</p>
        <span className="text-[11px] text-muted-foreground">{total} {total === 1 ? "share" : "shares"} total</span>
      </div>
      {rows.map((r) => {
        const n = r.locked ? 1 : get(r.key);
        const pct = Math.round((n / total) * 100);
        return (
          <div key={r.key} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
              style={{ background: tint(r.name) }}>{(r.name || "?").charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{r.locked ? r.sub : `${pct}% of every bill`}</p>
            </div>
            {!r.locked && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" aria-label={`Fewer shares for ${r.name}`} disabled={n <= 1} onClick={() => set(r.key, n - 1)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center disabled:opacity-40 cursor-pointer"><Minus size={14} /></button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{n}</span>
                <button type="button" aria-label={`More shares for ${r.name}`} disabled={n >= MAX_SHARES} onClick={() => set(r.key, n + 1)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center disabled:opacity-40 cursor-pointer"><Plus size={14} /></button>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground px-1 pt-1">Example: 2 shares pays double of 1 share. You can change this later in Group settings.</p>
    </div>
  );
}
