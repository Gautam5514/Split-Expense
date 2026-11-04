"use client";

import { useEffect, useState } from "react";
import { Send, CalendarClock, Megaphone, Sparkles, CalendarCheck, ListChecks } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import toast from "@/lib/toast";
import { Card, LoadingBlock, PageHeader, PrimaryButton, SecondaryButton, StatusPill, Switch, inputCls, labelCls } from "@/components/admin/AdminUI";

const TIER = { festival: "Festival", personal: "Personal", generic: "Evergreen", broadcast: "Broadcast" };
const TIER_TONE = { festival: "amber", personal: "emerald", generic: "neutral", broadcast: "violet" };
const when = (d) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
// Local datetime-local value -> ISO, so "19:00" typed here means 19:00 on the admin's clock.
const toIso = (v) => (v ? new Date(v).toISOString() : undefined);

/*
 * Scheduled notifications: every campaign (festivals, personal nudges, evergreen tips), what
 * goes out next, festival dates that still need confirming, how recent sends did, a test
 * send to one person, and one-off broadcasts.
 */
export default function AdminNotificationsPage() {
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [campaign, setCampaign] = useState("festival");
  const [festival, setFestival] = useState("diwali");
  const [sending, setSending] = useState(false);
  const [last, setLast] = useState(null);
  const [dates, setDates] = useState({});
  const [bc, setBc] = useState({ title: "", body: "", cta: "Open SplitEase", link: "/dashboard", prompt: "", at: "", audience: "everyone", ignoreCaps: false });
  const [posting, setPosting] = useState(false);

  const load = () => adminApi.get("/admin/engagement").then(r => setStatus(r.data)).catch(() => setStatus(false));
  useEffect(() => { load(); }, []);

  const patch = async (body, okMsg) => {
    try { const { data } = await adminApi.patch("/admin/engagement", body); setStatus(data); if (okMsg) toast.success(okMsg); }
    catch (err) { toast.error(err?.response?.data?.message || "Couldn't change it"); load(); }
  };
  const toggleAll = (enabled) => { setStatus({ ...status, enabled }); patch({ enabled }, enabled ? "Notifications are on" : "Notifications are paused"); };
  const toggleCampaign = (id, enabled) => {
    setStatus({ ...status, campaigns: status.campaigns.map(c => (c.id === id ? { ...c, enabled } : c)) });
    patch({ campaign: id, enabled });
  };
  const confirmDate = (u) => {
    const d = (dates[`${u.id}:${u.year}`] || u.estimate).slice(5);
    patch({ festival: u.id, year: u.year, date: d }, `${u.name} ${u.year} confirmed`);
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await adminApi.post("/admin/engagement/test", { email, campaign, festival });
      setLast(data);
      toast.success(data.devices.app + data.devices.web ? "Sent to the bell and their devices" : "Sent to the bell (no devices registered for push)");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send");
    } finally { setSending(false); }
  };

  const broadcast = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await adminApi.post("/admin/engagement/broadcast", { ...bc, at: toIso(bc.at) });
      toast.success(bc.at ? "Scheduled" : "Sending within the next few minutes");
      setBc({ ...bc, title: "", body: "", prompt: "", at: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't schedule it");
    } finally { setPosting(false); }
  };
  const cancel = async (id) => {
    try { await adminApi.delete(`/admin/engagement/broadcast/${id}`); toast.success("Cancelled"); load(); }
    catch { toast.error("Couldn't cancel"); }
  };

  const festivals = status?.festivals || [];
  const testFestivals = festivals.filter((f, i, a) => a.findIndex(x => x.id === f.id) === i);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Engagement" title="Notifications" description="Festival greetings, personal nudges built from each person's own numbers, evergreen tips and one-off broadcasts. The same message lands in the bell on web and in the app, and as a push. Sent between 9 AM and 9 PM IST, at most one a day per person." />
      {status === null ? <LoadingBlock /> : status === false ? <Card className="p-5 text-sm text-white/60">Couldn&apos;t load the schedule.</Card> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><ListChecks size={15} /> Campaigns</p>
              <StatusPill tone={status.enabled ? "emerald" : "neutral"}>{status.enabled ? "On" : "Paused"}</StatusPill>
            </div>
            <div className="mb-4"><Switch checked={status.enabled} onChange={toggleAll} label="Send on schedule" description={status.enabled ? `Per person: ${status.rules.perDay} a day, ${status.rules.per7Days} a week, ${status.rules.per30Days} a month. ${status.rules.holdoutPct}% held back to measure results. Evergreen tips pause for anyone who ignored ${status.rules.fatigueAfter} in a row.` : "Paused. Nothing is sent until you turn this back on."} /></div>
            <ul className="divide-y divide-white/5">
              {status.campaigns.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-white/85">{c.name}<StatusPill tone={TIER_TONE[c.tier]}>{TIER[c.tier]}</StatusPill></span>
                  <Switch checked={c.enabled} onChange={(v) => toggleCampaign(c.id, v)} />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><CalendarClock size={15} /> Coming up</p>
            <ul className="space-y-2">
              {status.upcoming.map(s => (
                <li key={s.key} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-white/85"><span className="truncate">{s.label}</span>{s.regional && <StatusPill tone="neutral">regional</StatusPill>}<StatusPill tone={TIER_TONE[s.tier]}>{TIER[s.tier]}</StatusPill></span>
                  <span className="shrink-0 tabular-nums text-white/50">{when(s.at)}</span>
                </li>
              ))}
            </ul>
            {status.recent.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-white/40">Recent sends</p>
                <ul className="space-y-1.5">
                  {status.recent.map(r => <li key={r.key} className="flex justify-between gap-2 text-xs text-white/60"><span className="truncate">{r.key}</span><span className="shrink-0 tabular-nums">{r.sent} sent · {r.opened} opened · {r.capped} capped · {r.holdout} held</span></li>)}
                </ul>
              </>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-white"><CalendarCheck size={15} /> Festival calendar</p>
            <p className="mb-4 text-xs text-white/50">Dates are loaded through {status.calendarUntil}. Lunar and moon-sighting dates marked &quot;confirm&quot; are not sent until you confirm them here.</p>
            {status.unconfirmed.length > 0 && (
              <ul className="mb-4 space-y-2">
                {status.unconfirmed.map(u => (
                  <li key={`${u.id}:${u.year}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-sm">
                    <span className="text-white/85">{u.name} {u.year}</span>
                    <span className="flex items-center gap-2">
                      <input type="date" value={dates[`${u.id}:${u.year}`] || u.estimate} onChange={e => setDates({ ...dates, [`${u.id}:${u.year}`]: e.target.value })} className={`${inputCls} !w-auto !py-1`} />
                      <SecondaryButton type="button" onClick={() => confirmDate(u)}>Confirm</SecondaryButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {festivals.map(f => (
                <li key={`${f.id}:${f.year}`} className="flex items-center justify-between gap-2 text-xs text-white/70">
                  <span className="truncate">{f.name}{f.regional ? " · regional" : ""}</span>
                  <span className="shrink-0 tabular-nums text-white/50">{day(f.date)}{f.approx ? " · confirm" : ""}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Send size={15} /> Send a test now</p>
            <form onSubmit={send} className="space-y-4">
              <label className="block"><span className={labelCls}>User email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Message</span>
                <select value={campaign} onChange={e => setCampaign(e.target.value)} className={inputCls}>{status.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </label>
              {campaign === "festival" && (
                <label className="block"><span className={labelCls}>Festival</span>
                  <select value={festival} onChange={e => setFestival(e.target.value)} className={inputCls}>{testFestivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                </label>
              )}
              <PrimaryButton type="submit" disabled={sending || !email}>{sending ? "Sending…" : "Send test"}</PrimaryButton>
            </form>
            {last && <div className="mt-4 rounded-lg bg-white/[0.04] p-3 text-xs leading-5 text-white/70"><p className="font-semibold text-white">{last.title}</p><p>{last.body}</p><p className="mt-1 text-white/40">Phone app: {last.devices.app} device(s) · Browser: {last.devices.web}</p></div>}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-white"><Megaphone size={15} /> Broadcast</p>
            <p className="mb-4 text-xs text-white/50">A one-off message to everyone (or only active / inactive people). Goes to the bell on web and app plus push. Write <code className="rounded bg-white/10 px-1">{"{name}"}</code> for the first name. Quiet hours still apply; it is claimed per person, so a restart never sends it twice.</p>
            <form onSubmit={broadcast} className="grid gap-4 md:grid-cols-2">
              <label className="block"><span className={labelCls}>Title (≤ 60)</span><input required maxLength={60} value={bc.title} onChange={e => setBc({ ...bc, title: e.target.value })} placeholder="New: scan a bill, split in a tap" className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Button</span><input maxLength={24} value={bc.cta} onChange={e => setBc({ ...bc, cta: e.target.value })} className={inputCls} /></label>
              <label className="block md:col-span-2"><span className={labelCls}>Body (≤ 160)</span><textarea required maxLength={160} rows={2} value={bc.body} onChange={e => setBc({ ...bc, body: e.target.value })} placeholder="{name}, photograph any receipt and SplitEase reads the items for you. Try it on tonight's dinner." className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Opens (web path)</span><input value={bc.link} onChange={e => setBc({ ...bc, link: e.target.value })} className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Autopilot draft (optional)</span><input maxLength={200} value={bc.prompt} onChange={e => setBc({ ...bc, prompt: e.target.value })} placeholder="Dinner paid by me, split equally" className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Send at (blank = now)</span><input type="datetime-local" value={bc.at} onChange={e => setBc({ ...bc, at: e.target.value })} className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Audience</span>
                <select value={bc.audience} onChange={e => setBc({ ...bc, audience: e.target.value })} className={inputCls}>
                  <option value="everyone">Everyone</option><option value="active">Active in the last 30 days</option><option value="inactive">Away for 30+ days</option>
                </select>
              </label>
              <div className="md:col-span-2"><Switch checked={bc.ignoreCaps} onChange={(v) => setBc({ ...bc, ignoreCaps: v })} label="Send even to people who already had a tip today" description="Use for something important (an outage note, a launch). Off: the usual one-a-day rule applies." /></div>
              <div className="md:col-span-2"><PrimaryButton type="submit" disabled={posting || !bc.title || !bc.body}>{posting ? "Scheduling…" : bc.at ? "Schedule broadcast" : "Send broadcast now"}</PrimaryButton></div>
            </form>
            {status.broadcasts.length > 0 && (
              <ul className="mt-5 space-y-2">
                {status.broadcasts.map(b => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium text-white/90">{b.title}</span><span className="block truncate text-xs text-white/50">{b.body}</span></span>
                    <span className="flex items-center gap-2 text-xs text-white/60"><Sparkles size={12} />{when(b.at)} · {b.audience}{b.stats?.sent != null ? ` · ${b.stats.sent} sent` : ""}<StatusPill tone={b.status === "done" ? "emerald" : b.status === "cancelled" ? "neutral" : "amber"}>{b.status}</StatusPill>
                      {["scheduled", "sending"].includes(b.status) && <SecondaryButton type="button" onClick={() => cancel(b.id)}>Cancel</SecondaryButton>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
