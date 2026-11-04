# Notification strategy

How SplitEase talks to people when they are not in the app. One message is one document in
`Notification` (type `promo`): it lands in the bell on web and in the app, and goes out as a
push to every registered device. The same copy, the same link, the same banner everywhere.

Code: `backend/modules/engagement/`. Admin: **Admin → Notifications**. Tests: `backend/tests/engagement.test.js`.

## The four tiers

| Tier | Campaigns | When | Wins the day? | Keeps going under fatigue? |
|---|---|---|---|---|
| Festival | 27 Indian and global moments, some with an eve | 10:00 IST (eves 18:30) | Yes | Yes |
| Personal | Weekly recap, settle-up, win-back, onboarding | Mon 09:30, Wed 18:30, Thu 12:00, daily 11:00 | No (skipped on festival days) | Yes |
| Evergreen | New month, weekend, trip season, long weekend | 1st 10:00, a Sunday 12:30, Nov–Dec 19:30, Wed 19:00 | No (moved to the next free day) | No |
| Broadcast | One-off messages the admin writes | Any time, quiet hours enforced | n/a | n/a |

Personal nudges are built from each person's own data and are sent only when there is something
to say. No numbers, no push.

- **Weekly recap** (Monday): your share last week, how many bills, the group that took most of it,
  and how much of what you paid is still owed to you.
- **Settle up** (Wednesday): the largest balance between you and one person, in a group quiet for
  5+ days and ≥ ₹200. Being owed is preferred over owing. Opens the group directly.
- **Win-back** (Thursday): people away 14+ days get the group with the most new bills since they
  left, with the count.
- **Onboarding** (daily): day 3 and day 7 after sign-up, only while there is still no expense.

## Frequency and fatigue

Per person: 1 a day, 4 in any 7 days, 12 in 30 days, all enforced in one atomic write on the
person's `EngagementState` document (no history scans, no races between campaigns). The schedule
itself never puts more than 4 broadcast-style campaigns in any 7-day window and never two on one
day, so the caps rarely have to bite.

Fatigue: every send increments `streak`; opening any tip resets it. At 4 unopened in a row,
evergreen nudges stop for that person. Festival greetings and personal nudges continue, because
those are the ones that bring people back. 10% of people are held out of every campaign so opens
can be compared against a baseline.

Quiet hours are 21:00–09:00 IST. Every slot has a window; a server that was down catches up the
same day or not at all. Pushes carry a 4-hour TTL, so nothing arrives late.

## Festival calendar

Dates live in `festivals.js`. Fixed dates are computed, Mother's/Father's/Friendship Day are
"nth Sunday", lunar festivals are tabulated per year. 2026 is confirmed from published calendars
(Holi 4 Mar, Eid 21 Mar, Raksha Bandhan 28 Aug, Ganesh Chaturthi 14 Sep, Navratri 11 Oct,
Dussehra 20 Oct, Diwali 8 Nov, Bhai Dooj 10 Nov, Chhath 15 Nov). 2027 is loaded (Holi 22 Mar,
Raksha Bandhan 17 Aug, Ganesh Chaturthi 4 Sep, Dussehra 9 Oct, Diwali 29 Oct).

Dates ending in `~` (moon-sighting Eids, a few panchang-dependent regional days in 2027) are
**estimates and are not sent** until the admin confirms them on the admin page. Confirmed dates are
stored in `EngagementSetting.festivalDates`. The admin page warns when the calendar runs out.

Regional festivals (Onam, Chhath, Durga Puja, Ganesh Chaturthi, Lohri, Gurpurab, Ugadi) only reach
people whose profile city/state places them in the region. No GPS, no IP.

Holidays that fall on Fri/Mon (3-day weekend) or Thu/Tue (4-day with one leave) get a long-weekend
nudge on the Wednesday before, suggesting a place near the person.

## Copy rules

Title ≤ 40, body ≤ 110, one emoji at most, one action, no fake urgency. English and natural
Hinglish, spread evenly per person and slot so variants can be compared. Every message names
something specific: the person, their group, the month, a destination, or their own rupees.
Auto-fit drops the name, then the group, then the other person's name until it fits.

Every tip opens something useful: Autopilot with a draft ("Diwali party paid by me, split
equally"), the group concerned, or the dashboard.

## Admin controls

- Pause everything, or switch any single campaign off, without a deploy.
- Confirm estimated festival dates.
- Send any campaign (including any festival) to one email as a test.
- Broadcasts: title, body, button, link or Autopilot draft, send now or at a time, audience
  (everyone / active 30d / away 30d+), optional "even if they had a tip today". Claimed per person,
  so a restart never doubles a send; cancellable while scheduled or sending.

## What the research said (Nov 2026)

- Vendors agree on frequency caps and per-type opt-out tracking rather than a universal number;
  promotional pushes drive most opt-outs. A Pushwoosh study across apps including India found
  almost no correlation between push frequency and opt-in rate. Hence: caps + fatigue + holdout,
  and personal nudges carrying real numbers.
- Apple (guideline 4.5.4) needs explicit opt-in for marketing pushes; India's DPDP rules point the
  same way. `RULES.requireOptIn` flips the audience to opt-in in one line before the iOS launch.

## Open items

- The mobile app still uses the `alerts` Android channel for tips; a `promotions` channel and a
  settings toggle need a new app build before `RULES.androidChannel` changes.
- 2028 lunar dates are not loaded yet.
