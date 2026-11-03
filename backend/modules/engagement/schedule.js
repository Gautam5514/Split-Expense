// When each engagement campaign goes out. Pure functions of the clock, all in IST.
// India is one timezone (UTC+5:30, no daylight saving), so a fixed offset is exact.
const IST_MS = 330 * 60_000;

export const istParts = (date) => {
  const d = new Date(date.getTime() + IST_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
};
export const istTime = (year, month, day, hour, minute = 0) => new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_MS);
export const istDayKey = (date) => { const p = istParts(date); return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`; };
const weekdayOf = (year, month, day) => new Date(Date.UTC(year, month - 1, day)).getUTCDay();

// Each slot is sent inside a daytime window and never after it, so a server that was
// down catches up the same day but never pings anyone late at night (quiet hours 21:00–09:00).
const WINDOW = { monthly: 6 * 60, weekend: 5 * 60, trip: 90 };
// Trip nudges: early to mid season, before the Christmas booking peak. Extra days are
// used only when RULES.tripPerMonth asks for more (max 3 a month).
const TRIP_DAYS = { 11: [6, 20, 13], 12: [10, 19, 15] };

// The weekend nudge: the first Sunday that isn't the 1st (the 1st already has the monthly one).
export function weekendDay(year, month) {
  for (let day = 2; day <= 8; day++) if (weekdayOf(year, month, day) === 0) return day;
  return 8;
}

export function slotsForMonth(year, month, { tripPerMonth = 2 } = {}) {
  const mm = String(month).padStart(2, "0");
  const period = `${year}-${mm}`;
  const sunday = weekendDay(year, month);
  const slots = [
    { campaign: "monthly", key: `monthly:${period}`, day: 1, hour: 10, minute: 0 },
    { campaign: "weekend", key: `weekend:${period}`, day: sunday, hour: 12, minute: 30 },
  ];
  const n = Math.max(0, Math.min(3, tripPerMonth));
  (TRIP_DAYS[month] || []).slice(0, n).sort((a, b) => a - b).forEach((day, i) => {
    // Never two campaigns on one day.
    while (day === 1 || day === sunday) day++;
    slots.push({ campaign: "trip", key: `trip:${period}:${i + 1}`, day, hour: 19, minute: 30, step: i + 1 + (month === 12 ? n : 0) });
  });
  return slots.map(s => {
    const at = istTime(year, month, s.day, s.hour, s.minute);
    return { ...s, period, at, until: new Date(at.getTime() + WINDOW[s.campaign] * 60_000) };
  });
}

// Slots whose send window is open right now.
export function dueSlots(now = new Date(), opts = {}) {
  const { year, month } = istParts(now);
  return slotsForMonth(year, month, opts).filter(s => s.at <= now && now < s.until);
}

// The next few sends, for the admin preview and logs.
export function upcomingSlots(now = new Date(), count = 6, opts = {}) {
  const out = [];
  let { year, month } = istParts(now);
  for (let i = 0; i < 14 && out.length < count; i++) {
    out.push(...slotsForMonth(year, month, opts).filter(s => s.until > now));
    month++; if (month > 12) { month = 1; year++; }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, count);
}
