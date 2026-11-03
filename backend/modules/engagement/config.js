// Every engagement rule in one place. Nothing here needs an env variable: tips run by
// default, and the admin page (Admin → Notifications) can pause them without a deploy.
export const RULES = {
  tripPerMonth: 2, // Nov and Dec, so four trip ideas a season
  holdoutPct: 10, // share of people deliberately skipped, to measure what tips really change
  requireOptIn: false, // false: everyone gets tips unless they switched them off
  perDay: 1, // never more than one tip a day
  per30Days: 5,
  newUserGraceDays: 2, // let people settle in before the first tip
  inactiveAfterDays: 120, // stop tipping people who left (unless they still have push on)
  androidChannel: "alerts", // exists in every live app build
  pushTtlSeconds: 4 * 3600, // a tip that can't arrive within 4 hours is dropped, not sent late
};

// Push images must be public https URLs, so a local dev origin falls back to the live site.
export function assetOrigin(env = process.env) {
  const candidates = [env.APP_PUBLIC_URL, ...(env.FRONTEND_URL || "").split(",")].map(s => String(s || "").trim().replace(/\/+$/, ""));
  return candidates.find(u => /^https:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u)) || "https://splitease.tech";
}
export const imageUrl = (file, env) => `${assetOrigin(env)}/notifications/${file}`;
