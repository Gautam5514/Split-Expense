// Every engagement rule in one place. Nothing here needs an env variable: campaigns run by
// default, and the admin page (Admin → Notifications) can pause any of them without a deploy.
export const RULES = {
  tripPerMonth: 2, // Nov and Dec, so four trip ideas a season
  holdoutPct: 10, // share of people deliberately skipped, to measure what tips really change
  requireOptIn: false, // false: everyone gets tips unless they switched them off
  perDay: 1, // never more than one tip a day
  per7Days: 4, // a busy festival week still leaves people alone most days
  per30Days: 12,
  // Fatigue: after this many tips in a row with no open, generic nudges stop for that person.
  // Festival greetings and nudges about their own money (recap, settle-up) keep going, and
  // the first open resets the counter.
  fatigueAfter: 4,
  newUserGraceDays: 2, // let people settle in before the first tip
  inactiveAfterDays: 120, // stop tipping people who left (unless they still have push on)
  androidChannel: "alerts", // exists in every live app build
  pushTtlSeconds: 4 * 3600, // a tip that can't arrive within 4 hours is dropped, not sent late
  // Behavioural nudges
  settleMinAmount: 200, // ₹; smaller balances aren't worth a push
  settleAfterDays: 5, // a balance must have sat at least this long
  winbackAfterDays: 14, // no activity for two weeks
  onboardDays: [3, 7], // days after sign-up with still no expense
};

/*
 * Campaign tiers decide what wins when two things want the same day and who keeps
 * getting messages when fatigue sets in:
 *   festival   – a dated moment (Diwali, Holi, New Year…); always wins the day
 *   personal   – about the person's own money (weekly recap, settle-up, win-back, onboarding)
 *   generic    – the evergreen nudges (new month, weekend, trip season)
 *   broadcast  – one-off messages the admin schedules
 */
export const CAMPAIGNS = {
  monthly: { tier: "generic", name: "New month", image: "monthly.png" },
  weekend: { tier: "generic", name: "Weekend", image: "weekend.png" },
  trip: { tier: "generic", name: "Trip idea", image: "trip.png" },
  longweekend: { tier: "generic", name: "Long weekend", image: "trip.png" },
  festival: { tier: "festival", name: "Festival", image: "festival.png" },
  recap: { tier: "personal", name: "Weekly recap", image: "recap.png" },
  settle: { tier: "personal", name: "Settle up", image: "settle.png" },
  winback: { tier: "personal", name: "Welcome back", image: "winback.png" },
  onboard: { tier: "personal", name: "First expense", image: "onboard.png" },
  broadcast: { tier: "broadcast", name: "Broadcast", image: "festival.png" },
};
export const tierOf = (campaign) => CAMPAIGNS[campaign]?.tier || "generic";

// Push images must be public https URLs, so a local dev origin falls back to the live site.
export function assetOrigin(env = process.env) {
  const candidates = [env.APP_PUBLIC_URL, ...(env.FRONTEND_URL || "").split(",")].map(s => String(s || "").trim().replace(/\/+$/, ""));
  return candidates.find(u => /^https:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u)) || "https://split.elitecrew.online";
}
export const imageUrl = (file, env) => `${assetOrigin(env)}/notifications/${file}`;
