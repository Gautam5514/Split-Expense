// Keyword landing pages served at /solutions/[slug]. One entry per search
// intent ("split bill app", "roommate expense splitter", ...). Each page gets
// its own title, description, FAQ schema, free calculator and internal links,
// and is listed in sitemap.js. Keep claims to what the product really does.

export const SEO_LAST_UPDATED = "2026-11-11";

export const SEO_PAGES = [
  {
    slug: "split-bill-app",
    h1: "The free split bill app for friends, trips and flats",
    metaTitle: "Split Bill App: Free Bill Splitting for Groups | SplitEase",
    description:
      "SplitEase is a free split bill app. Add a bill, choose who shares it, and see exactly who owes whom. Scan receipts, split equally or by amount, and settle up in fewer payments.",
    keywords: ["split bill app", "bill splitting app", "split bills with friends", "free bill splitter app", "SplitEase"],
    eyebrow: "Split bill app",
    intro: [
      "Splitting a bill should take ten seconds, not a group chat argument. SplitEase keeps every shared bill in one group, works out each person's share, and always shows who owes whom.",
      "It is free to use, works in the browser and on your phone, and there is no paywall on splitting or settling.",
    ],
    benefits: [
      { t: "Four ways to split", d: "Split equally, by exact amount, by percentage or by shares, so a bill is fair even when people ordered differently." },
      { t: "Scan the receipt", d: "Snap a photo and the items are read for you, so you are not typing a long bill into a form." },
      { t: "Always up to date", d: "Everyone in the group sees the same balances as soon as a bill is added." },
      { t: "Fewer payments", d: "Smart settlement cancels out money that would just go in circles, so the group pays back in as few transfers as possible." },
    ],
    steps: [
      ["Create a group", "Name it and invite people with a link or QR code."],
      ["Add the bill", "Enter the amount, pick who shared it and how to split it."],
      ["Settle up", "See the simplified list of who pays whom and mark payments as done."],
    ],
    faqs: [
      { q: "What is the best free app to split a bill?", a: "SplitEase lets you split bills with friends for free: unequal splits, receipt scanning, group balances and settle-up are all included without a paywall." },
      { q: "Can I split a bill unequally?", a: "Yes. You can split equally, by exact amounts, by percentage or by shares, and choose exactly which people are part of each bill." },
      { q: "Do my friends need to install the app?", a: "No. SplitEase works in the browser, and people can join a group from an invite link." },
      { q: "How does SplitEase decide who pays whom?", a: "It adds up what each person paid and owes across the group, then reduces the result to the smallest practical set of payments." },
    ],
    blog: ["ways-to-split-a-bill-equally-percentages-shares", "how-to-settle-group-debts-smartly"],
    related: ["bill-splitter", "split-bill-calculator", "split-expenses-with-friends"],
  },
  {
    slug: "bill-splitter",
    h1: "A bill splitter that remembers who owes what",
    metaTitle: "Bill Splitter: Split Any Bill Fairly and Settle Up | SplitEase",
    description:
      "Use SplitEase as your bill splitter. Divide any bill between people, keep a running balance, and settle up without awkward maths. Free on web and mobile.",
    keywords: ["bill splitter", "online bill splitter", "bill split tool", "divide a bill", "split the bill"],
    eyebrow: "Bill splitter",
    intro: [
      "A one-off calculator tells you the share for tonight. SplitEase goes further: it remembers the bill, the people and the balance, so the next dinner, cab or grocery run just adds to the same group.",
      "Try the free calculator below, then keep the result in a group when you want the money actually tracked.",
    ],
    benefits: [
      { t: "More than a calculator", d: "Bills are saved in a group, so nothing lives in someone's memory or a screenshot." },
      { t: "Tip and tax aware", d: "Add a tip or tax and the split already includes it." },
      { t: "Fair for everyone", d: "Leave out the person who skipped dessert, or give someone a bigger share." },
      { t: "Settle in one place", d: "Mark a payment as paid and the balances update for the whole group." },
    ],
    steps: [
      ["Enter the bill", "Total, who is sharing, and any tip or tax."],
      ["Pick the split", "Equal, exact amounts, percentages or shares."],
      ["Save to a group", "Keep the balance so you never chase a payment from memory."],
    ],
    faqs: [
      { q: "How do I split a bill between people?", a: "Divide the total, including tip and tax, by the number of people sharing it. For unequal bills, use exact amounts, percentages or shares instead. SplitEase does this and remembers the result." },
      { q: "Is the bill splitter free?", a: "Yes. Splitting bills and settling up in SplitEase is free." },
      { q: "Can I use it without signing up?", a: "The calculator on this page works without an account. Create a free account when you want to save bills and track balances." },
    ],
    blog: ["how-to-split-a-restaurant-bill-fairly"],
    related: ["split-bill-app", "split-restaurant-bill", "split-bill-calculator"],
  },
  {
    slug: "split-bill-calculator",
    h1: "Split bill calculator with tip and tax",
    metaTitle: "Split Bill Calculator with Tip & Tax (Free) | SplitEase",
    description:
      "Free split bill calculator. Enter the total, number of people, tip and tax to see each person's share instantly, then save it to a SplitEase group to track who has paid.",
    keywords: ["split bill calculator", "bill split calculator", "tip calculator split", "split check calculator", "dinner bill calculator"],
    eyebrow: "Split bill calculator",
    intro: [
      "Type the bill, add the number of people and an optional tip or tax. You get each person's share straight away, with no sign-up.",
      "When the bill is part of a bigger shared budget, move it into a SplitEase group and the balances take care of themselves.",
    ],
    benefits: [
      { t: "Instant result", d: "Per-person share updates as you type." },
      { t: "Tip and tax included", d: "Add either as a percentage and see the new total." },
      { t: "Keep going in a group", d: "Turn a one-off split into a tracked group in a couple of taps." },
    ],
    steps: [
      ["Enter the total", "Use the amount on the bill."],
      ["Set people, tip and tax", "Change them and watch the share update."],
      ["Track it", "Save it in SplitEase to see who has paid you back."],
    ],
    faqs: [
      { q: "How do you calculate each person's share of a bill?", a: "Add tip and tax to the subtotal to get the final total, then divide by the number of people. For example, 3000 with a 10% tip between 4 people is 825 each." },
      { q: "Should tip be split before or after tax?", a: "Customs differ. Many people tip on the pre-tax subtotal; either way, add both to the total before dividing. The calculator lets you set each one." },
    ],
    blog: ["ways-to-split-a-bill-equally-percentages-shares"],
    related: ["bill-splitter", "split-restaurant-bill", "split-bill-app"],
  },
  {
    slug: "split-expenses-with-friends",
    h1: "Split expenses with friends without the awkwardness",
    metaTitle: "Split Expenses With Friends: Free App to Track Who Owes Who | SplitEase",
    description:
      "Split expenses with friends the easy way. SplitEase tracks every shared cost, shows who owes whom and helps everyone settle up, free on web and mobile.",
    keywords: ["split expenses with friends", "share expenses with friends", "who owes who app", "track shared expenses", "friends expense tracker"],
    eyebrow: "Split expenses with friends",
    intro: [
      "Money between friends gets uncomfortable when nobody is tracking it. SplitEase makes the tracking neutral: one shared record, visible to everyone, with no one playing the debt collector.",
      "Add expenses as they happen and settle whenever the group is ready.",
    ],
    benefits: [
      { t: "One shared record", d: "Everyone sees the same bills and the same balances." },
      { t: "Reminders, not nagging", d: "Settle-up requests keep the follow-up in the app instead of on you." },
      { t: "Group chat built in", d: "Talk about a bill next to the bill itself." },
      { t: "Invite by link or QR", d: "Friends join in seconds, no account hunting." },
    ],
    steps: [
      ["Make a group", "A weekend, a flat, a friend circle."],
      ["Add expenses as you go", "Whoever paid logs it and picks who shares it."],
      ["Settle when ready", "Pay the simplified amounts and mark them done."],
    ],
    faqs: [
      { q: "What is the easiest way to split expenses with friends?", a: "Put every shared cost into one group app, so balances are calculated for you. SplitEase does that and shows the fewest payments needed to even out." },
      { q: "How do I ask a friend to pay me back?", a: "Use the settle-up flow in the group. The request lives in the app, so you do not have to message about it." },
      { q: "What if someone does not use the app?", a: "They can open an invite link in the browser, and you can still record bills involving them." },
    ],
    blog: ["how-to-split-expenses-with-friends"],
    related: ["group-expense-tracker", "trip-expense-splitter", "split-bill-app"],
  },
  {
    slug: "split-restaurant-bill",
    h1: "Split a restaurant bill fairly, item by item or equally",
    metaTitle: "Split a Restaurant Bill: Fair Methods + Free Tool | SplitEase",
    description:
      "How to split a restaurant bill fairly: equally, by items, by percentage or by shares. Scan the receipt with SplitEase and settle up in seconds.",
    keywords: ["split restaurant bill", "split dinner bill", "split the check", "restaurant bill splitter", "split bill by item"],
    eyebrow: "Restaurant bills",
    intro: [
      "Equal splits are fine when everyone ordered the same. When they did not, split by what people actually had, and share tax and tip proportionally.",
      "SplitEase can read the receipt for you, so assigning items takes seconds instead of a calculator and an argument.",
    ],
    benefits: [
      { t: "Receipt scanning", d: "Photograph the bill and the line items are filled in." },
      { t: "Fair by item", d: "Assign dishes to the people who had them and share the rest." },
      { t: "Tip and tax shared fairly", d: "Add them to the total so each share is the real amount." },
    ],
    steps: [
      ["Scan or enter the bill", "Total plus items if you want an exact split."],
      ["Choose the split", "Equal, by item amount, percentage or shares."],
      ["Settle up", "Whoever paid gets paid back, and the group sees it."],
    ],
    faqs: [
      { q: "What is the fairest way to split a restaurant bill?", a: "If orders were similar, split equally. If they differed a lot, split by item and share tax and tip in proportion to what each person ordered." },
      { q: "Can I scan a receipt to split it?", a: "Yes. SplitEase reads a photo of the receipt so you can fill in the bill faster." },
    ],
    blog: ["how-to-split-a-restaurant-bill-fairly"],
    related: ["split-bill-calculator", "bill-splitter", "split-bill-app"],
  },
  {
    slug: "roommate-expense-splitter",
    h1: "Roommate expense splitter for rent, wifi and groceries",
    metaTitle: "Roommate Expense Splitter: Rent, Utilities & Groceries | SplitEase",
    description:
      "Split rent, utilities and groceries with roommates. SplitEase keeps a shared ledger, handles recurring bills and shows exactly who owes what each month.",
    keywords: ["roommate expense splitter", "split expenses with roommates", "flatmate expense tracker", "roommate bill splitter", "split rent app"],
    eyebrow: "Roommates and flatmates",
    intro: [
      "Shared homes run on small, repeated costs: rent, electricity, wifi, groceries. SplitEase keeps them in one group so the month ends with a number, not a debate.",
      "Set recurring bills once and they are added on schedule.",
    ],
    benefits: [
      { t: "Recurring bills", d: "Rent and subscriptions repeat on their own." },
      { t: "Unequal rooms, fair rent", d: "Split by percentage or shares when rooms differ in size." },
      { t: "Clear monthly balance", d: "See who is ahead and who owes before anyone moves out." },
      { t: "Monthly statement", d: "Export a clean report of what was spent and who paid." },
    ],
    steps: [
      ["Create the flat group", "Invite everyone who lives there."],
      ["Add recurring bills", "Rent, wifi and utilities at the right split."],
      ["Log groceries as they happen", "Settle monthly or when someone moves out."],
    ],
    faqs: [
      { q: "How should roommates split rent?", a: "Equally if rooms are similar. If they differ, split by percentage or shares based on room size and amenities, and keep the rule written in the group." },
      { q: "Can SplitEase handle monthly bills automatically?", a: "Yes. Recurring bills are added on schedule, so the group does not have to re-enter them." },
    ],
    blog: ["best-way-to-split-rent-with-roommates", "why-students-flatmates-and-trip-planners-must-use-splitease"],
    related: ["split-rent-and-utilities", "group-expense-tracker", "split-expenses-with-friends"],
  },
  {
    slug: "split-rent-and-utilities",
    h1: "Split rent and utility bills the fair way",
    metaTitle: "Split Rent and Utility Bills Fairly | SplitEase",
    description:
      "Split rent, electricity, water and internet fairly with SplitEase. Use equal, percentage or share-based splits, automate recurring bills and always see who has paid.",
    keywords: ["split rent", "split utility bills", "split electricity bill", "rent splitter", "split household bills"],
    eyebrow: "Rent and utilities",
    intro: [
      "Household bills are predictable, which is exactly why they should not be manual. Set the split once and SplitEase applies it every month.",
      "Whoever pays the landlord or the provider logs it, and everyone else sees their share immediately.",
    ],
    benefits: [
      { t: "Set it once", d: "Recurring bills keep the same split every cycle." },
      { t: "Percent or share splits", d: "Reflect different room sizes or usage." },
      { t: "Paid and pending", d: "See which bills are settled and which are not." },
    ],
    steps: [
      ["Add the bill", "Amount, payer and due date."],
      ["Choose the split rule", "Equal, percentage or shares."],
      ["Settle", "Pay your share and mark it done."],
    ],
    faqs: [
      { q: "How do you split utility bills between roommates?", a: "Divide each bill by the number of people, or weight the split if usage differs. Track it in a shared group so everyone can see what was paid." },
    ],
    blog: ["best-way-to-split-rent-with-roommates"],
    related: ["roommate-expense-splitter", "group-expense-tracker", "couples-expense-splitter"],
  },
  {
    slug: "trip-expense-splitter",
    h1: "Trip expense splitter for group holidays",
    metaTitle: "Trip Expense Splitter: Track Group Travel Costs | SplitEase",
    description:
      "Split trip expenses with friends. Track flights, stays, food and cabs in one group, handle foreign currencies, and settle once when you are back.",
    keywords: ["trip expense splitter", "travel expense splitter", "split trip costs", "group travel expense tracker", "vacation expense splitter"],
    eyebrow: "Group trips",
    intro: [
      "On a trip, someone always pays first. SplitEase keeps one running tally of the whole holiday so nobody remembers who bought what, and you settle once at the end.",
      "Bills in another currency can be recorded with the exchange rate you used.",
    ],
    benefits: [
      { t: "One ledger for the whole trip", d: "Flights, stays, food and cabs in one place." },
      { t: "Foreign currency", d: "Record the original amount and the rate you paid at." },
      { t: "Settle once", d: "Smart settlement reduces the whole trip to a few payments." },
      { t: "Share the link", d: "Everyone joins from one invite." },
    ],
    steps: [
      ["Create a trip group", "Add everyone coming."],
      ["Log costs as you go", "Whoever pays adds it and picks who shares."],
      ["Settle at the end", "Pay the simplified amounts after the trip."],
    ],
    faqs: [
      { q: "How do we split costs on a group trip?", a: "Keep every shared cost in one group during the trip, then settle the net balances at the end rather than paying each other back after every purchase." },
      { q: "Does it handle different currencies?", a: "Yes. You can record a bill in another currency with the amount and the exchange rate." },
    ],
    blog: ["group-trip-expense-management-guide", "split-expenses-on-an-international-group-trip"],
    related: ["split-expenses-with-friends", "group-expense-tracker", "split-bill-app"],
  },
  {
    slug: "splitwise-alternative",
    h1: "A free Splitwise alternative with no paywall",
    metaTitle: "Splitwise Alternative: Free, No Paywall | SplitEase",
    description:
      "Looking for a Splitwise alternative? SplitEase is free to split and settle, with receipt scanning, an AI assistant and no daily limits on adding expenses.",
    keywords: ["splitwise alternative", "free splitwise alternative", "apps like splitwise", "splitwise vs splitease", "best expense splitting app"],
    eyebrow: "Splitwise alternative",
    intro: [
      "If you want to split bills without hitting limits or upgrade prompts, SplitEase is built to be free for the core job: adding expenses, splitting them and settling up.",
      "It also adds receipt scanning and an AI assistant that plans splits in plain English or Hinglish, and waits for your approval before changing anything.",
    ],
    benefits: [
      { t: "Free to split and settle", d: "No paywall on the features you use every day." },
      { t: "Receipt OCR", d: "Scan instead of typing every line." },
      { t: "Autopilot assistant", d: "Describe what you need and review the plan before anything changes." },
      { t: "Web and mobile", d: "Use it from the browser or the app." },
    ],
    steps: [
      ["Sign up free", "Email or Google."],
      ["Recreate your group", "Add members and start logging bills."],
      ["Settle up", "See the simplified payments."],
    ],
    faqs: [
      { q: "What is a good free alternative to Splitwise?", a: "SplitEase is a free alternative for splitting group expenses. It supports unequal splits, receipt scanning and simplified settlements without a paywall on the core features." },
      { q: "Is SplitEase really free?", a: "Splitting expenses and settling up are free in SplitEase." },
    ],
    blog: ["best-splitwise-alternatives"],
    related: ["split-bill-app", "group-expense-tracker", "split-expenses-with-friends"],
  },
  {
    slug: "group-expense-tracker",
    h1: "Group expense tracker for any shared budget",
    metaTitle: "Group Expense Tracker: Shared Budgets Made Simple | SplitEase",
    description:
      "Track group expenses in one place. SplitEase records who paid, who owes, spending by category and gives a clean report for any shared budget.",
    keywords: ["group expense tracker", "shared expense tracker", "shared expenses app", "team expense splitter", "group budget app"],
    eyebrow: "Group expense tracker",
    intro: [
      "Any time several people pay for one thing, the money gets messy. A group expense tracker gives the group one source of truth.",
      "SplitEase adds balances, spending insights and exportable statements on top of the basic ledger.",
    ],
    benefits: [
      { t: "Live balances", d: "See who is owed and who owes at any time." },
      { t: "Spending insights", d: "Understand where the group's money goes." },
      { t: "Statements", d: "Send a clean summary to the group by email." },
      { t: "Roles and security", d: "Control who can change what in a group." },
    ],
    steps: [
      ["Start a group", "Pick a type that matches the purpose."],
      ["Record expenses", "Anyone can add what they paid."],
      ["Review and settle", "Check insights and clear the balances."],
    ],
    faqs: [
      { q: "What is a group expense tracker?", a: "An app that records shared costs, who paid and who owes, so a group can settle fairly without keeping notes by hand." },
      { q: "Can I use it for a team or event?", a: "Yes. Groups work for trips, flats, teams and events, with the same split and settle tools." },
    ],
    blog: ["splitease-ultimate-group-expense-splitter-guide"],
    related: ["split-expenses-with-friends", "trip-expense-splitter", "roommate-expense-splitter"],
  },
  {
    slug: "couples-expense-splitter",
    h1: "Split expenses as a couple, your way",
    metaTitle: "Couples Expense Splitter: Fair Shared Money | SplitEase",
    description:
      "Split expenses as a couple. Use 50/50, income-based percentages or per-category rules, and keep shared spending transparent with SplitEase.",
    keywords: ["couples expense splitter", "split expenses as a couple", "shared expenses couples app", "split bills with partner"],
    eyebrow: "Couples",
    intro: [
      "Couples split money in different ways: half and half, in proportion to income, or by who covers what. SplitEase supports each without a spreadsheet.",
      "Both of you see the same balance, so there is nothing to bring up at the end of the month.",
    ],
    benefits: [
      { t: "50/50 or proportional", d: "Equal, percentage and share-based splits." },
      { t: "Everything visible", d: "One shared record for both of you." },
      { t: "Private to the two of you", d: "A group of two, with settings you control." },
    ],
    steps: [
      ["Create a two-person group", "Invite your partner."],
      ["Choose your rule", "Equal or income-based percentages."],
      ["Log and settle", "Check the balance whenever you like."],
    ],
    faqs: [
      { q: "How should couples split expenses?", a: "Common systems are 50/50, proportional to income, or each covering specific categories. Pick the one you both find fair and apply it consistently." },
    ],
    blog: ["how-couples-should-split-expenses"],
    related: ["split-rent-and-utilities", "split-bill-app", "group-expense-tracker"],
  },
  {
    slug: "split-bill-app-india",
    h1: "Split bill app for India: trips, flats, dinners and UPI settle-ups",
    metaTitle: "Split Bill App India: Free, Hinglish AI, Rupees | SplitEase",
    description:
      "A free split bill app for India. Split dinners, trips and flat expenses in rupees, ask the Autopilot assistant in Hinglish, and settle up with your friends.",
    keywords: ["split bill app india", "expense splitter india", "bill split app rupees", "hinglish expense app", "split expenses UPI"],
    eyebrow: "Made for India",
    intro: [
      "Goa trips, flat rent, office lunches: most Indian friend groups share money all the time. SplitEase works in rupees and understands plain English or Hinglish in its Autopilot assistant.",
      "Add the bill, see who owes whom, and pay each other the way you already do.",
    ],
    benefits: [
      { t: "Rupees first", d: "Amounts and totals read the way you expect." },
      { t: "Hinglish Autopilot", d: "Tell it what you need in your own words and review the plan." },
      { t: "Free", d: "No paywall on splitting and settling." },
      { t: "Web and Android", d: "Use the browser or the mobile app." },
    ],
    steps: [
      ["Make a group", "Trip, flat or office lunch."],
      ["Add bills", "Type them, scan the receipt or ask Autopilot."],
      ["Settle up", "Pay each other and mark it done."],
    ],
    faqs: [
      { q: "Which is the best bill splitting app in India?", a: "SplitEase is a free option built for groups: unequal splits, receipt scanning, simplified settlements and an assistant that understands Hinglish." },
      { q: "Does SplitEase work in rupees?", a: "Yes. Groups can use rupees, and bills in other currencies can be recorded with the exchange rate." },
    ],
    blog: ["how-to-split-expenses-with-friends"],
    related: ["split-bill-app", "trip-expense-splitter", "roommate-expense-splitter"],
  },
];

export const getSeoPage = (slug) => SEO_PAGES.find((p) => p.slug === slug);
