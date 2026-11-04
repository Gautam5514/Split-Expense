// Pure tests for engagement campaigns: schedule, copy and destinations. No DB or network.
import { slotsForMonth, dueSlots, weekendDay, istParts, istTime, istDayKey, upcomingSlots } from "../modules/engagement/schedule.js";
import { messageFor, inHoldout, variantsOf, shortGroupName, TITLE_MAX, BODY_MAX } from "../modules/engagement/copy.js";
import { regionFor, tripPick } from "../modules/engagement/destinations.js";
import { audienceFilter } from "../modules/engagement/audience.js";
import { assetOrigin, RULES, CAMPAIGNS, tierOf } from "../modules/engagement/config.js";
import { festivalsOfYear, unconfirmed, inScope, FESTIVALS, FESTIVAL_IDS, festivalImage } from "../modules/engagement/festivals.js";
import { audienceExtra } from "../modules/engagement/behaviour.js";

const broadcastSlots = (slots) => slots.filter(s => tierOf(s.campaign) !== "personal");

const user = { _id: "64b000000000000000000001", name: "aman gupta" };
const hourIST = (d) => { const p = new Date(d.getTime() + 330 * 60000); return p.getUTCHours() + p.getUTCMinutes() / 60; };

describe("schedule (IST)", () => {
  test("IST conversion is exact", () => {
    expect(istTime(2026, 12, 1, 10).toISOString()).toBe("2026-12-01T04:30:00.000Z");
    expect(istParts(new Date("2026-11-30T19:00:00Z"))).toMatchObject({ month: 12, day: 1 }); // 00:30 IST on 1 Dec
    expect(istDayKey(new Date("2026-11-30T19:00:00Z"))).toBe("2026-12-01");
  });
  test("every month has the 1st-of-month reminder and one Sunday nudge", () => {
    for (let m = 1; m <= 12; m++) {
      const slots = slotsForMonth(2027, m);
      expect(slots.filter(s => s.campaign === "monthly")).toHaveLength(1);
      const weekend = slots.filter(s => s.campaign === "weekend");
      expect(weekend).toHaveLength(1);
      expect(new Date(Date.UTC(2027, m - 1, weekend[0].day)).getUTCDay()).toBe(0);
      expect(weekend[0].day).toBeGreaterThan(1);
    }
  });
  test("trip nudges only in November and December, 2-6 across the season", () => {
    expect(slotsForMonth(2026, 10).some(s => s.campaign === "trip")).toBe(false);
    const season = (n) => [11, 12].flatMap(m => slotsForMonth(2026, m, { tripPerMonth: n })).filter(s => s.campaign === "trip");
    expect(season(2)).toHaveLength(4);
    expect(season(1)).toHaveLength(2);
    expect(season(3)).toHaveLength(6);
    expect(season(9)).toHaveLength(6);
    expect(season(2).map(s => s.step)).toEqual([1, 2, 3, 4]);
  });
  test("never two broadcast-style campaigns on the same day, never more than 4 in any 7 days", () => {
    for (let y = 2026; y <= 2030; y++) for (let m = 1; m <= 12; m++) {
      const days = broadcastSlots(slotsForMonth(y, m, { tripPerMonth: 3 })).map(s => s.day);
      expect(new Set(days).size).toBe(days.length);
      for (const d of days) expect(days.filter(x => x >= d && x < d + 7).length).toBeLessThanOrEqual(RULES.per7Days);
    }
  });
  test("festivals take their day; the evergreen nudge moves or waits", () => {
    const nov = slotsForMonth(2026, 11);
    const key = (c) => nov.filter(s => s.campaign === c).map(s => s.day);
    expect(nov.find(s => s.key === "festival:diwali:2026").day).toBe(8);
    expect(nov.find(s => s.key === "festival:diwali-eve:2026").day).toBe(7);
    expect(key("weekend")).toEqual([22]); // 8 Nov is Diwali, 15 Nov is Chhath: the next free Sunday
    expect(key("trip")).toEqual([6, 20]);
    expect(nov.filter(s => s.campaign === "recap").every(s => s.day !== 8)).toBe(true);
    const jan = slotsForMonth(2027, 1);
    expect(jan.find(s => s.campaign === "monthly").day).toBe(2); // 1 Jan is New Year
    expect(jan.find(s => s.key === "festival:newyear:2027").day).toBe(1);
  });
  test("a holiday on a Friday or Monday gets a long-weekend nudge on the Wednesday before", () => {
    const dec = slotsForMonth(2026, 12);
    expect(dec.find(s => s.key === "longweekend:christmas:2026")).toMatchObject({ day: 23, kind: "fri" });
    expect(slotsForMonth(2027, 8).find(s => s.campaign === "longweekend")).toBeUndefined(); // 15 Aug 2027 is a Sunday
  });
  test("personal nudges run weekly on their weekday and onboarding daily, except festival days", () => {
    const nov = slotsForMonth(2026, 11);
    for (const s of nov.filter(s => s.campaign === "recap")) expect(new Date(Date.UTC(2026, 10, s.day)).getUTCDay()).toBe(1);
    for (const s of nov.filter(s => s.campaign === "settle")) expect(new Date(Date.UTC(2026, 10, s.day)).getUTCDay()).toBe(3);
    const onboard = nov.filter(s => s.campaign === "onboard").map(s => s.day);
    expect(onboard).toHaveLength(30 - 5); // 7, 8, 10, 15, 24 are festivals
    expect(onboard).not.toContain(8);
  });
  test("admins can switch a campaign off and confirm an estimated festival date", () => {
    expect(slotsForMonth(2026, 11, { disabled: ["festival", "onboard"] }).some(s => s.campaign === "festival" || s.campaign === "onboard")).toBe(false);
    expect(slotsForMonth(2027, 3).some(s => s.key === "festival:eid:2027")).toBe(false); // moon sighting: estimate only
    expect(slotsForMonth(2027, 3, { overrides: { "eid:2027": "03-10" } }).find(s => s.key === "festival:eid:2027").day).toBe(10);
  });
  test("every send window sits inside 09:00-21:00 IST", () => {
    for (const s of [1, 3, 8, 10, 11, 12].flatMap(m => slotsForMonth(2026, m, { tripPerMonth: 3 }))) {
      expect(hourIST(s.at)).toBeGreaterThanOrEqual(9);
      expect(hourIST(new Date(s.until.getTime() - 1))).toBeLessThan(21);
    }
  });
  test("a slot is due only inside its window", () => {
    expect(dueSlots(new Date("2026-12-01T04:29:00Z"))).toEqual([]); // 09:59 IST
    expect(dueSlots(new Date("2026-12-01T04:31:00Z")).map(s => s.key)).toEqual(["monthly:2026-12"]);
    expect(dueSlots(new Date("2026-12-01T10:31:00Z"))).toEqual([]); // 16:01 IST, window closed
    expect(dueSlots(istTime(2026, 11, 22, 13)).map(s => s.key)).toEqual(["onboard:2026-11-22", "weekend:2026-11"]); // personal first
    expect(dueSlots(istTime(2026, 11, 8, 10, 30)).map(s => s.key)).toEqual(["festival:diwali:2026"]);
    expect(dueSlots(istTime(2026, 11, 9, 11, 30)).map(s => s.key)).toEqual(["recap:2026-11-09", "onboard:2026-11-09"]);
  });
  test("upcoming lists the next sends in order", () => {
    const next = upcomingSlots(new Date("2026-11-05T12:00:00Z"), 4);
    expect(next.map(s => s.key)).toEqual(["trip:2026-11:1", "festival:diwali-eve:2026", "festival:diwali:2026", "recap:2026-11-09"]);
    expect(next[0].at.toISOString()).toBe("2026-11-06T14:00:00.000Z"); // Fri 6 Nov, 19:30 IST
    expect(next.some(s => s.campaign === "onboard")).toBe(false);
  });
});

describe("copy", () => {
  const slot = (campaign, extra = {}) => ({ campaign, key: `${campaign}:2026-11`, step: 1, ...extra });
  test("short enough for a lock screen, with one call to action and links for both platforms", () => {
    for (const c of ["monthly", "weekend", "trip"]) for (let i = 0; i < 40; i++) {
      const m = messageFor(slot(c, { key: `${c}:x${i}` }), { _id: `u${i}`, name: "Priya" }, { state: "Odisha" });
      expect(m.title.length).toBeLessThanOrEqual(40);
      expect(m.body.length).toBeLessThanOrEqual(120);
      expect(m.webLink.startsWith("/dashboard?autopilot=1&prompt=")).toBe(true);
      expect(m.appLink.startsWith("/")).toBe(true);
      expect(m.cta).toBeTruthy();
      expect(m.title).not.toMatch(/undefined|null/);
      expect(m.body).not.toMatch(/undefined|null/);
    }
  });
  test("variants are spread evenly and stable for a user", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(messageFor(slot("monthly"), { _id: `u${i}` }).variant);
    expect([...seen].sort()).toEqual(variantsOf("monthly").sort());
    expect(messageFor(slot("weekend"), user).variant).toBe(messageFor(slot("weekend"), user).variant);
  });
  test("trip nudges name a destination near the user, and Goa", () => {
    const m = messageFor(slot("trip"), user, { state: "Odisha" });
    expect(`${m.title} ${m.body}`).toMatch(/Puri|Goa/);
    expect(m.webLink).toContain(encodeURIComponent("Trip, budget"));
    expect(m.personalised).toBe(true);
  });
  test("strange names are not used", () => {
    const m = messageFor({ campaign: "monthly", key: "monthly:2026-12" }, { _id: "u9", name: "<script>" });
    expect(m.body).not.toContain("<");
  });
  test("about 10% are held out, deterministically", () => {
    let held = 0;
    for (let i = 0; i < 2000; i++) if (inHoldout(`u${i}`, "trip:2026-11:1", 10)) held++;
    expect(held).toBeGreaterThan(140); expect(held).toBeLessThan(260);
    expect(inHoldout("u1", "k", 0)).toBe(false);
  });
});

describe("destinations", () => {
  test("state or city maps to nearby places; unknown falls back to Goa only", () => {
    expect(regionFor({ state: "Odisha" }).near).toContain("Puri");
    expect(regionFor({ city: "Pune" }).near).toContain("Lonavala");
    expect(regionFor({ city: "Ahmedabad" }).near).toContain("Rann of Kutch");
    expect(tripPick({}, 1)).toEqual({ near: null, star: "Goa", personalised: false });
    expect(tripPick({ state: "Goa" }, 1).star).not.toBe("Goa");
  });
  test("each nudge in the season suggests somewhere new", () => {
    expect(tripPick({ state: "Karnataka" }, 1).near).not.toBe(tripPick({ state: "Karnataka" }, 2).near);
  });
});

describe("audience", () => {
  test("opt-out mode skips only people who switched off; opt-in mode needs an explicit yes", () => {
    expect(audienceFilter(new Date())["notificationPrefs.engagement"]).toEqual({ $ne: false });
    expect(audienceFilter(new Date(), { requireOptIn: true })["notificationPrefs.engagement"]).toBe(true);
  });
});

describe("defaults need no env setup", () => {
  test("rules are fixed in code", () => {
    expect(RULES).toMatchObject({ tripPerMonth: 2, perDay: 1, per7Days: 4, per30Days: 12, fatigueAfter: 4, requireOptIn: false, androidChannel: "alerts" });
    for (const c of Object.values(CAMPAIGNS)) expect(["festival", "personal", "generic", "broadcast"]).toContain(c.tier);
  });
  test("push images always use a public https site", () => {
    expect(assetOrigin({})).toBe("https://split.elitecrew.online");
    expect(assetOrigin({ FRONTEND_URL: "http://localhost:3000,https://app.example.in/" })).toBe("https://app.example.in");
    expect(assetOrigin({ APP_PUBLIC_URL: "https://splitease.tech", FRONTEND_URL: "https://x.in" })).toBe("https://splitease.tech");
  });
  test("brand-new accounts get a couple of days before their first tip", () => {
    const now = new Date("2026-12-01T05:00:00Z");
    const cutoff = audienceFilter(now)._id.$lt;
    expect(cutoff.getTimestamp().toISOString()).toBe("2026-11-29T05:00:00.000Z");
  });
});

describe("smart, clear copy", () => {
  const names = ["Priya", "Aman", "Venkatanarasimharajuvaripeta", "", "Ana"];
  const groups = [null, { _id: "6".repeat(24), name: "Flat 302" }, { _id: "7".repeat(24), name: "Koramangala Roommates Forever 2026" }, { _id: "8".repeat(24), name: "<b>Goa</b> 🎉" }];
  test("every variant fits a lock screen, for any name, group and month", () => {
    for (const campaign of ["monthly", "weekend", "trip"]) for (let m = 1; m <= 12; m++) for (const name of names) for (const group of groups) for (let i = 0; i < 8; i++) {
      const slot = { campaign, key: `${campaign}:2026-${String(m).padStart(2, "0")}:${i}`, period: `2026-${String(m).padStart(2, "0")}`, step: 1 };
      const msg = messageFor(slot, { _id: `u${i}${name}`, name }, { state: i % 2 ? "Odisha" : "" }, group);
      expect(msg.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(msg.body.length).toBeLessThanOrEqual(BODY_MAX);
      expect(`${msg.title} ${msg.body}`).not.toMatch(/undefined|null|\$\{|<|>/);
      expect(`${msg.title} ${msg.body}`).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
  test("names the person's flat group and opens Autopilot inside it", () => {
    const flat = { _id: "6".repeat(24), name: "Flat 302" };
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const msg = messageFor({ campaign: "monthly", key: `monthly:2026-12`, period: "2026-12" }, { _id: `u${i}`, name: "Priya" }, {}, flat);
      seen.add(msg.variant);
      if (/Flat 302/.test(`${msg.title} ${msg.body}`)) {
        expect(msg.groupId).toBe(flat._id);
        expect(msg.webLink).toContain(`groupId=${flat._id}`);
      }
      expect(`${msg.title} ${msg.body}`).toMatch(/Flat 302|December|Naya mahina|Rent aur bills/);
    }
    expect(seen.size).toBe(4);
  });
  test("without a group the message is still specific and useful", () => {
    const msg = messageFor({ campaign: "monthly", key: "monthly:2026-12", period: "2026-12" }, { _id: "x", name: "" }, {}, null);
    expect(msg.groupId).toBeNull();
    expect(msg.webLink).not.toContain("groupId");
  });
  test("group names are cleaned and kept short", () => {
    expect(shortGroupName("Koramangala Roommates Forever 2026")).toBe("Koramangala Roomm…");
    expect(shortGroupName("<b>Goa</b> 🎉")).toBe("bGoab");
    expect(shortGroupName("  ")).toBeNull();
  });
  test("trip nudges mention the month", () => {
    const msgs = Array.from({ length: 30 }, (_, i) => messageFor({ campaign: "trip", key: `trip:2026-12:${i}`, period: "2026-12", step: 1 }, { _id: `t${i}` }, { state: "Odisha" }));
    expect(msgs.some(m => /December/.test(m.body))).toBe(true);
  });
});

describe("festival calendar", () => {
  test("every year has the big days and they fall on the researched dates", () => {
    const on = (year, id) => { const f = festivalsOfYear(year).find(x => x.id === id); return `${f.month}/${f.day}${f.approx ? "~" : ""}`; };
    expect(on(2026, "diwali")).toBe("11/8");
    expect(on(2026, "holi")).toBe("3/4");
    expect(on(2026, "rakhi")).toBe("8/28");
    expect(on(2026, "eid")).toBe("3/21");
    expect(on(2027, "diwali")).toBe("10/29");
    expect(on(2027, "holi")).toBe("3/22");
    expect(on(2027, "eid")).toBe("3/10~");
    expect(on(2026, "friendship")).toBe("8/2"); // first Sunday of August
    expect(on(2026, "mothers")).toBe("5/10");
    expect(on(2027, "fathers")).toBe("6/20");
    expect(unconfirmed(2027).map(u => u.id)).toEqual(expect.arrayContaining(["eid", "bakrid"]));
    expect(unconfirmed(2026)).toEqual([]);
  });
  test("every festival has copy, a draft and a button; eves have their own lines", () => {
    for (const id of FESTIVAL_IDS) {
      const f = FESTIVALS[id];
      expect(f.lines.length).toBeGreaterThan(0);
      expect(typeof f.draft).toBe("function");
      expect(f.cta).toBeTruthy();
      if (f.eve) expect(f.eveLines.length).toBeGreaterThan(0);
      expect(festivalImage(id)).toMatch(/\.png$/);
    }
  });
  test("regional festivals only reach people in the region; pan-Indian ones reach everyone", () => {
    expect(inScope(FESTIVALS.onam, { city: "Kochi" })).toBe(true);
    expect(inScope(FESTIVALS.onam, { state: "Odisha" })).toBe(false);
    expect(inScope(FESTIVALS.onam, undefined)).toBe(false);
    expect(inScope(FESTIVALS.chhath, { city: "Patna" })).toBe(true);
    expect(inScope(FESTIVALS.diwali, undefined)).toBe(true);
  });
  test("festival copy fits a lock screen for every festival, eve, name and group", () => {
    const groups = [null, { _id: "6".repeat(24), name: "Flat 302" }, { _id: "7".repeat(24), name: "Koramangala Roommates Forever 2026" }];
    for (const year of [2026, 2027]) for (const f of festivalsOfYear(year)) for (const eve of [false, true]) {
      if (eve && !f.eve) continue;
      for (const name of ["Priya", "Venkatanarasimharajuvaripeta", ""]) for (const group of groups) for (let i = 0; i < 6; i++) {
        const msg = messageFor({ campaign: "festival", key: `festival:${f.id}${eve ? "-eve" : ""}:${year}`, festival: f, eve }, { _id: `u${i}`, name }, {}, group);
        expect(msg.title.length).toBeLessThanOrEqual(TITLE_MAX);
        expect(msg.body.length).toBeLessThanOrEqual(BODY_MAX);
        expect(`${msg.title} ${msg.body}`).not.toMatch(/undefined|null|\$\{|<|>/);
        expect(`${msg.title} ${msg.body}`).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(msg.webLink).toContain("autopilot=1");
        expect(msg.cta).toBe(f.cta);
      }
    }
  });
});

describe("personal nudges", () => {
  const u = { _id: "64b000000000000000000001", name: "aman gupta" };
  test("recap, settle-up and win-back quote the person's own numbers and open the right place", () => {
    const recap = messageFor({ campaign: "recap", key: "recap:2026-11-09" }, u, {}, null, { spent: 4320, count: 7, topGroup: "Flat 302", back: 1800 });
    expect(`${recap.title} ${recap.body}`).toMatch(/₹4,320/);
    expect(`${recap.title} ${recap.body}`).toMatch(/₹1,800/);
    expect(recap.webLink).toBe("/dashboard");
    const settle = messageFor({ campaign: "settle", key: "settle:2026-11-11" }, u, {}, null, { direction: "owed", amount: 125000, other: "Rahul Verma", group: "Goa Trip", groupId: "7".repeat(24) });
    expect(settle.title).toMatch(/Rahul|₹1,25,000/);
    expect(settle.webLink).toBe(`/groups/${"7".repeat(24)}`);
    expect(settle.appLink).toBe(settle.webLink);
    const owe = messageFor({ campaign: "settle", key: "settle:2026-11-11" }, u, {}, null, { direction: "owe", amount: 800, other: "Priya", group: "Flat 302", groupId: "8".repeat(24) });
    expect(`${owe.title} ${owe.body}`).toMatch(/₹800/);
    const back = messageFor({ campaign: "winback", key: "winback:2026-11-12" }, u, {}, null, { newCount: 3, group: "Flat 302", groupId: "8".repeat(24), days: 16 });
    expect(`${back.title} ${back.body}`).toMatch(/3 new|3 naye/);
    expect(back.webLink).toBe(`/groups/${"8".repeat(24)}`);
  });
  test("numbers never push a message past the lock-screen limits", () => {
    for (let i = 0; i < 60; i++) {
      const data = { direction: i % 2 ? "owed" : "owe", amount: 10 ** (i % 7) * 7, other: "Venkatanarasimharajuvaripeta Rao", group: "Koramangala Roommates Forever 2026", groupId: "9".repeat(24) };
      const m = messageFor({ campaign: "settle", key: `settle:x${i}` }, { _id: `u${i}`, name: "Priya" }, {}, null, data);
      expect(m.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(m.body.length).toBeLessThanOrEqual(BODY_MAX);
      const r = messageFor({ campaign: "recap", key: `recap:x${i}` }, { _id: `u${i}`, name: "Priya" }, {}, null, { spent: 10 ** (i % 7) * 3, count: i + 1, topGroup: "Koramangala Roommates Forever 2026", back: 10 ** (i % 6) });
      expect(r.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(r.body.length).toBeLessThanOrEqual(BODY_MAX);
    }
  });
  test("onboarding and long-weekend copy fit and carry a draft", () => {
    const christmas = festivalsOfYear(2026).find(f => f.id === "christmas");
    for (let i = 0; i < 20; i++) {
      const o = messageFor({ campaign: "onboard", key: `onboard:2026-11-${i}` }, { _id: `u${i}`, name: "Priya" }, {}, null, { day: i % 2 ? 3 : 7, group: i % 3 ? "Flat 302" : null, groupId: i % 3 ? "6".repeat(24) : null });
      expect(o.title.length).toBeLessThanOrEqual(TITLE_MAX); expect(o.body.length).toBeLessThanOrEqual(BODY_MAX); expect(o.prompt).toBeTruthy();
      const l = messageFor({ campaign: "longweekend", key: `longweekend:christmas:2026:${i}`, festival: christmas, kind: "fri" }, { _id: `u${i}`, name: "Priya" }, { state: i % 2 ? "Karnataka" : "" });
      expect(l.title.length).toBeLessThanOrEqual(TITLE_MAX); expect(l.body.length).toBeLessThanOrEqual(BODY_MAX);
      expect(`${l.title} ${l.body}`).toMatch(/Christmas|long weekend|Long weekend/);
      expect(l.prompt).toContain("Christmas weekend trip");
    }
  });
  test("onboarding targets day 3 and day 7 sign-ups with no expense; win-back targets two weeks away", () => {
    const now = new Date("2026-11-12T06:30:00Z");
    const o = audienceExtra("onboard", now);
    expect(o.expenseCount).toEqual({ $not: { $gt: 0 } });
    expect(o.$and[0].$or).toHaveLength(2);
    expect(o.$and[0].$or[0]._id.$lt.getTimestamp().toISOString()).toBe("2026-11-09T06:30:00.000Z");
    expect(audienceExtra("winback", now).lastActiveDate).toEqual({ $lt: "2026-10-29", $type: "string" });
    expect(audienceExtra("recap", now)).toEqual({});
  });
});

describe("broadcasts", () => {
  test("fill in the first name, keep their own text and open where the admin said", () => {
    const b = { title: "{name}, scan a bill 📷", body: "Photograph any receipt and SplitEase reads the items.", cta: "Try it", link: "/dashboard", prompt: "", image: "" };
    const m = messageFor({ campaign: "broadcast", key: "broadcast:1", broadcast: b }, { _id: "u1", name: "priya sharma" });
    expect(m.title).toBe("Priya, scan a bill"); // emoji typed by the admin is dropped too
    expect(m.webLink).toBe("/dashboard");
    expect(m.cta).toBe("Try it");
    const anon = messageFor({ campaign: "broadcast", key: "broadcast:1", broadcast: { ...b, link: "javascript:alert(1)", prompt: "Dinner paid by me" } }, { _id: "u2", name: "" });
    expect(anon.title).toBe("there, scan a bill");
    expect(anon.appLink).toBe("/dashboard");
    expect(anon.webLink).toContain("autopilot=1&prompt=Dinner");
  });
});
