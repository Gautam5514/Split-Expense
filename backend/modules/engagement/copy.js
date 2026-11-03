import { createHash } from "node:crypto";
import { tripPick } from "./destinations.js";

/*
 * Push copy. Every message follows the same rules:
 *  - one clear benefit and one action, nothing vague
 *  - specific: the person's group, the month, a place near them, when we know it
 *  - title ≤ 40 chars, body ≤ 110, so nothing is cut off on a lock screen
 *  - at most one emoji, sentence case, no clickbait or fake urgency
 *  - English and natural Hinglish, spread evenly so results can be compared
 * `c` = { name, group, month, near, star }: group is a short display name or null.
 */
const COPY = {
  monthly: [
    {
      id: "m1",
      title: (c) => (c.group ? `${c.month} rent for ${c.group}?` : `${c.month} is here 🗓️`),
      body: (c) => (c.group ? "Add rent and bills once. SplitEase splits them fairly, and everyone sees what they owe." : "Rent, WiFi, groceries: add this month's shared bills once and stop chasing flatmates for money."),
    },
    {
      id: "m2",
      title: (c) => (c.name ? `${c.name}, ${c.month} starts today` : `${c.month} starts today`),
      body: (c) => (c.group ? `Log ${c.month}'s bills in ${c.group} in one line. Totals and balances update for everyone.` : "Log this month's shared bills in one line. Totals and balances update for everyone."),
    },
    {
      id: "m3",
      title: (c) => (c.group ? `${c.group}: naya mahina, naya hisaab` : "Naya mahina, naya hisaab 🗓️"),
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
      title: (c) => (c.group ? `Plans with ${c.group} today?` : "Sunday plans? 🍕"),
      body: () => "One person pays, SplitEase splits it. Add the bill in one line, settle up later.",
    },
    {
      id: "w2",
      title: (c) => (c.name ? `${c.name}, what's the plan today?` : "What's the plan today?"),
      body: (c) => `Brunch, movie or a long drive: one person pays, SplitEase splits it${c.group ? ` in ${c.group}` : ""}.`,
    },
    {
      id: "w3",
      title: (c) => (c.group ? `${c.group} ke saath plan? 🎉` : "Aaj dosto ke saath plan? 🎉"),
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
      title: (c) => (c.near ? `${c.near} is calling 🌴` : "Year-end trip calling? 🌴"),
      body: (c) => (c.near ? `${c.month} is perfect for ${c.near}. Or go big with ${c.star}. Make the trip group in one tap.` : `${c.star}, the hills or a quiet beach? Plan this year's trip and split every rupee fairly.`),
    },
    {
      id: "t2",
      title: () => "This year, actually go ✈️",
      body: (c) => `${c.near ? `${c.near} is close by and ` : ""}${c.star} is always a good idea. Make the group, set a budget, go.`,
    },
    {
      id: "t3",
      title: (c) => `${c.star} trip is saal? 🏖️`,
      body: (c) => (c.near ? `Ya phir paas mein ${c.near}? Group banao, budget set karo, hisaab SplitEase ka.` : "Dosto ke saath plan banao. Budget set karo, hisaab SplitEase ka."),
    },
    {
      id: "t4",
      title: () => "Saal khatam, trip baaki? 🧳",
      body: (c) => `${c.near ? `${c.near} ya ${c.star}?` : `Is ${c.month} ${c.star} chalo.`} ${c.near ? `Is ${c.month} nikal hi lo. ` : ""}Trip group aur budget ek tap mein.`,
    },
  ],
};

// The draft Autopilot opens with; the user edits it before anything happens.
const DRAFT = {
  monthly: () => "Rent paid by me, split equally",
  weekend: () => "Dinner paid by me, split equally",
  trip: (c) => `Create group ${c.near || c.star} Trip, budget 30000`,
};
const LINKS = {
  monthly: { app: "/dashboard", cta: "Add monthly bills" },
  weekend: { app: "/dashboard", cta: "Split a bill" },
  trip: { app: "/create-group", cta: "Plan the trip" },
};
export const IMAGES = { monthly: "monthly.png", weekend: "weekend.png", trip: "trip.png" };

export const TITLE_MAX = 40;
export const BODY_MAX = 110;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (slot) => MONTHS[(Number(String(slot.period || slot.key || "").match(/\d{4}-(\d{2})/)?.[1]) || new Date().getMonth() + 1) - 1];

const bucket = (seed, n) => parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) % n;
export const inHoldout = (userId, slotKey, pct) => pct > 0 && bucket(`holdout:${slotKey}:${userId}`, 100) < pct;
const firstName = (name) => {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  return /^[\p{L}]{2,20}$/u.test(first) ? first[0].toUpperCase() + first.slice(1) : "";
};
// Group names are user text: keep letters, numbers and simple punctuation, and keep them short.
export const shortGroupName = (name) => {
  const clean = String(name || "").replace(/[^\p{L}\p{N} &'().-]/gu, "").replace(/\s+/g, " ").trim();
  if (clean.length < 2) return null;
  return clean.length > 18 ? `${clean.slice(0, 17).trim()}…` : clean;
};

// The message one user gets for one slot. `group` is the group it is about (or null).
// Variants are spread evenly and stay stable per user and slot, so results can be compared.
export function messageFor(slot, user, profile = {}, group = null) {
  const variants = COPY[slot.campaign];
  const v = variants[bucket(`${slot.key}:${user._id}`, variants.length)];
  const c = { name: firstName(user.name), month: monthOf(slot), group: group ? shortGroupName(group.name) : null, ...(slot.campaign === "trip" ? tripPick(profile, slot.step || 1) : {}) };
  // Never cut off on a lock screen: drop the name, then the group, until it fits.
  const fitted = [c, { ...c, name: "" }, { ...c, group: null }, { ...c, name: "", group: null }]
    .find(x => v.title(x).length <= TITLE_MAX && v.body(x).length <= BODY_MAX) || { ...c, name: "", group: null };
  const groupId = slot.campaign !== "trip" && fitted.group && group?._id ? String(group._id) : null;
  const prompt = DRAFT[slot.campaign](fitted);
  return {
    variant: v.id, title: v.title(fitted), body: v.body(fitted), prompt, groupId,
    webLink: `/dashboard?autopilot=1&prompt=${encodeURIComponent(prompt)}${groupId ? `&groupId=${groupId}` : ""}`,
    appLink: LINKS[slot.campaign].app, cta: LINKS[slot.campaign].cta, image: IMAGES[slot.campaign],
    personalised: Boolean(fitted.name || fitted.group || fitted.personalised),
  };
}

export const variantsOf = (campaign) => COPY[campaign].map(v => v.id);
