// Pure tests for engagement campaigns: schedule, copy and destinations. No DB or network.
import { slotsForMonth, dueSlots, weekendDay, istParts, istTime, istDayKey, upcomingSlots } from "../modules/engagement/schedule.js";
import { messageFor, inHoldout, variantsOf, shortGroupName, TITLE_MAX, BODY_MAX } from "../modules/engagement/copy.js";
import { regionFor, tripPick } from "../modules/engagement/destinations.js";
import { audienceFilter } from "../modules/engagement/audience.js";
import { assetOrigin, RULES } from "../modules/engagement/config.js";

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
  test("never two campaigns on the same day", () => {
    for (let y = 2026; y <= 2030; y++) for (const m of [11, 12]) {
      const days = slotsForMonth(y, m, { tripPerMonth: 3 }).map(s => s.day);
      expect(new Set(days).size).toBe(days.length);
    }
  });
  test("every send window sits inside 09:00-21:00 IST", () => {
    for (const s of [11, 12, 3].flatMap(m => slotsForMonth(2026, m, { tripPerMonth: 3 }))) {
      expect(hourIST(s.at)).toBeGreaterThanOrEqual(9);
      expect(hourIST(new Date(s.until.getTime() - 1))).toBeLessThan(21);
    }
  });
  test("a slot is due only inside its window", () => {
    expect(dueSlots(new Date("2026-12-01T04:29:00Z"))).toEqual([]); // 09:59 IST
    expect(dueSlots(new Date("2026-12-01T04:31:00Z")).map(s => s.key)).toEqual(["monthly:2026-12"]);
    expect(dueSlots(new Date("2026-12-01T10:31:00Z"))).toEqual([]); // 16:01 IST, window closed
    const sunday = weekendDay(2026, 11);
    expect(dueSlots(istTime(2026, 11, sunday, 13)).map(s => s.key)).toEqual(["weekend:2026-11"]);
  });
  test("upcoming lists the next sends in order", () => {
    const next = upcomingSlots(new Date("2026-11-04T00:00:00Z"), 3);
    expect(next.map(s => s.key)).toEqual(["trip:2026-11:1", "weekend:2026-11", "trip:2026-11:2"]);
    expect(next[0].at.toISOString()).toBe("2026-11-06T14:00:00.000Z"); // Fri 6 Nov, 19:30 IST
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
    expect(RULES).toMatchObject({ tripPerMonth: 2, perDay: 1, per30Days: 5, requireOptIn: false, androidChannel: "alerts" });
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
      expect((`${msg.title} ${msg.body}`.match(/\p{Extended_Pictographic}/gu) || []).length).toBeLessThanOrEqual(1);
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
