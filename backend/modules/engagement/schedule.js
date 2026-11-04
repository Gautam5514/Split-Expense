// When each engagement campaign goes out. Pure functions of the clock, all in IST.
// India is one timezone (UTC+5:30, no daylight saving), so a fixed offset is exact.
import { festivalsOfYear } from "./festivals.js";
import { RULES, tierOf } from "./config.js";

const IST_MS = 330 * 60_000;

export const istParts = (date) => {
  const d = new Date(date.getTime() + IST_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
};
export const istTime = (year, month, day, hour, minute = 0) => new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_MS);
export const istDayKey = (date) => { const p = istParts(date); return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`; };
const weekdayOf = (year, month, day) => new Date(Date.UTC(year, month - 1, day)).getUTCDay();
const daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const pad = (n) => String(n).padStart(2, "0");

// Each slot is sent inside a daytime window and never after it, so a server that was
// down catches up the same day but never pings anyone late at night (quiet hours 21:00–09:00).
const WINDOW = { monthly: 6 * 60, weekend: 5 * 60, trip: 90, longweekend: 120, recap: 3 * 60, settle: 2 * 60, winback: 3 * 60, onboard: 3 * 60 };
// Trip nudges: early to mid season, before the Christmas booking peak. Extra days are
// used only when RULES.tripPerMonth asks for more (max 3 a month).
const TRIP_DAYS = { 11: [6, 20, 13], 12: [10, 19, 15] };
// Personal nudges, by weekday (0 = Sunday). Onboarding runs daily: it only reaches people
// who signed up a few days ago and still have no expense, so it is never a broadcast.
const WEEKLY = [
  { campaign: "recap", weekday: 1, hour: 9, minute: 30 },
  { campaign: "settle", weekday: 3, hour: 18, minute: 30 },
  { campaign: "winback", weekday: 4, hour: 12, minute: 0 },
];

// The weekend nudge: the first Sunday that isn't the 1st (the 1st already has the monthly one).
export function weekendDay(year, month) {
  for (let day = 2; day <= 8; day++) if (weekdayOf(year, month, day) === 0) return day;
  return 8;
}

/*
 * Everything scheduled in one month, in this order of precedence:
 *  1. festivals (dated moments; a greeting a day late is worse than none)
 *  2. long-weekend nudges, the Wednesday before a holiday that touches a weekend
 *  3. the evergreen nudges (new month, weekend, trip ideas), moved to the next free day
 *     when a festival takes theirs, and dropped when the week is already full
 *  4. personal nudges (recap, settle-up, win-back, onboarding) on their weekday, skipped
 *     on festival days
 * No two broadcast-style campaigns share a day, and no 7-day window holds more than
 * RULES.per7Days of them, so the per-person caps are rarely what stops a message.
 */
export function slotsForMonth(year, month, opts = {}) {
  const { tripPerMonth = RULES.tripPerMonth, per7Days = RULES.per7Days, overrides = {}, disabled = [] } = opts;
  const period = `${year}-${pad(month)}`;
  const last = daysIn(year, month);
  const slots = [];
  const taken = new Map(); // day -> slot (broadcast-style campaigns only)
  const place = (slot) => { slots.push(slot); if (tierOf(slot.campaign) !== "personal") taken.set(slot.day, slot); };
  const countAround = (day) => { // most slots in any 7-day window that contains `day`
    let worst = 0;
    for (let start = day - 6; start <= day; start++) {
      let n = 0;
      for (let d = start; d < start + 7; d++) if (taken.has(d)) n++;
      worst = Math.max(worst, n);
    }
    return worst;
  };
  const fits = (day) => day >= 1 && day <= last && !taken.has(day) && countAround(day) < per7Days;
  // The next day from `day` that fits, at most a few days later; null means "skip this time".
  const nextFree = (day, reach = 4) => { for (let d = day; d <= day + reach; d++) if (fits(d)) return d; return null; };

  // 1. Festivals
  const festivals = festivalsOfYear(year, overrides).filter(f => f.month === month && !f.approx && !disabled.includes("festival"));
  for (const f of festivals) {
    if (f.eve) {
      const eveDay = f.day - 1; // eves in the previous month are rare (Diwali eve, Holi eve never are) and skipped
      if (eveDay >= 1 && !taken.has(eveDay)) place({ campaign: "festival", key: `festival:${f.id}-eve:${year}`, day: eveDay, hour: f.eve.hour, minute: f.eve.minute, window: f.eve.window, festival: f, eve: true, label: f.eve.name });
    }
    if (!taken.has(f.day)) place({ campaign: "festival", key: `festival:${f.id}:${year}`, day: f.day, hour: f.time.hour, minute: f.time.minute, window: f.time.window, festival: f, label: f.name });
  }
  // 2. Long weekends: a holiday on Fri/Mon makes a 3-day weekend, Thu/Tue a 4-day one with a leave.
  if (!disabled.includes("longweekend")) for (const f of festivals.filter(x => x.holiday)) {
    const wd = weekdayOf(year, month, f.day);
    const kind = { 5: "fri", 1: "mon", 4: "thu", 2: "tue" }[wd];
    if (!kind) continue;
    const wednesday = f.day - ((wd - 3 + 7) % 7); // the Wednesday before the weekend in question
    const day = wednesday >= 1 && wednesday < f.day ? nextFree(wednesday, Math.max(0, f.day - 2 - wednesday)) : null;
    if (day) place({ campaign: "longweekend", key: `longweekend:${f.id}:${year}`, day, hour: 19, minute: 0, window: WINDOW.longweekend, festival: f, kind, label: `Long weekend (${f.name})` });
  }
  // 3. Evergreen nudges
  const monthlyDay = disabled.includes("monthly") ? null : nextFree(1, 2);
  if (monthlyDay) place({ campaign: "monthly", key: `monthly:${period}`, day: monthlyDay, hour: 10, minute: 0, window: WINDOW.monthly, label: "New month" });
  const sunday = weekendDay(year, month);
  // A weekend nudge only makes sense on a Sunday: if a festival takes the first one, try the next.
  const weekendSlotDay = disabled.includes("weekend") ? null : [sunday, sunday + 7, sunday + 14].find(fits) || null;
  if (weekendSlotDay) place({ campaign: "weekend", key: `weekend:${period}`, day: weekendSlotDay, hour: 12, minute: 30, window: WINDOW.weekend, label: "Weekend" });
  const n = disabled.includes("trip") ? 0 : Math.max(0, Math.min(3, tripPerMonth));
  (TRIP_DAYS[month] || []).slice(0, n).sort((a, b) => a - b).forEach((want, i) => {
    const day = nextFree(want, 5);
    if (day) place({ campaign: "trip", key: `trip:${period}:${i + 1}`, day, hour: 19, minute: 30, window: WINDOW.trip, step: i + 1 + (month === 12 ? n : 0), label: "Trip idea" });
  });
  // 4. Personal nudges: never on a festival day (festival first), otherwise every week / every day.
  const festivalDays = new Set(slots.filter(s => s.campaign === "festival").map(s => s.day));
  for (let day = 1; day <= last; day++) {
    if (festivalDays.has(day)) continue;
    const date = `${period}-${pad(day)}`;
    const wd = weekdayOf(year, month, day);
    for (const w of WEEKLY) if (w.weekday === wd && !disabled.includes(w.campaign)) place({ campaign: w.campaign, key: `${w.campaign}:${date}`, day, hour: w.hour, minute: w.minute, window: WINDOW[w.campaign], label: undefined });
    if (!disabled.includes("onboard")) place({ campaign: "onboard", key: `onboard:${date}`, day, hour: 11, minute: 0, window: WINDOW.onboard });
  }
  return slots.map(s => {
    const at = istTime(year, month, s.day, s.hour, s.minute);
    return { ...s, period, at, until: new Date(at.getTime() + (s.window || WINDOW[s.campaign]) * 60_000), tier: tierOf(s.campaign) };
  }).sort((a, b) => a.at - b.at);
}

// Slots whose send window is open right now, festival first.
export function dueSlots(now = new Date(), opts = {}) {
  const { year, month } = istParts(now);
  const order = { festival: 0, personal: 1, generic: 2 };
  return slotsForMonth(year, month, opts).filter(s => s.at <= now && now < s.until).sort((a, b) => (order[a.tier] ?? 3) - (order[b.tier] ?? 3) || a.at - b.at);
}

// The next few sends, for the admin preview and logs. Daily onboarding is left out unless asked.
export function upcomingSlots(now = new Date(), count = 6, opts = {}) {
  const out = [];
  let { year, month } = istParts(now);
  for (let i = 0; i < 14 && out.length < count; i++) {
    out.push(...slotsForMonth(year, month, opts).filter(s => s.until > now && (opts.includeDaily || s.campaign !== "onboard")));
    month++; if (month > 12) { month = 1; year++; }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, count);
}
