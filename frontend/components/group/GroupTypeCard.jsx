"use client";

import { createElement } from "react";
import {
  CalendarDays, TrendingUp, Receipt, Repeat, UserRoundCheck,
  AlertTriangle, Settings2,
} from "lucide-react";
import { formatMoney } from "@/lib/formatCurrency";
import { groupTypeMeta } from "@/lib/groupPresets";

const fmtDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-black text-foreground mt-1 truncate">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

/**
 * The card under the group header that changes with the group type:
 *  - Trip: budget meter, day X of Y, per-day spend, who should pay next
 *  - Roommates: this month vs last month, upcoming monthly bills
 *  - Business: total, receipts missing
 *  - Other: total spend
 */
export default function GroupTypeCard({ group, summary, isCreator, onOpenSettings, onOpenBills }) {
  const type = group.groupType || "general";
  const meta = groupTypeMeta(type);
  const currency = summary?.currency || group.settings?.currency || "INR";
  const money = (v) => formatMoney(v, currency);

  if (!summary) {
    return <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-full min-h-[132px] animate-pulse" />;
  }

  const header = (
    <div className="flex items-center justify-between mb-3">
      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        {createElement(meta.Icon, { size: 13, className: "text-primary" })} {meta.label}
      </span>
      {isCreator && (
        <button type="button" onClick={onOpenSettings}
          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition cursor-pointer">
          <Settings2 size={12} /> Settings
        </button>
      )}
    </div>
  );

  let body;
  if (type === "trip") {
    const t = summary.trip || {};
    const budget = t.budget;
    const pct = budget ? Math.min(100, Math.round((summary.total / budget) * 100)) : 0;
    const over = budget && summary.total > budget;
    const timeline =
      t.status === "ongoing" && t.totalDays ? `Day ${t.dayNumber} of ${t.totalDays}`
      : t.status === "upcoming" ? `Starts ${fmtDay.format(new Date(t.startDate))}`
      : t.status === "ended" ? "Trip ended"
      : t.status === "ongoing" ? `Day ${t.dayNumber}`
      : null;
    body = (
      <>
        {budget ? (
          <div className="mb-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="text-xl font-black text-foreground">{money(summary.total)}</span> of {money(budget)}
              </p>
              <span className={`text-xs font-bold flex items-center gap-1 ${over ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                {over && <AlertTriangle size={12} />}
                {over ? `${money(summary.total - budget)} over budget` : `${money(budget - summary.total)} left`}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
              <div className={`h-full rounded-full transition-all ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <p className="text-xl font-black text-foreground">{money(summary.total)}</p>
            {isCreator && (
              <button type="button" onClick={onOpenSettings} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                Set a budget
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {timeline && <span className="flex items-center gap-1"><CalendarDays size={12} /> {timeline}</span>}
          <span className="flex items-center gap-1"><TrendingUp size={12} /> {money(t.perDay || 0)}/day</span>
          {summary.nextPayer && (
            <span className="flex items-center gap-1 text-foreground">
              <UserRoundCheck size={12} className="text-primary" /> Next to pay: <b>{summary.nextPayer.name}</b>
            </span>
          )}
        </div>
      </>
    );
  } else if (type === "roommate") {
    const month = new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date());
    const diff = summary.thisMonth - summary.lastMonth;
    const bills = summary.upcomingBills || [];
    body = (
      <>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Stat label={`${month} total`} value={money(summary.thisMonth)}
            hint={summary.lastMonth ? `${diff >= 0 ? "+" : "-"}${money(Math.abs(diff))} vs last month` : "First month"} />
          <Stat label="Your share (all time)" value={money(summary.myShare)} hint={`You paid ${money(summary.myPaid)}`} />
        </div>
        {bills.length ? (
          <button type="button" onClick={onOpenBills}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer text-left">
            <Repeat size={12} className="text-primary shrink-0" />
            <span className="truncate">
              Next: <b className="text-foreground">{bills[0].description}</b> {money(bills[0].amount)} on {fmtDay.format(new Date(bills[0].nextRunAt))}
              {bills.length > 1 && ` · +${bills.length - 1} more`}
            </span>
          </button>
        ) : (
          <button type="button" onClick={onOpenBills} className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">
            <Repeat size={12} /> Set up monthly bills (rent, WiFi…)
          </button>
        )}
      </>
    );
  } else if (type === "business") {
    body = (
      <>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Stat label="Total spend" value={money(summary.total)} hint={`${summary.count} expense${summary.count !== 1 ? "s" : ""}`} />
          <Stat label="You paid" value={money(summary.myPaid)} hint={`Your share ${money(summary.myShare)}`} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs flex items-center gap-1 ${summary.missingReceipts ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
            <Receipt size={12} />
            {summary.missingReceipts ? `${summary.missingReceipts} without receipt` : "All receipts attached"}
          </span>
        </div>
      </>
    );
  } else {
    body = (
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total spend" value={money(summary.total)} hint={`${summary.count} expense${summary.count !== 1 ? "s" : ""}`} />
        <Stat label="Your share" value={money(summary.myShare)} hint={`You paid ${money(summary.myPaid)}`} />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm h-full">
      {header}
      {body}
    </div>
  );
}
