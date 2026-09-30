"use client";

import { useState } from "react";
import { GROUP_ICON_CATEGORIES } from "@/lib/groupIcons";

/**
 * Categorized grid of selectable group icons. Controlled via `value` (an
 * icon key, or null for "no icon / use the letter avatar") and `onChange`.
 */
export default function GroupIconPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const activeLabel = hovered?.label || GROUP_ICON_CATEGORIES
    .flatMap((s) => s.icons)
    .find((i) => i.key === value)?.label;

  return (
    <div>
      <div className="h-4 mb-1.5 px-0.5 text-xs font-semibold text-primary transition-opacity">
        {activeLabel || " "}
      </div>

      <div className="max-h-56 overflow-y-auto pr-1.5 -mr-1.5 custom-scrollbar space-y-3.5">
        {GROUP_ICON_CATEGORIES.map(({ category, icons }) => (
          <div key={category}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">
              {category}
            </p>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
              {icons.map(({ key, label, Icon }) => {
                const selected = value === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange(selected ? null : key)}
                    onMouseEnter={() => setHovered({ key, label })}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ key, label })}
                    onBlur={() => setHovered(null)}
                    aria-label={label}
                    className={`group relative aspect-square rounded-xl flex items-center justify-center border transition-all duration-150 cursor-pointer ${
                      selected
                        ? "text-white border-transparent shadow-md shadow-cyan-500/25 scale-[1.06]"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                    style={
                      selected
                        ? { background: "linear-gradient(135deg, #0891B2, #0E7490)" }
                        : undefined
                    }
                  >
                    <Icon size={16} strokeWidth={selected ? 2.5 : 2} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
