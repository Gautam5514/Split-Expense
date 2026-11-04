import { createHash } from "node:crypto";
import { tripPick } from "./destinations.js";
import { festivalImage } from "./festivals.js";
import { CAMPAIGNS } from "./config.js";

/*
 * Push copy. Every message follows the same rules:
 *  - one clear benefit and one action, nothing vague
 *  - specific: the person's group, the month, a place near them, their own numbers, when we know them
 *  - title ≤ 40 chars, body ≤ 110, so nothing is cut off on a lock screen
 *  - at most one emoji, sentence case, no clickbait or fake urgency
 *  - English and natural Hinglish, spread evenly so results can be compared
 * `c` = { name, group, month, year, near, star, ...data }: group is a short display name or null.
 */
// No emoji anywhere in a notification: plain words read better on a lock screen and in the bell.
export const stripEmoji = (s) => String(s).replace(/ ?[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, "").replace(/\s+([,.!?])/g, "$1").trim();
export const rupees = (n) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))}`;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const COPY = {
  monthly: [
    {
      id: "m1",
      title: (c) => (c.group ? `${c.month} rent for ${c.group}?` : `${c.month} is here`),
      body: (c) => (c.group ? "Add rent and bills once. SplitEase splits them fairly, and everyone sees what they owe." : "Rent, WiFi, groceries: add this month's shared bills once and stop chasing flatmates for money."),
    },
    {
      id: "m2",
      title: (c) => (c.name ? `${c.name}, ${c.month} starts today` : `${c.month} starts today`),
      body: (c) => (c.group ? `Log ${c.month}'s bills in ${c.group} in one line. Totals and balances update for everyone.` : "Log this month's shared bills in one line. Totals and balances update for everyone."),
    },
    {
      id: "m3",
      title: (c) => (c.group ? `${c.group}: naya mahina, naya hisaab` : "Naya mahina, naya hisaab"),
      body: () => "Rent aur bills abhi add karo. Kisne kitna diya, sab saaf dikhega. Koi confusion nahi.",
    },
    {
      id: "m4",
      title: (c) => (c.name ? `${c.name}, ${c.month} ka rent add kiya?` : `${c.month} ka rent add kiya?`),
      body: (c) => `${c.group ? `${c.group} ke` : "Flat ke"} saare bills ek jagah. Ek line likho, SplitEase barabar baant dega.`,
    },
  ],
  weekend: [
    {
      id: "w1",
      title: (c) => (c.group ? `Plans with ${c.group} today?` : "Sunday plans?"),
      body: () => "One person pays, SplitEase splits it. Add the bill in one line, settle up later.",
    },
    {
      id: "w2",
      title: (c) => (c.name ? `${c.name}, what's the plan today?` : "What's the plan today?"),
      body: (c) => `Brunch, movie or a long drive: one person pays, SplitEase splits it${c.group ? ` in ${c.group}` : ""}.`,
    },
    {
      id: "w3",
      title: (c) => (c.group ? `${c.group} ke saath plan?` : "Aaj dosto ke saath plan?"),
      body: () => "Bill ek bharega, hisaab SplitEase rakhega. Aap bas enjoy karo.",
    },
    {
      id: "w4",
      title: () => "Kharcha split karo, dosti nahi",
      body: (c) => `${c.group ? `${c.group} mein aaj` : "Aaj"} ka bill ek line mein add karo. Sabka hissa turant ready.`,
    },
  ],
  trip: [
    {
      id: "t1",
      title: (c) => (c.near ? `${c.near} is calling` : "Year-end trip calling?"),
      body: (c) => (c.near ? `${c.month} is perfect for ${c.near}. Or go big with ${c.star}. Make the trip group in one tap.` : `${c.star}, the hills or a quiet beach? Plan this year's trip and split every rupee fairly.`),
    },
    {
      id: "t2",
      title: () => "This year, actually go",
      body: (c) => `${c.near ? `${c.near} is close by and ` : ""}${c.star} is always a good idea. Make the group, set a budget, go.`,
    },
    {
      id: "t3",
      title: (c) => `${c.star} trip is saal?`,
      body: (c) => (c.near ? `Ya phir paas mein ${c.near}? Group banao, budget set karo, hisaab SplitEase ka.` : "Dosto ke saath plan banao. Budget set karo, hisaab SplitEase ka."),
    },
    {
      id: "t4",
      title: () => "Saal khatam, trip baaki?",
      body: (c) => `${c.near ? `${c.near} ya ${c.star}?` : `Is ${c.month} ${c.star} chalo.`} ${c.near ? `Is ${c.month} nikal hi lo. ` : ""}Trip group aur budget ek tap mein.`,
    },
  ],
  // The Wednesday before a holiday that touches a weekend. c.festival, c.weekday, c.days (3 or 4)
  longweekend: [
    {
      id: "lw1",
      title: (c) => (c.days === 4 ? "One leave = 4 days off" : "Long weekend ahead"),
      body: (c) => `${c.festival} is on ${c.weekday}${c.days === 4 ? ", take one day off" : ""}. ${c.near ? `${c.near} is close. ` : ""}Make the trip group now, split later.`,
    },
    {
      id: "lw2",
      title: (c) => `${c.festival} ka long weekend`,
      body: (c) => `${c.days} din ki chhutti${c.near ? `, ${c.near} paas hi hai` : ""}. Dosto ke saath plan banao, hisaab SplitEase ka.`,
    },
    {
      id: "lw3",
      title: () => "Where to this long weekend?",
      body: (c) => `${c.weekday} is a holiday for ${c.festival}. Group, budget and the first booking in one tap.`,
    },
  ],
  // Monday morning. c.spent (their share last week), c.count, c.topGroup, c.back (owed back from what they paid)
  recap: [
    {
      id: "r1",
      title: (c) => `Last week: ${rupees(c.spent)} across ${c.count} ${c.count === 1 ? "bill" : "bills"}`,
      body: (c) => `${c.topGroup ? `Most of it in ${c.topGroup}. ` : ""}${c.back > 0 ? `${rupees(c.back)} of what you paid is still owed to you.` : "Everything you paid was your own share. Clean week."}`,
    },
    {
      id: "r2",
      title: (c) => (c.name ? `${c.name}, your week in numbers` : "Your week in numbers"),
      body: (c) => `${c.count} ${c.count === 1 ? "expense" : "expenses"}, ${rupees(c.spent)} your share${c.topGroup ? `, mostly ${c.topGroup}` : ""}. ${c.back > 0 ? `${rupees(c.back)} coming back to you.` : "All square so far."}`,
    },
    {
      id: "r3",
      title: (c) => `Pichle hafte ${rupees(c.spent)}, ${c.count} bills`,
      body: (c) => `${c.topGroup ? `Sabse zyada ${c.topGroup} mein. ` : ""}${c.back > 0 ? `Aapke ${rupees(c.back)} abhi aane baaki hain. Yaad dila do.` : "Sab barabar hai. Aisa hi chalne do."}`,
    },
  ],
  // Wednesday evening. c.direction "owed" | "owe", c.amount, c.other (first name), c.group
  settle: [
    {
      id: "s1",
      title: (c) => (c.direction === "owed" ? `${c.other} owes you ${rupees(c.amount)}` : `You owe ${c.other} ${rupees(c.amount)}`),
      body: (c) => (c.direction === "owed" ? `${c.group ? `From ${c.group}, ` : ""}sitting there for a while. A reminder is one tap, no awkward chat.` : `${c.group ? `From ${c.group}. ` : ""}Settle it now and start the weekend clean. UPI, one minute.`),
    },
    {
      id: "s2",
      title: (c) => (c.direction === "owed" ? `${c.other} ko ${rupees(c.amount)} dene hain` : `${c.other} ke ${rupees(c.amount)} baaki hain`),
      body: (c) => (c.direction === "owed" ? `${c.group ? `${c.group} ka ` : ""}hisaab abhi tak pending. Ek tap mein yaad dila do, baat SplitEase karega.` : `${c.group ? `${c.group} ka ` : ""}hisaab clear kar do. UPI se ek minute ka kaam, weekend tension-free.`),
    },
    {
      id: "s3",
      title: (c) => (c.direction === "owed" ? `${rupees(c.amount)} to collect${c.group ? ` in ${c.group}` : ""}` : `${rupees(c.amount)} to settle${c.group ? ` in ${c.group}` : ""}`),
      body: (c) => (c.direction === "owed" ? `${c.other} still owes you. Open the group and send a friendly nudge.` : `${c.other} is waiting. Open the group, pay with UPI, done.`),
    },
  ],
  // Thursday noon, people away for two weeks. c.newCount, c.group, c.days
  winback: [
    {
      id: "wb1",
      title: (c) => `${c.newCount} new ${c.newCount === 1 ? "expense" : "expenses"} in ${c.group}`,
      body: (c) => `Added while you were away. Your balance has moved; have a look before it surprises you.`,
    },
    {
      id: "wb2",
      title: (c) => `${c.group} missed you`,
      body: (c) => `${c.newCount} ${c.newCount === 1 ? "naya kharcha" : "naye kharche"} add ${c.newCount === 1 ? "hua" : "hue"} hain. Apna hissa ek nazar dekh lo.`,
    },
    {
      id: "wb3",
      title: (c) => (c.name ? `${c.name}, ${c.days} days away` : `${c.days} days away`),
      body: (c) => `${c.group} kept going: ${c.newCount} new ${c.newCount === 1 ? "bill" : "bills"}. Check what's yours in one tap.`,
    },
  ],
  // Day 3 and day 7 after sign-up, still no expense. c.day, c.group
  onboard: [
    {
      id: "o1",
      title: (c) => (c.group ? `${c.group} is waiting for its first bill` : "Add your first expense"),
      body: () => "Type it like a message: 'Dinner 1200 paid by me'. SplitEase splits it and everyone sees their share.",
    },
    {
      id: "o2",
      title: () => "Pehla kharcha add karo",
      body: (c) => `Bas ek line: 'Chai 120 maine di'${c.group ? `, ${c.group} mein` : ""}. Baaki hisaab SplitEase ka.`,
    },
    {
      id: "o3",
      title: (c) => (c.day >= 7 ? "Under a minute, promise" : (c.name ? `${c.name}, try one expense` : "Try one expense")),
      body: (c) => (c.group ? `Most people add their first bill to a group in under a minute. ${c.group} is ready when you are.` : "Make a group with the people you share bills with, add one expense, see the magic."),
    },
  ],
};

// The draft Autopilot opens with; the user edits it before anything happens.
const DRAFT = {
  monthly: () => "Rent paid by me, split equally",
  weekend: () => "Dinner paid by me, split equally",
  trip: (c) => `Create group ${c.near || c.star} Trip, budget 30000`,
  longweekend: (c) => `Create group ${c.festival} weekend trip, budget 15000`,
  onboard: (c) => (c.group ? "Dinner 1200 paid by me, split equally" : "Create group Friends"),
  festival: (c) => c.festivalObj.draft(c),
};
const LINKS = {
  monthly: { app: "/dashboard", cta: "Add monthly bills" },
  weekend: { app: "/dashboard", cta: "Split a bill" },
  trip: { app: "/create-group", cta: "Plan the trip" },
  longweekend: { app: "/create-group", cta: "Plan the weekend" },
  recap: { app: "/dashboard", cta: "See balances" },
  settle: { app: "/dashboard", cta: "Open the group" },
  winback: { app: "/dashboard", cta: "See what's new" },
  onboard: { app: "/dashboard", cta: "Add an expense" },
};
export const IMAGES = Object.fromEntries(Object.entries(CAMPAIGNS).map(([k, v]) => [k, v.image]));

export const TITLE_MAX = 40;
export const BODY_MAX = 110;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (slot) => MONTHS[(Number(String(slot.period || slot.key || "").match(/\d{4}-(\d{2})/)?.[1]) || new Date().getMonth() + 1) - 1];

const bucket = (seed, n) => parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) % n;
export const inHoldout = (userId, slotKey, pct) => pct > 0 && bucket(`holdout:${slotKey}:${userId}`, 100) < pct;
export const firstName = (name) => {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  return /^[\p{L}]{2,20}$/u.test(first) ? first[0].toUpperCase() + first.slice(1) : "";
};
// Group names are user text: keep letters, numbers and simple punctuation, and keep them short.
export const shortGroupName = (name) => {
  const clean = String(name || "").replace(/[^\p{L}\p{N} &'().-]/gu, "").replace(/\s+/g, " ").trim();
  if (clean.length < 2) return null;
  return clean.length > 18 ? `${clean.slice(0, 17).trim()}…` : clean;
};

const variantsFor = (slot) => {
  if (slot.campaign === "festival") return (slot.eve ? slot.festival.eveLines : slot.festival.lines) || slot.festival.lines;
  return COPY[slot.campaign] || [];
};

/*
 * The message one user gets for one slot. `group` is the group it is about (or null);
 * `data` is what the behavioural fetchers found for this person (recap numbers, the debt
 * to settle, what changed while they were away). Variants are spread evenly and stay
 * stable per user and slot, so results can be compared.
 */
export function messageFor(slot, user, profile = {}, group = null, data = {}) {
  if (slot.campaign === "broadcast") return broadcastMessage(slot, user);
  const variants = variantsFor(slot);
  const v = variants[bucket(`${slot.key}:${user._id}`, variants.length)];
  const year = Number(String(slot.period || slot.key || "").match(/(\d{4})/)?.[1]) || new Date().getFullYear();
  const c = {
    name: firstName(user.name), month: monthOf(slot), year, group: group ? shortGroupName(group.name) : null,
    ...(slot.campaign === "trip" || slot.campaign === "longweekend" ? tripPick(profile, slot.step || 1) : {}),
    ...(slot.campaign === "festival" ? { festivalObj: slot.festival, festival: slot.festival.name, emoji: slot.festival.emoji } : {}),
    ...(slot.campaign === "longweekend" ? { festival: slot.festival.name, weekday: DAYS[new Date(Date.UTC(year, slot.festival.month - 1, slot.festival.day)).getUTCDay()], days: slot.kind === "thu" || slot.kind === "tue" ? 4 : 3 } : {}),
    ...data,
    ...(data.other ? { other: firstName(data.other) || "A friend" } : {}),
    ...(data.group !== undefined ? { group: data.group ? shortGroupName(data.group) : null } : {}),
  };
  // Never cut off on a lock screen: drop the name, then the group, then the other person's name.
  const fitted = [c, { ...c, name: "" }, { ...c, group: null }, { ...c, name: "", group: null }, { ...c, name: "", group: null, other: "A friend", topGroup: null }]
    .find(x => v.title(x).length <= TITLE_MAX && v.body(x).length <= BODY_MAX) || { ...c, name: "", group: null, other: "A friend", topGroup: null };
  const groupId = data.groupId || (!["trip", "longweekend"].includes(slot.campaign) && fitted.group && group?._id ? String(group._id) : null);
  const prompt = DRAFT[slot.campaign] ? DRAFT[slot.campaign](fitted) : "";
  const direct = ["settle", "winback"].includes(slot.campaign) && groupId ? `/groups/${groupId}` : slot.campaign === "recap" ? "/dashboard" : null;
  const links = slot.campaign === "festival" ? { app: "/dashboard", cta: slot.festival.cta } : LINKS[slot.campaign];
  return {
    variant: v.id, title: v.title(fitted), body: v.body(fitted), prompt, groupId,
    webLink: direct || `/dashboard?autopilot=1&prompt=${encodeURIComponent(prompt)}${groupId ? `&groupId=${groupId}` : ""}`,
    appLink: direct || links.app, cta: links.cta,
    image: slot.campaign === "festival" ? festivalImage(slot.festival.id) : IMAGES[slot.campaign],
    personalised: Boolean(fitted.name || fitted.group || fitted.personalised || Object.keys(data).length),
  };
}

// Admin broadcasts carry their own text; only the person's first name is filled in.
function broadcastMessage(slot, user) {
  const b = slot.broadcast;
  const fill = (s) => stripEmoji(String(s || "").replace(/\{name\}/g, firstName(user.name) || "there")).replace(/\s+/g, " ").trim();
  const title = fill(b.title).slice(0, 60), body = fill(b.body).slice(0, 160);
  const prompt = String(b.prompt || "").trim();
  const link = /^\/[\w\-/?=&%.]*$/.test(String(b.link || "")) ? b.link : "/dashboard";
  return {
    variant: "broadcast", title, body, prompt, groupId: null,
    webLink: prompt ? `/dashboard?autopilot=1&prompt=${encodeURIComponent(prompt)}` : link,
    appLink: link, cta: b.cta || "Open SplitEase", image: b.image || null, personalised: /\{name\}/.test(`${b.title}${b.body}`),
  };
}

export const variantsOf = (campaign) => (COPY[campaign] || []).map(v => v.id);
