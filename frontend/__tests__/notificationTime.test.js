import { notificationTime, notificationTimeFull } from "@/lib/notificationTime";

// Local-time dates, so the test reads the same in any timezone.
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const NOW = at(2026, 11, 21, 18, 30); // Saturday 21 Nov 2026, 6:30 PM

test("within 24 hours: just the time it arrived", () => {
  expect(notificationTime(at(2026, 11, 21, 15, 45), NOW)).toBe("3:45 PM");
  expect(notificationTime(at(2026, 11, 21, 0, 5), NOW)).toBe("12:05 AM");
  expect(notificationTime(at(2026, 11, 20, 19, 0), NOW)).toBe("7:00 PM"); // yesterday evening, still inside 24 hours
  expect(notificationTime(NOW, NOW)).toBe("6:30 PM");
  expect(notificationTime(NOW + 60_000, NOW)).toBe("6:31 PM"); // device clock slightly behind
});

test("older than a day, within a week: the weekday and time", () => {
  expect(notificationTime(at(2026, 11, 20, 18, 0), NOW)).toBe("Fri, 6:00 PM");
  expect(notificationTime(at(2026, 11, 16, 9, 7), NOW)).toBe("Mon, 9:07 AM");
});

test("older than a week: the date, with the year only when it differs", () => {
  expect(notificationTime(at(2026, 11, 12, 10, 0), NOW)).toBe("12 Nov");
  expect(notificationTime(at(2026, 11, 14, 18, 30), NOW)).toBe("14 Nov"); // exactly seven days
  expect(notificationTime(at(2025, 12, 13, 10, 0), NOW)).toBe("13 Dec 2025");
});

test("accepts ISO strings and Date objects; nothing readable gives an empty label, never “Invalid Date”", () => {
  expect(notificationTime(new Date(at(2026, 11, 21, 15, 45)).toISOString(), NOW)).toBe("3:45 PM");
  expect(notificationTime(new Date(at(2026, 11, 21, 15, 45)), NOW)).toBe("3:45 PM");
  for (const bad of [null, undefined, "", "not a date"]) expect(notificationTime(bad, NOW)).toBe("");
});

test("the full form spells out day, date and time", () => {
  expect(notificationTimeFull(at(2026, 11, 21, 15, 45))).toBe("Sat, 21 Nov 2026, 3:45 PM");
  expect(notificationTimeFull("nope")).toBe("");
});
