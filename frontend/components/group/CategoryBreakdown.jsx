"use client";

import { createElement, useState } from "react";
import { formatMoney } from "@/lib/formatCurrency";
import { categoryMeta } from "@/lib/groupPresets";

const COLORS = [
  "#0891b2", "#f97316", "#8b5cf6", "#10b981", "#f43f5e", "#eab308",
  "#3b82f6", "#ec4899", "#14b8a6", "#a855f7", "#84cc16", "#64748b",
];

// All categories in one stacked bar, so it stays the same size whether there
// are 2 categories or 20. Hover (or tap) a segment or a legend row to see the
// amount and share for that category.
export default function CategoryBreakdown({ rows = [], currency = "INR" }) {
  const [active, setActive] = useState(null);
  if (!rows.length) return null;

  const total = rows.reduce((a, r) => a + r.amount, 0);
  const items = rows.map((r, i) => {
    const { label, Icon } = categoryMeta(r.category);
    return {
      key: r.category, label, Icon, amount: r.amount,
      pct: total ? (r.amount / total) * 100 : 0,
      color: COLORS[i % COLORS.length],
    };
  });
  const current = items.find((i) => i.key === active);

  return (
    <div className="px-4 sm:px-6 py-4" onMouseLeave={() => setActive(null)}>
      <div className="flex h-3.5 w-full gap-0.5 rounded-full overflow-hidden bg-muted">
        {items.map((it) => (
          <button
            key={it.key} type="button"
            aria-label={`${it.label}: ${formatMoney(it.amount, currency)} (${Math.round(it.pct)}%)`}
            onMouseEnter={() => setActive(it.key)}
            onFocus={() => setActive(it.key)}
            onClick={() => setActive(active === it.key ? null : it.key)}
            className="h-full transition-all duration-150 cursor-pointer first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${it.pct}%`, minWidth: 4, background: it.color,
              opacity: active && active !== it.key ? 0.35 : 1,
            }}
          />
        ))}
      </div>

      <div className="h-6 mt-3 flex items-center justify-between text-xs">
        {current ? (
          <>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              {createElement(current.Icon, { size: 13, style: { color: current.color } })} {current.label}
            </span>
            <span className="text-muted-foreground">
              <b className="text-foreground">{formatMoney(current.amount, currency)}</b> · {Math.round(current.pct)}%
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover a segment to see the split</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((it) => (
          <span
            key={it.key}
            onMouseEnter={() => setActive(it.key)}
            className={`flex items-center gap-1.5 text-[11px] text-muted-foreground transition ${active && active !== it.key ? "opacity-40" : ""}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}
