"use client";

import { useState } from "react";

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export default function BillCalculator() {
  const [total, setTotal] = useState("3000");
  const [people, setPeople] = useState("4");
  const [tip, setTip] = useState("10");
  const [tax, setTax] = useState("0");

  const t = num(total);
  const p = Math.max(1, Math.floor(num(people)) || 1);
  const grand = t + (t * num(tip)) / 100 + (t * num(tax)) / 100;
  const each = grand / p;
  const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const field =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-white outline-none transition focus:border-white/30";

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-5 sm:p-7" id="calculator">
      <h2 className="text-lg font-bold text-white">Free split bill calculator</h2>
      <p className="mt-1 text-sm text-white/50">No sign-up. Change a value and the share updates.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Bill total", total, setTotal],
          ["People", people, setPeople],
          ["Tip %", tip, setTip],
          ["Tax %", tax, setTax],
        ].map(([label, val, set]) => (
          <label key={label} className="text-xs font-semibold text-white/60">
            {label}
            <input inputMode="decimal" value={val} onChange={(e) => set(e.target.value)} className={`${field} mt-1.5`} />
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/50">Total with tip and tax</div>
          <div className="mt-1 text-xl font-bold text-white">{fmt(grand)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="text-xs text-white/50">Each person pays</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{fmt(each)}</div>
        </div>
      </div>
    </div>
  );
}
