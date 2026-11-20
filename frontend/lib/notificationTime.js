// When a notification arrived, said the way a person would:
//   in the last 24 hours  -> the time            "3:45 PM"
//   in the last 7 days    -> the day and time    "Mon, 3:45 PM"
//   older                 -> the date            "12 Nov"   ("12 Nov 2025" for another year)
// Always the real arrival time, in the device's own timezone, never "3h ago".
// THE SAME FILE LIVES IN THE WEB APP AND THE MOBILE APP (frontend/lib and
// splitApp/lib): change both together.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 24 * 60 * 60 * 1000;

const clock = (d) => {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export function notificationTime(value, now = Date.now()) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const current = new Date(now);
  const age = current.getTime() - d.getTime();
  if (age < DAY_MS) return clock(d); // includes a clock that is a little ahead of the server
  if (age < 7 * DAY_MS) return `${DAYS[d.getDay()]}, ${clock(d)}`;
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === current.getFullYear() ? date : `${date} ${d.getFullYear()}`;
}

/** The full date and time, for a tooltip or a screen reader: "Sat, 21 Nov 2026, 3:45 PM". */
export function notificationTimeFull(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${clock(d)}`;
}
