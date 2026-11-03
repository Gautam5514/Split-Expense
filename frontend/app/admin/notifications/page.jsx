"use client";

import { useEffect, useState } from "react";
import { Send, CalendarClock } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, LoadingBlock, PageHeader, PrimaryButton, StatusPill, Switch, inputCls, labelCls } from "@/components/admin/AdminUI";

const CAMPAIGNS = [
  { value: "monthly", label: "New month" },
  { value: "weekend", label: "Weekend" },
  { value: "trip", label: "Trip idea" },
];
const NAME = { monthly: "New month", weekend: "Weekend", trip: "Trip idea" };
const when = (d) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Scheduled tips: what goes out next, how recent ones did, and a test send to one person.
export default function AdminNotificationsPage() {
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [campaign, setCampaign] = useState("trip");
  const [sending, setSending] = useState(false);
  const [last, setLast] = useState(null);

  useEffect(() => { adminApi.get("/admin/engagement").then(r => setStatus(r.data)).catch(() => setStatus(false)); }, []);

  const toggle = async (enabled) => {
    const prev = status;
    setStatus({ ...status, enabled });
    try { const { data } = await adminApi.patch("/admin/engagement", { enabled }); setStatus(data); toast.success(enabled ? "Tips are on" : "Tips are paused"); }
    catch { setStatus(prev); toast.error("Couldn't change it"); }
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await adminApi.post("/admin/engagement/test", { email, campaign });
      setLast(data);
      toast.success(data.devices.app + data.devices.web ? "Sent to the bell and their devices" : "Sent to the bell (no devices registered for push)");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send");
    } finally { setSending(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Engagement" title="Scheduled notifications" description="New-month reminder on the 1st, one Sunday nudge a month, and trip ideas in Nov–Dec. Sent between 9 AM and 9 PM IST, at most one a day per person." />
      {status === null ? <LoadingBlock /> : status === false ? <Card className="p-5 text-sm text-white/60">Couldn&apos;t load the schedule.</Card> : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><CalendarClock size={15} /> Coming up</p>
              <StatusPill tone={status.enabled ? "emerald" : "neutral"}>{status.enabled ? "On" : "Paused"}</StatusPill>
            </div>
            <div className="mb-4"><Switch checked={status.enabled} onChange={toggle} label="Send tips on schedule" description={status.enabled ? `At most ${status.rules.perDay} a day and ${status.rules.per30Days} a month per person. ${status.rules.holdoutPct}% are held back to measure results.` : "Paused. Nothing is sent until you turn this back on."} /></div>
            <ul className="space-y-2">
              {status.upcoming.map(s => <li key={s.key} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm"><span className="text-white/85">{NAME[s.campaign]}</span><span className="tabular-nums text-white/50">{when(s.at)}</span></li>)}
            </ul>
            {status.recent.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-white/40">Recent sends</p>
                <ul className="space-y-1.5">
                  {status.recent.map(r => <li key={r.key} className="flex justify-between text-xs text-white/60"><span>{r.key}</span><span className="tabular-nums">{r.sent} sent · {r.opened} opened · {r.holdout} held back</span></li>)}
                </ul>
              </>
            )}
          </Card>
          <Card className="p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Send size={15} /> Send a test now</p>
            <form onSubmit={send} className="space-y-4">
              <label className="block"><span className={labelCls}>User email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Message</span>
                <select value={campaign} onChange={e => setCampaign(e.target.value)} className={inputCls}>{CAMPAIGNS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              </label>
              <PrimaryButton type="submit" disabled={sending || !email}>{sending ? "Sending…" : "Send test"}</PrimaryButton>
            </form>
            {last && <div className="mt-4 rounded-lg bg-white/[0.04] p-3 text-xs leading-5 text-white/70"><p className="font-semibold text-white">{last.title}</p><p>{last.body}</p><p className="mt-1 text-white/40">Phone app: {last.devices.app} device(s) · Browser: {last.devices.web}</p></div>}
          </Card>
        </div>
      )}
    </div>
  );
}
