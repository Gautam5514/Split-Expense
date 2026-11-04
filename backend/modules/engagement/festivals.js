import { regionFor } from "./destinations.js";

/*
 * The festival calendar. Every entry is a moment when people in India spend together:
 * a party, a family dinner, gifts bought with siblings, a trip over a long weekend.
 * The message is always "greeting + one thing to do in SplitEase", never a bare greeting.
 *
 * Dates:
 *  - FIXED: the same every year (national days, Christmas, New Year).
 *  - NTH_SUNDAY: Mother's Day, Father's Day, Friendship Day.
 *  - DATED: lunar festivals, looked up per year. A date ending in "~" is an estimate
 *    (moon sighting or a panchang that shifts a day); it is NOT scheduled until the
 *    admin confirms it on Admin → Notifications, so nobody gets "Happy Eid" a day early.
 *    Add a year by adding a block below; the admin page warns when a year runs out.
 *
 * Scope: `states` limits a regional festival to people whose profile says they live
 * there (profile city/state only, never GPS). Pan-Indian festivals go to everyone.
 */

const NORTH = ["punjab", "haryana", "delhi", "nct of delhi", "chandigarh", "himachal pradesh", "uttarakhand", "jammu and kashmir", "ladakh"];
const EAST = ["west bengal", "odisha", "orissa", "assam", "tripura", "bihar", "jharkhand"];
const SOUTH_DECCAN = ["karnataka", "andhra pradesh", "telangana"];
const WEST = ["maharashtra", "goa", "gujarat"];
const BIHAR_BELT = ["bihar", "jharkhand", "uttar pradesh", "delhi", "nct of delhi"];
const GARBA = ["gujarat", "maharashtra", "rajasthan", "madhya pradesh"];

// 2026 dates come from several published calendars (Holi 4 Mar, Eid 21 Mar, Raksha Bandhan 28 Aug,
// Ganesh Chaturthi 14 Sep, Navratri 11 Oct, Dussehra 20 Oct, Diwali 8 Nov). 2027: Holi 22 Mar,
// Raksha Bandhan 17 Aug, Ganesh Chaturthi 4 Sep, Dussehra 9 Oct, Diwali 29 Oct, Eid al-Adha 17 May.
const DATED = {
  2026: {
    lohri: "01-13", sankranti: "01-14", holi: "03-04", ugadi: "03-19", eid: "03-21", bakrid: "05-27",
    onam: "08-26", rakhi: "08-28", ganesh: "09-14", navratri: "10-11", durgapuja: "10-18", dussehra: "10-20",
    diwali: "11-08", bhaidooj: "11-10", chhath: "11-15", gurunanak: "11-24",
  },
  2027: {
    lohri: "01-13", sankranti: "01-15", holi: "03-22", ugadi: "04-07~", eid: "03-10~", bakrid: "05-17~",
    onam: "09-12~", rakhi: "08-17", ganesh: "09-04", navratri: "09-30", durgapuja: "10-07", dussehra: "10-09",
    diwali: "10-29", bhaidooj: "10-31", chhath: "11-04~", gurunanak: "11-14~",
  },
};
export const DATED_YEARS = Object.keys(DATED).map(Number);

const FIXED = { newyear: "01-01", republic: "01-26", valentine: "02-14", baisakhi: "04-14", independence: "08-15", gandhi: "10-02", christmas: "12-25", nye: "12-31" };
// [month, which Sunday]
const NTH_SUNDAY = { mothers: [5, 2], fathers: [6, 3], friendship: [8, 1] };

const DAY = { hour: 10, minute: 0, window: 4 * 60 };
const EVE = { hour: 18, minute: 30, window: 150 };
const g = (c, fallback) => (c.group ? c.group : fallback); // the group to talk about, or a generic word

/*
 * `lines`: variants, spread evenly across people. `c` = { name, group, year }.
 * Rules: title ≤ 40, body ≤ 110, one emoji at most, one action, English and Hinglish.
 * `draft`: what Autopilot opens with. `holiday`: a day off, so it can make a long weekend.
 */
export const FESTIVALS = {
  // ---- January ----
  newyear: {
    name: "New Year", emoji: "🎆", time: { hour: 11, minute: 0, window: 4 * 60 }, holiday: true,
    draft: () => "Show my overall balance",
    cta: "Start the year clean",
    lines: [
      { id: "ny1", title: (c) => `Happy New Year${c.name ? `, ${c.name}` : ""}`, body: (c) => `New year, clean slate. Settle last night's party${c.group ? ` in ${c.group}` : ""} and start ${c.year} at zero.` },
      { id: "ny2", title: (c) => `${c.year} starts at zero?`, body: () => "Check who still owes what from last year and clear it today. Takes a minute." },
      { id: "ny3", title: () => "Naya saal, saaf hisaab", body: (c) => `Kal ki party ka hisaab abhi nipta lo${c.group ? ` ${c.group} mein` : ""}. ${c.year} shuru karo zero se.` },
    ],
  },
  lohri: {
    name: "Lohri", emoji: "🔥", time: EVE, states: NORTH, draft: () => "Lohri bonfire snacks paid by me, split equally", cta: "Split the bonfire bill",
    lines: [
      { id: "lo1", title: () => "Happy Lohri", body: (c) => `Rewri, popcorn and the bonfire crowd. One person pays, SplitEase splits it${c.group ? ` in ${c.group}` : ""}.` },
      { id: "lo2", title: () => "Lohri di lakh lakh vadhaiyan", body: () => "Bonfire ke snacks ka bill ek line mein add karo. Sabka hissa turant ready." },
    ],
  },
  sankranti: {
    name: "Makar Sankranti & Pongal", emoji: "🪁", time: DAY, draft: () => "Sankranti lunch paid by me, split equally", cta: "Add the day's bill",
    lines: [
      { id: "sk1", title: () => "Happy Sankranti", body: (c) => `Kites, til-gud, a big lunch. Add what you paid${c.group ? ` in ${c.group}` : ""} and let SplitEase do the maths.` },
      { id: "sk2", title: () => "Happy Pongal", body: () => "Feast with the whole crowd today? One person pays, everyone sees their share." },
      { id: "sk3", title: () => "Til-gud lo, hisaab SplitEase ka", body: (c) => `Aaj ki patang aur lunch ka kharcha ${c.group ? `${c.group} mein` : "ek line mein"} add karo. Baaki hum sambhal lenge.` },
    ],
  },
  republic: {
    name: "Republic Day", emoji: "🇮🇳", time: DAY, holiday: true, draft: () => "Create group Long weekend trip, budget 15000", cta: "Plan the day off",
    lines: [
      { id: "rd1", title: () => "Happy Republic Day", body: () => "A day off with friends? Make the plan, one person pays, SplitEase keeps the account." },
      { id: "rd2", title: () => "Chhutti hai, plan kya hai?", body: (c) => `Picnic, movie ya short trip: ${g(c, "group")} ka bill ek jagah, hisaab barabar.` },
    ],
  },
  // ---- February / March ----
  valentine: {
    name: "Valentine's Day", emoji: "💝", time: DAY, draft: () => "Dinner paid by me, split equally", cta: "Split the dinner",
    lines: [
      { id: "va1", title: () => "Dinner plans tonight?", body: () => "Date night or the single friends' dinner: one card pays, SplitEase splits it without the awkward bit." },
      { id: "va2", title: () => "Aaj ka dinner kaun bhar raha hai?", body: () => "Jo bhi bhare, hisaab SplitEase rakhega. Ek line mein bill add karo." },
    ],
  },
  holi: {
    name: "Holi", emoji: "🎨", time: DAY, eve: { name: "Holika Dahan", ...EVE }, holiday: true,
    draft: () => "Holi party paid by me, split equally", cta: "Split the Holi party",
    lines: [
      { id: "ho1", title: (c) => `Happy Holi${c.name ? `, ${c.name}` : ""}`, body: (c) => `Colours, thandai, the party playlist. Add today's bill${c.group ? ` in ${c.group}` : ""} before the colour washes off.` },
      { id: "ho2", title: () => "Bura na mano, hisaab hai", body: () => "Gulal, sweets aur party ka kharcha ek line mein add karo. Sabka hissa SplitEase batayega." },
      { id: "ho3", title: () => "Holi party sorted?", body: (c) => `Whoever buys the colours and snacks, log it in ${g(c, "the group")} and everyone knows their share.` },
    ],
    eveLines: [
      { id: "hoe1", title: () => "Holi is tomorrow", body: (c) => `Colours, snacks and thandai: make the list in ${g(c, "a group")} tonight so tomorrow is just fun.` },
      { id: "hoe2", title: () => "Kal Holi hai, plan ready?", body: () => "Gulal aur snacks ki shopping ka hisaab aaj hi set kar lo. Kal sirf masti." },
    ],
  },
  ugadi: {
    name: "Ugadi & Gudi Padwa", emoji: "🌼", time: DAY, states: [...SOUTH_DECCAN, "maharashtra"], draft: () => "Festival lunch paid by me, split equally", cta: "Add the lunch",
    lines: [
      { id: "ug1", title: () => "Happy Ugadi", body: () => "New year, big lunch. Add what you paid and SplitEase splits it with the family and friends who came." },
      { id: "ug2", title: () => "Gudi Padwa chya shubhechha", body: (c) => `Puran poli aur lunch ka kharcha ${c.group ? `${c.group} mein` : "ek line mein"} add karo. Hisaab barabar.` },
    ],
  },
  eid: {
    name: "Eid ul-Fitr", emoji: "🌙", time: DAY, holiday: true, draft: () => "Eid dinner paid by me, split equally", cta: "Split the feast",
    lines: [
      { id: "ei1", title: (c) => `Eid Mubarak${c.name ? `, ${c.name}` : ""}`, body: (c) => `Biryani, sheer khurma, a full house. Add the feast${c.group ? ` in ${c.group}` : ""} and everyone sees their share.` },
      { id: "ei2", title: () => "Eid Mubarak", body: () => "Dawat ka kharcha ek bande pe kyun? Bill ek line mein add karo, hisaab SplitEase rakhega." },
    ],
  },
  // ---- April / May / June ----
  baisakhi: {
    name: "Baisakhi, Vishu & Bihu", emoji: "🌾", time: DAY, draft: () => "Festival lunch paid by me, split equally", cta: "Add the lunch",
    lines: [
      { id: "ba1", title: () => "Happy Baisakhi", body: () => "Harvest day, big meal, bigger crowd. One person pays, SplitEase splits it fairly." },
      { id: "ba2", title: () => "Vishu & Bihu wishes", body: (c) => `Sadya or a Bihu feast with friends? Log it in ${g(c, "the group")} and nobody chases anyone later.` },
    ],
  },
  mothers: {
    name: "Mother's Day", emoji: "💐", time: { hour: 9, minute: 30, window: 4 * 60 }, draft: () => "Create group Gift for Mom", cta: "Split Mom's gift",
    lines: [
      { id: "mo1", title: () => "Gift for Mom, split with siblings?", body: () => "Make a group with your brother or sister, add the gift and the lunch, done. No one keeps score." },
      { id: "mo2", title: () => "Happy Mother's Day", body: () => "Mummy ka gift bhai-behen ke saath split karo. Group banao, amount add karo, hisaab SplitEase ka." },
    ],
  },
  bakrid: {
    name: "Eid al-Adha", emoji: "🌙", time: DAY, holiday: true, draft: () => "Eid dinner paid by me, split equally", cta: "Split the feast",
    lines: [
      { id: "bk1", title: () => "Eid Mubarak", body: (c) => `Family dinner or the friends' dawat? Add it${c.group ? ` in ${c.group}` : ""} and SplitEase works out everyone's share.` },
      { id: "bk2", title: () => "Bakrid Mubarak", body: () => "Dawat ka hisaab ek line mein. Jo bhi bhare, sabka hissa saaf dikhega." },
    ],
  },
  fathers: {
    name: "Father's Day", emoji: "👔", time: { hour: 9, minute: 30, window: 4 * 60 }, draft: () => "Create group Gift for Dad", cta: "Split Dad's gift",
    lines: [
      { id: "fa1", title: () => "Gift for Dad, split with siblings?", body: () => "One group for the gift and the dinner. Everyone chips in, nobody has to ask." },
      { id: "fa2", title: () => "Happy Father's Day", body: () => "Papa ka gift bhai-behen mein split karo. Group banao, kharcha add karo, baaki SplitEase." },
    ],
  },
  // ---- August / September ----
  friendship: {
    name: "Friendship Day", emoji: "🤝", time: { hour: 11, minute: 0, window: 4 * 60 }, draft: () => "Friendship day lunch paid by me, split equally", cta: "Split today's plan",
    lines: [
      { id: "fr1", title: (c) => (c.group ? `${c.group}: Happy Friendship Day` : "Happy Friendship Day"), body: () => "Friends who split bills fairly stay friends. Add today's plan and keep it that way." },
      { id: "fr2", title: () => "Dost wahi jo hisaab saaf rakhe", body: (c) => `Aaj ka plan ${c.group ? `${c.group} mein` : "ek line mein"} add karo. Kharcha split, dosti nahi.` },
      { id: "fr3", title: () => "Who still owes you from last time?", body: () => "Friendship Day is a good day to clear it with a smile. Check balances, settle up." },
    ],
  },
  independence: {
    name: "Independence Day", emoji: "🇮🇳", time: DAY, holiday: true, draft: () => "Create group Long weekend trip, budget 15000", cta: "Plan the day off",
    lines: [
      { id: "in1", title: () => "Happy Independence Day", body: () => "Freedom from chasing friends for money too. Add the day's plan, SplitEase keeps the account." },
      { id: "in2", title: () => "Chhutti ka plan?", body: (c) => `Trip ya ghar pe party: ${g(c, "group")} ka kharcha ek jagah, hisaab barabar.` },
    ],
  },
  onam: {
    name: "Onam", emoji: "🌸", time: DAY, states: ["kerala"], holiday: true, draft: () => "Onam sadya paid by me, split equally", cta: "Split the sadya",
    lines: [
      { id: "on1", title: () => "Happy Onam", body: (c) => `Sadya with the whole gang? Add it${c.group ? ` in ${c.group}` : ""} and everyone knows their share before the payasam.` },
      { id: "on2", title: () => "Onashamsakal", body: () => "Pookalam, sadya, new clothes. Whatever you paid for the group, log it once and relax." },
    ],
  },
  rakhi: {
    name: "Raksha Bandhan", emoji: "🎀", time: DAY, draft: () => "Create group Rakhi gifts", cta: "Split the gifts",
    lines: [
      { id: "rk1", title: () => "Happy Raksha Bandhan", body: () => "Gifts and sweets for the whole family? Split them with your siblings in one group. No awkward maths." },
      { id: "rk2", title: () => "Rakhi ka gift split kiya?", body: () => "Bhai-behen mil ke gift le rahe ho? Group banao, amount add karo, hisaab SplitEase rakhega." },
    ],
  },
  ganesh: {
    name: "Ganesh Chaturthi", emoji: "🐘", time: DAY, states: [...WEST, ...SOUTH_DECCAN], holiday: true, draft: () => "Ganpati decoration paid by me, split equally", cta: "Split the pandal costs",
    lines: [
      { id: "ga1", title: () => "Ganpati Bappa Morya", body: (c) => `Decoration, prasad, modak orders. Add them${c.group ? ` in ${c.group}` : ""} and the society or flat splits it fairly.` },
      { id: "ga2", title: () => "Bappa aa gaye", body: () => "Pandal ka kharcha ek bande pe kyun? Har bill ek line mein add karo, sabka hissa saaf." },
    ],
  },
  // ---- October ----
  gandhi: {
    name: "Gandhi Jayanti", emoji: "🇮🇳", time: DAY, holiday: true, draft: () => "Create group Long weekend trip, budget 15000", cta: "Plan the day off",
    lines: [
      { id: "gj1", title: () => "Day off today", body: () => "Short trip or a long lunch? Make the plan, one person pays, SplitEase keeps everyone square." },
    ],
  },
  navratri: {
    name: "Navratri", emoji: "🪔", time: EVE, draft: () => "Garba night tickets paid by me, split equally", cta: "Split garba nights",
    lines: [
      { id: "nv1", title: () => "Navratri starts tonight", body: (c) => `Nine nights of garba, passes and late dinners. Log each one${c.group ? ` in ${c.group}` : ""} so nobody loses track.` },
      { id: "nv2", title: () => "Garba nights shuru", body: () => "Pass, dandiya, dinner: har raat ka kharcha ek line mein. Hisaab SplitEase ka." },
    ],
  },
  durgapuja: {
    name: "Durga Puja", emoji: "🌺", time: EVE, states: EAST, draft: () => "Pandal hopping dinner paid by me, split equally", cta: "Split pandal hopping",
    lines: [
      { id: "dp1", title: () => "Shubho Ashtami", body: (c) => `Pandal hopping, bhog, dinner at 1 am. Add tonight's bill${c.group ? ` in ${c.group}` : ""} and everyone sees their share.` },
      { id: "dp2", title: () => "Pujo plans tonight?", body: () => "One person pays for the cab and the rolls, SplitEase splits it. Enjoy the pandals." },
    ],
  },
  dussehra: {
    name: "Dussehra", emoji: "🏹", time: DAY, holiday: true, draft: () => "Dussehra mela snacks paid by me, split equally", cta: "Split the mela bill",
    lines: [
      { id: "du1", title: () => "Happy Dussehra", body: () => "Mela, Ravan dahan, dinner after. One person pays, SplitEase splits it without the end-of-night maths." },
      { id: "du2", title: () => "Dussehra ki shubhkamnayein", body: (c) => `Aaj ka plan ${g(c, "group")} ke saath? Bill ek line mein add karo, hissa sabka saaf.` },
    ],
  },
  // ---- Diwali week ----
  diwali: {
    name: "Diwali", emoji: "🪔", time: DAY, eve: { name: "Diwali eve", ...EVE }, holiday: true,
    draft: () => "Diwali party paid by me, split equally", cta: "Split the Diwali party",
    lines: [
      { id: "dw1", title: (c) => `Happy Diwali${c.name ? `, ${c.name}` : ""}`, body: (c) => `Sweets, diyas, the card party. Add tonight's bill${c.group ? ` in ${c.group}` : ""} and let SplitEase split it.` },
      { id: "dw2", title: () => "Shubh Deepavali", body: () => "Mithai, patakhe aur taash party ka hisaab ek line mein. Sab ka hissa SplitEase batayega." },
      { id: "dw3", title: (c) => (c.group ? `${c.group} ki Diwali party?` : "Diwali party tonight?"), body: () => "One person pays for the food and the crackers, everyone else sees exactly what they owe. Add it now." },
      { id: "dw4", title: () => "Happy Diwali", body: () => "New year for the books too: clear last month's balances and start the festive week at zero." },
    ],
    eveLines: [
      { id: "dwe1", title: () => "Diwali is tomorrow", body: (c) => `Sweets, decorations, the party order: list them in ${g(c, "a group")} tonight and split as you go.` },
      { id: "dwe2", title: () => "Kal Diwali hai", body: () => "Decoration aur mithai ki shopping ka hisaab aaj set kar lo. Kal sirf celebration." },
    ],
  },
  bhaidooj: {
    name: "Bhai Dooj", emoji: "🎁", time: DAY, draft: () => "Create group Bhai Dooj gifts", cta: "Split the gifts",
    lines: [
      { id: "bd1", title: () => "Happy Bhai Dooj", body: () => "Buying gifts for the cousins together? One group for all the siblings, SplitEase keeps it fair." },
      { id: "bd2", title: () => "Bhai Dooj ka gift split karo", body: () => "Saare bhai-behen ka ek group, gift ka amount add karo, hisaab barabar." },
    ],
  },
  chhath: {
    name: "Chhath Puja", emoji: "🌅", time: EVE, states: BIHAR_BELT, draft: () => "Chhath puja items paid by me, split equally", cta: "Split the puja costs",
    lines: [
      { id: "ch1", title: () => "Chhath Puja ki shubhkamnayein", body: () => "Soop, fruits, thekua ka saman: jo bhi laaye, ek line mein add karo. Ghar ka hisaab saaf." },
      { id: "ch2", title: () => "Happy Chhath", body: (c) => `Puja shopping done by one person? Log it${c.group ? ` in ${c.group}` : ""} and everyone chips in fairly.` },
    ],
  },
  gurunanak: {
    name: "Guru Nanak Jayanti", emoji: "🙏", time: DAY, states: NORTH, holiday: true, draft: () => "Langar contribution paid by me, split equally", cta: "Split the contribution",
    lines: [
      { id: "gn1", title: () => "Happy Gurpurab", body: () => "Langar seva or a family lunch with friends? Add what you paid and SplitEase splits it." },
    ],
  },
  // ---- December ----
  christmas: {
    name: "Christmas", emoji: "🎄", time: DAY, eve: { name: "Christmas eve", hour: 17, minute: 30, window: 150 }, holiday: true,
    draft: () => "Create group Secret Santa, budget 500", cta: "Split the Christmas plan",
    lines: [
      { id: "xm1", title: (c) => `Merry Christmas${c.name ? `, ${c.name}` : ""}`, body: () => "Cake, dinner, Secret Santa. One person pays, SplitEase splits it. Enjoy the day." },
      { id: "xm2", title: () => "Merry Christmas", body: (c) => `Party ka kharcha ${c.group ? `${c.group} mein` : "ek line mein"} add karo. Hisaab SplitEase rakhega, aap enjoy karo.` },
    ],
    eveLines: [
      { id: "xme1", title: () => "Secret Santa budget set?", body: () => "Make the group, set a budget, add the dinner tomorrow. Everyone sees their share, nobody overspends." },
      { id: "xme2", title: () => "Kal Christmas hai", body: () => "Cake, dinner, gifts: plan aaj banao, kharcha kal ek line mein add karo." },
    ],
  },
  nye: {
    name: "New Year's Eve", emoji: "🥂", time: { hour: 17, minute: 0, window: 3 * 60 }, draft: () => "Create group New Year party, budget 10000", cta: "Split the party",
    lines: [
      { id: "ne1", title: () => "Tonight's party: who's paying?", body: (c) => `Whoever pays, add it${c.group ? ` in ${c.group}` : ""} and everyone wakes up knowing their share. Happy new year.` },
      { id: "ne2", title: () => "Party kahan hai aaj?", body: () => "Booking, cab, cake: ek line mein add karo. Naye saal ki pehli subah bina hisaab ke tension." },
      { id: "ne3", title: (c) => (c.name ? `${c.name}, last bill of the year` : "Last bill of the year"), body: () => "Add tonight's plan and close the year with everyone square. Happy new year from SplitEase." },
    ],
  },
};
export const FESTIVAL_IDS = Object.keys(FESTIVALS);

// Image per festival; anything without its own banner uses the generic one.
const IMAGES = { diwali: "diwali.png", holi: "holi.png", christmas: "christmas.png", nye: "newyear.png", newyear: "newyear.png", eid: "eid.png", bakrid: "eid.png", republic: "national.png", independence: "national.png", gandhi: "national.png" };
export const festivalImage = (id) => IMAGES[id] || "festival.png";

const nthSunday = (year, month, n) => {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
};
const parse = (s) => ({ month: Number(s.slice(0, 2)), day: Number(s.slice(3, 5)), approx: s.endsWith("~") });

/*
 * Every festival of a year, with its date and whether the date is confirmed.
 * `overrides`: { "<id>:<year>": "MM-DD" } confirmed by the admin (stored in the DB).
 */
export function festivalsOfYear(year, overrides = {}) {
  const out = [];
  const add = (id, month, day, approx) => out.push({ id, year, month, day, approx, ...FESTIVALS[id] });
  for (const [id, s] of Object.entries(FIXED)) { const p = parse(s); add(id, p.month, p.day, false); }
  for (const [id, [month, n]] of Object.entries(NTH_SUNDAY)) add(id, month, nthSunday(year, month, n), false);
  for (const [id, s] of Object.entries(DATED[year] || {})) {
    const o = overrides[`${id}:${year}`];
    const p = parse(o || s);
    add(id, p.month, p.day, o ? false : p.approx);
  }
  return out.sort((a, b) => a.month - b.month || a.day - b.day);
}

// Festivals the calendar has no confirmed date for yet (what the admin page asks about).
export function unconfirmed(year, overrides = {}) {
  return festivalsOfYear(year, overrides).filter(f => f.approx).map(f => ({ id: f.id, name: f.name, year, estimate: `${year}-${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}` }));
}

// Regional festivals reach people whose profile places them in the region; pan-Indian ones reach everyone.
export function inScope(festival, profile) {
  if (!festival?.states) return true;
  const state = String(profile?.state || "").trim().toLowerCase();
  if (state && festival.states.includes(state)) return true;
  const region = regionFor(profile || {});
  return region.states?.some(s => festival.states.includes(s)) || false;
}
