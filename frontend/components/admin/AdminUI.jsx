"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { animate } from "framer-motion";

// Small shared design-system primitives for the admin panel, so every page
// (messages, blog, careers, dashboard) reads as one consistent product
// instead of independently-styled screens.

export function PageHeader({ eyebrow, title, description, action, className = "mb-7" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-400/70">{eyebrow}</p>
        )}
        <h1 className="text-[26px] font-extrabold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-white/45">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  const Comp = props.href ? Link : "button";
  return (
    <Comp
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-500 px-4 py-2.5 text-sm font-bold text-[#04222A] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_20px_-8px_rgba(34,211,238,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 ${className}`}
    >
      {children}
    </Comp>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  const Comp = props.href ? Link : "button";
  return (
    <Comp
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-white/80 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </Comp>
  );
}

export function IconButton({ icon: Icon, className = "", tone = "default", size = 15, ...props }) {
  const Comp = props.href ? Link : "button";
  const toneCls =
    tone === "danger"
      ? "text-white/40 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
      : "text-white/50 hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-white";
  return (
    <Comp
      {...props}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneCls} ${className}`}
    >
      <Icon size={size} />
    </Comp>
  );
}

const TONE_STYLES = {
  cyan: "bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/25",
  amber: "bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/25",
  emerald: "bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/25",
  red: "bg-red-400/10 text-red-300 ring-1 ring-inset ring-red-400/25",
  violet: "bg-violet-400/10 text-violet-300 ring-1 ring-inset ring-violet-400/25",
  neutral: "bg-white/[0.06] text-white/45 ring-1 ring-inset ring-white/[0.08]",
};

export function StatusPill({ tone = "neutral", children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${TONE_STYLES[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-16 text-center">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <Icon size={20} className="text-white/30" />
        </span>
      )}
      <p className="text-sm font-bold text-white/70">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-white/35">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
      ))}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded border border-white/[0.08] bg-[#111114] ${className}`}>
      {children}
    </div>
  );
}

export function FormSection({ icon: Icon, title, description, children }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/20">
            <Icon size={15} />
          </span>
        )}
        <div>
          <h2 className="text-sm font-extrabold text-white">{title}</h2>
          {description && <p className="text-xs text-white/40">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export function Switch({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-[13px] font-bold text-white">{label}</span>
        {description && <span className="block text-xs text-white/40">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-gradient-to-r from-cyan-300 to-cyan-500" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function AnimatedNumber({ value, className = "" }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

const SEGMENT_TONES = {
  cyan: "bg-cyan-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  red: "bg-red-400",
  violet: "bg-violet-400",
  neutral: "bg-white/15",
};

// A single horizontal bar split into proportional, colored segments - used to
// show a status breakdown (messages by status, applications by status) without
// pulling in a full charting library for what is ultimately a few numbers.
export function SegmentedBar({ segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
        {total === 0 ? (
          <div className="h-full w-full bg-white/[0.06]" />
        ) : (
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                className={`h-full ${SEGMENT_TONES[s.tone]} first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${(s.value / total) * 100}%` }}
              />
            ))
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/45">
            <span className={`h-1.5 w-1.5 rounded-full ${SEGMENT_TONES[s.tone]}`} />
            {s.label}
            <span className="font-extrabold text-white/80">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const inputCls =
  "mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/15";
export const labelCls = "text-[11px] font-bold uppercase tracking-wide text-white/40";
