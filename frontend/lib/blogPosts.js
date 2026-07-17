// Blog content lives here as plain data so both the index page, the article
// pages and the sitemap can share one source of truth. Every post is written
// around a real search query (the `keywords`) with FAQ schema for rich results.

export const BLOG_POSTS = [
  {
    slug: "how-to-split-expenses-with-friends",
    category: "Guides",
    title: "How to Split Expenses With Friends Without Ruining the Friendship",
    description:
      "A practical 2026 guide to splitting bills, trips and group expenses with friends fairly — the rules, the math, and the apps that keep money from getting awkward.",
    keywords: [
      "how to split expenses with friends",
      "split bills with friends",
      "group expense tracker",
      "fair way to split costs",
      "expense splitting app",
    ],
    date: "2026-07-02",
    readTime: "7 min read",
    cover: { image: "/blog/friends-split-dinner.png", alt: "Four friends splitting a restaurant bill around a dark dinner table", c1: "#0891B2", c2: "#0EA5E9", chips: ["₹1,840 · Dinner", "Split 4 ways", "Settled ✓"] },
    intro: [
      "Money is the fastest way to make a great friendship awkward. Someone pays for dinner, someone covers the cab, someone books the hotel — and three weeks later nobody remembers who owes whom, so nobody asks, and someone quietly eats the cost.",
      "The fix isn't spreadsheets or awkward reminders. It's a simple system: record every shared expense the moment it happens, agree on the split rule upfront, and settle in one payment at the end. Here's exactly how to do it.",
    ],
    sections: [
      {
        h2: "Why splitting expenses goes wrong",
        p: [
          "Most groups fail at expense splitting for the same three reasons: expenses are remembered instead of recorded, split rules are decided after the money is spent, and debts are settled one-by-one instead of netted out.",
          "Memory is the biggest killer. Studies on informal lending consistently show people underestimate what they owe and overestimate what they're owed. Neither person is lying — that's just how memory works. The only cure is writing it down at the moment of payment.",
        ],
      },
      {
        h2: "The 4 rules of drama-free expense splitting",
        list: [
          "Record instantly — log the expense before you leave the restaurant, not at the end of the trip.",
          "Agree on the rule first — equal split, by consumption, or by income. Any rule works if it's agreed before the spending starts.",
          "Net everything out — if A owes B ₹500 and B owes A ₹300, that's one ₹200 payment, not two transfers.",
          "Settle on a schedule — end of the trip, end of the month. A deadline stops small debts from becoming resentments.",
        ],
      },
      {
        h2: "Equal split vs. itemized split: which is fair?",
        p: [
          "Equal splits are perfect for genuinely shared costs — the villa, the taxi, the groceries. But forcing an equal split on a dinner where one person had a salad and another ordered for the table breeds silent resentment.",
          "The fair rule of thumb: split shared infrastructure equally, split consumption by usage. A good expense splitting app lets you do both in the same group — equal split for the hotel, itemized shares for the dinner — without any manual math.",
        ],
      },
      {
        h2: "Let an app do the accounting",
        p: [
          "This is exactly the problem SplitEase was built for. Create a free group, add your friends, and log each expense as it happens — who paid, and how it splits. The app keeps a live balance for every member, then generates the minimum set of payments to settle everyone up.",
          "No more mental math, no more 'I'll get you back later'. Everyone sees the same numbers, so there's nothing to argue about.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best way to split expenses with friends?",
        a: "Record every shared expense in a group expense tracker the moment it's paid, agree the split rule (equal or itemized) before spending, and settle all balances in one netted payment at the end of the trip or month.",
      },
      {
        q: "How do you politely ask a friend to pay you back?",
        a: "Use a shared expense app so the balance is visible to both of you — the app does the asking. A neutral 'balances are up on SplitEase, settle whenever works' removes all the awkwardness of a personal demand.",
      },
      {
        q: "Is there a free app to split expenses with friends?",
        a: "Yes — SplitEase is free: unlimited groups, unlimited expenses, live balances, receipt scanning and one-tap settlement suggestions, with no credit card required.",
      },
    ],
  },
  {
    slug: "best-way-to-split-rent-with-roommates",
    category: "Roommates",
    title: "The Best Way to Split Rent and Bills With Roommates in 2026",
    description:
      "Room sizes differ, incomes differ, and the electricity bill spikes every summer. Here's how to split rent, utilities and household costs with roommates — fairly and automatically.",
    keywords: [
      "split rent with roommates",
      "roommate expense tracker",
      "how to split bills in a flat",
      "flat expense manager",
      "shared household expenses app",
    ],
    date: "2026-06-14",
    readTime: "6 min read",
    cover: { image: "/blog/roommates-rent.png", alt: "Three sets of apartment keys beside a floor plan for roommates", c1: "#10B981", c2: "#34D399", chips: ["Rent ₹30,000", "40 / 35 / 25", "Bills split ✓"] },
    intro: [
      "Living with roommates cuts your costs by half — and doubles your accounting. Rent, electricity, WiFi, the cleaning help, groceries, the gas cylinder, that one Amazon order everyone used. Small amounts, every week, forever.",
      "The households that stay friends aren't the ones that spend the least. They're the ones with a system. This guide covers the fairest ways to split each type of household cost, and how to automate the whole thing.",
    ],
    sections: [
      {
        h2: "Splitting the rent: equal isn't always fair",
        p: [
          "If every room is identical, split equally and move on. But when one room has an attached bathroom and a balcony while another fits a bed and nothing else, equal rent quietly punishes someone every single month.",
          "The simplest fair method: agree what percentage of the home's value each room represents, and split the rent by that percentage. A common pattern for a 3BHK is 40/35/25 when rooms differ significantly. Decide it once, before anyone moves in, and write it down.",
        ],
      },
      {
        h2: "Utilities and groceries: track, don't estimate",
        p: [
          "Utilities fluctuate — a summer electricity bill can be triple the winter one. Estimating 'my share is about ₹800' every month compounds into real money. The fix is recording the actual bill in a shared flat expense manager and splitting the true amount.",
          "Groceries are trickier because consumption differs. Most flats do best with a hybrid: shared staples (oil, cleaning supplies, milk) split equally, personal items excluded, and occasional big items itemized to whoever asked for them.",
        ],
      },
      {
        h2: "The monthly settle-up ritual",
        list: [
          "Pick a fixed day — the 1st, right after rent day, works for most flats.",
          "Everyone's balance is already live in the app, so there's nothing to compute.",
          "The app suggests the minimum payments — usually one or two transfers settle the whole flat.",
          "Mark them paid and start the month at zero. No carry-overs, no 'we'll adjust it later'.",
        ],
      },
      {
        h2: "Set it up once in SplitEase",
        p: [
          "Create a 'Flat' group in SplitEase, add your roommates, and log expenses as they happen — the rent as a custom split, the bills equally, the one-off purchases to whoever they belong to. Everyone sees the same live balances all month, and settlement day becomes a 30-second task instead of a negotiation.",
        ],
      },
    ],
    faqs: [
      {
        q: "How should roommates split rent for different sized rooms?",
        a: "Split by agreed room value, not headcount. Assign each room a percentage of the total rent based on size and amenities (for example 40/35/25 in a 3-bedroom flat) and agree it in writing before move-in.",
      },
      {
        q: "What is the best app for splitting bills with roommates?",
        a: "SplitEase is built for exactly this: a shared flat group with live balances, custom split ratios for rent, equal splits for utilities, itemized splits for groceries, and one-tap monthly settlement — free.",
      },
      {
        q: "How do you handle a roommate who always pays late?",
        a: "Make balances visible and settlement scheduled. When the whole flat sees the same numbers on the same day each month, late payment becomes a visible exception rather than a private favour — which is usually enough social pressure to fix it.",
      },
    ],
  },
  {
    slug: "group-trip-expense-management-guide",
    category: "Travel",
    title: "Group Trip Expense Management: The Complete Guide",
    description:
      "From the flight bookings to the last beach shack bill — how to track, split and settle every expense on a group trip so the holiday ends with memories, not money fights.",
    keywords: [
      "trip expense manager",
      "group travel expense tracker",
      "how to split travel costs",
      "trip budget app",
      "settle up after trip",
    ],
    date: "2026-05-20",
    readTime: "8 min read",
    cover: { image: "/blog/group-trip.png", alt: "Travel essentials, receipts and money arranged for a group trip", c1: "#F97316", c2: "#0EA5E9", chips: ["Goa Trip 🌴", "₹52,300 total", "3 transfers"] },
    intro: [
      "Every group trip has a CFO — the friend who booked the villa, paid the airport taxi, and covered dinner when the restaurant wouldn't split the bill. By day three they've fronted half the trip's budget, and by the ride home they're doing forensic accounting from memory and crumpled receipts.",
      "It doesn't have to work that way. With the right setup, a group trip's finances run themselves: everyone pays for things as convenient, the app keeps score, and the trip ends with one or two transfers instead of a spreadsheet argument.",
    ],
    sections: [
      {
        h2: "Before the trip: create the group first",
        p: [
          "Set up the trip group before the first booking is made, because the big pre-trip expenses — flights, hotels, train tickets — are the easiest to lose track of. When the villa booking goes straight into the group the moment it's paid, it never becomes a 'wait, who paid for the stay?' mystery in month two.",
          "Add every traveller to the group, including the friend who 'will pay cash for everything'. Especially that friend.",
        ],
      },
      {
        h2: "During the trip: whoever's convenient pays",
        p: [
          "The most efficient group trips abandon the idea of taking turns. Whoever is closest to the counter pays, and logs it in ten seconds — amount, what it was, who shares it. The app's live balances do the rest.",
          "This is also where itemized splits earn their keep: the scuba dive that only four of six people did, the extra night one couple stayed. Log those against the actual participants and nobody subsidizes anyone else's add-ons.",
        ],
      },
      {
        h2: "Receipts: scan, don't type",
        p: [
          "For long bills — the supermarket run, the final hotel invoice — receipt scanning removes the last bit of friction. Snap a photo in SplitEase and OCR pulls the amount, so a 40-line grocery bill takes the same ten seconds as a coffee.",
        ],
      },
      {
        h2: "After the trip: settle once, settle fast",
        list: [
          "Do the settlement within a week, while the trip is still a warm memory rather than an old obligation.",
          "Use the app's settlement plan — it nets all debts into the minimum number of payments.",
          "Six travellers usually settle the entire trip with two or three transfers.",
          "Mark payments done in the group so the record closes cleanly at zero.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do you keep track of expenses on a group trip?",
        a: "Create a shared trip group in an expense app before the first booking. Whoever pays logs the expense immediately with who shares it. Live balances replace memory, and settlement at the end is one or two netted payments.",
      },
      {
        q: "How do you split costs when some people skip an activity?",
        a: "Use itemized splits: log the activity against only the people who joined it. Shared infrastructure like the stay and taxis splits across everyone; optional add-ons split across participants only.",
      },
      {
        q: "What's the minimum number of payments to settle a group trip?",
        a: "Far fewer than people expect. Netting all debts against each other means a six-person trip typically settles completely in two or three transfers — SplitEase computes this minimal plan automatically.",
      },
    ],
  },
  {
    slug: "best-splitwise-alternatives",
    category: "Comparisons",
    title: "Best Splitwise Alternatives in 2026 (Free & Feature-Rich)",
    description:
      "Splitwise put expense limits and core features behind Pro. Here's what to look for in a replacement, and why SplitEase is the free alternative most groups land on.",
    keywords: [
      "splitwise alternative",
      "free splitwise alternative",
      "apps like splitwise",
      "splitwise free limit",
      "best bill splitting app 2026",
    ],
    date: "2026-06-28",
    readTime: "6 min read",
    cover: { image: "/blog/splitwise-alternative.png", alt: "A modern phone breaking through a glass paywall toward an open path", c1: "#A855F7", c2: "#38BDF8", chips: ["Unlimited free", "No daily cap", "OCR receipts"] },
    intro: [
      "Splitwise deserves credit for making 'just put it on the app' a normal sentence. But its free tier now caps daily expenses, holds back receipt scanning, and pushes ads between entries — which sends a lot of groups searching for an alternative that stays out of the way.",
      "Switching costs are low: expense splitting apps have no lock-in beyond habit. What matters is picking one your whole group will actually use. Here's the checklist, and how SplitEase measures up.",
    ],
    sections: [
      {
        h2: "What a Splitwise alternative must get right",
        list: [
          "Unlimited free expenses — a daily cap defeats the entire point of logging as you spend.",
          "Debt simplification — netting group debts into minimum payments is the killer feature; never trade it away.",
          "Receipt scanning — long bills need OCR, not typing.",
          "Live balances everyone can see — shared truth is what removes the awkwardness.",
          "Fast group setup — if inviting friends takes more than a link, half of them won't join.",
        ],
      },
      {
        h2: "Where SplitEase fits",
        p: [
          "SplitEase keeps the whole core free: unlimited groups, unlimited expenses, equal and itemized splits, live balances, OCR receipt scanning, and minimum-payment settlement plans. Invites are a link or QR code, and the group has chat built in, so trip planning and trip accounting live in one place.",
          "It also adds an AI assistant that answers questions like 'how much did I spend on food this trip?' or 'who owes me the most right now?' in plain language — accounting you can literally talk to.",
        ],
      },
      {
        h2: "Migrating your group is a 10-minute job",
        p: [
          "Settle your existing balances in the old app first (or note them as an opening 'carried over' expense in the new one). Then create your SplitEase group, share one invite link in the group chat, and start logging new expenses there. Most groups complete the switch during a single dinner.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a completely free alternative to Splitwise?",
        a: "Yes. SplitEase offers unlimited groups and expenses, receipt OCR, live balances and minimum-payment settlements on its free plan, with no daily expense cap.",
      },
      {
        q: "Does SplitEase simplify debts like Splitwise?",
        a: "Yes — SplitEase nets all balances within a group and proposes the smallest possible set of payments to settle everyone, exactly the feature Splitwise users rely on.",
      },
      {
        q: "Can I move my Splitwise group to SplitEase?",
        a: "Settle or note your current balances, create a SplitEase group, and share the invite link. There's no data lock-in in either direction; most groups switch in minutes.",
      },
    ],
  },
  {
    slug: "how-to-settle-group-debts-smartly",
    category: "Money Math",
    title: "Settle Up Smarter: The Math That Turns 12 IOUs Into 2 Payments",
    description:
      "Debt simplification is the most magical feature in expense splitting apps. Here's how minimum-transfer settlement actually works, explained with a real trip example.",
    keywords: [
      "debt simplification",
      "settle up app",
      "who owes who calculator",
      "minimize payments group expenses",
      "how to settle group debts",
    ],
    date: "2026-04-22",
    readTime: "5 min read",
    cover: { image: "/blog/debt-simplification.png", alt: "Many amber payment paths simplified into two clean blue transfers", c1: "#F59E0B", c2: "#0891B2", chips: ["12 IOUs → 2", "Net balance", "₹0 left"] },
    intro: [
      "At the end of a trip, your group doesn't really have a web of debts — it has one simple fact per person: their net balance. Everything else is noise.",
      "Understanding this one idea is what turns settlement from a headache into two quick transfers. Here's the math, minus the jargon.",
    ],
    sections: [
      {
        h2: "Net balance: the only number that matters",
        p: [
          "For each person, add up everything they paid for the group, subtract their share of everything consumed. Positive number? The group owes them. Negative? They owe the group. The individual IOUs — 'I owe Priya for the taxi, Priya owes Dev for lunch' — cancel out inside these totals.",
          "This is why paying back each debt individually is wasteful: a six-person trip can generate fifteen pairwise IOUs, but there are only ever six net balances, and they always sum to zero.",
        ],
      },
      {
        h2: "A real example",
        p: [
          "Say a Goa trip ends like this: Aarav is owed ₹4,200, Meera is owed ₹800, Dev owes ₹2,500, Priya owes ₹1,500, and Rohan owes ₹1,000. That could be settled with a dozen back-and-forth payments — or exactly three: Dev pays Aarav ₹2,500, Priya pays Aarav ₹1,500, and Rohan pays ₹800 to Meera and ₹200 to Aarav.",
          "The general rule: the minimum number of transfers is almost always (people with a non-zero balance) minus one. The algorithm pairs the biggest debtor with the biggest creditor, pays off whichever is smaller, and repeats until everyone is at zero.",
        ],
      },
      {
        h2: "You never have to do this by hand",
        p: [
          "SplitEase runs this settlement algorithm continuously on your group's live balances. Open the group at any moment and it shows the current minimum-payment plan — who pays whom, exactly how much, rounded to the paisa. Settle, mark as paid, done.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is debt simplification in expense apps?",
        a: "Instead of repaying every individual IOU, the app computes each person's net balance and generates the minimum set of payments that bring everyone to zero — turning a dozen transfers into two or three.",
      },
      {
        q: "How many payments does it take to settle a group?",
        a: "At most, the number of people with a non-zero balance minus one. A six-person trip typically settles in two or three transfers when debts are netted.",
      },
      {
        q: "Does SplitEase calculate who owes whom automatically?",
        a: "Yes — every group shows live net balances and a ready-made minimum-payment settlement plan at all times, updated as each expense is logged.",
      },
    ],
  },
  {
    slug: "ai-receipt-scanning-expense-tracking",
    category: "Product",
    title: "AI + OCR: How Receipt Scanning Is Killing Manual Expense Entry",
    description:
      "Typing a 40-line bill into your phone is why expense tracking fails. Here's how OCR receipt scanning and an AI assistant make shared expense tracking effortless.",
    keywords: [
      "receipt scanning app",
      "OCR expense tracker",
      "AI expense assistant",
      "scan receipt split bill",
      "automatic expense tracking",
    ],
    date: "2026-03-30",
    readTime: "5 min read",
    cover: { image: "/blog/ai-receipt-scanning.png", alt: "A phone using AI to scan a receipt on a dark table", c1: "#EC4899", c2: "#0EA5E9", chips: ["Scan receipt 📷", "₹3,240 detected", "Ask AI"] },
    intro: [
      "Every abandoned expense tracker dies the same death: entry friction. Logging a coffee is easy. Logging the supermarket run — forty items, weird totals, a discount at the bottom — is homework, and nobody does homework on holiday.",
      "This is the problem OCR and AI actually solve. Not dashboards, not charts: the ten seconds between paying for something and having it recorded correctly.",
    ],
    sections: [
      {
        h2: "OCR: from paper to logged expense in seconds",
        p: [
          "Optical character recognition reads the photo of your receipt and extracts what matters — the total, the merchant, the date. In SplitEase you snap the bill, confirm the detected amount, pick who shares it, and you're done. The receipt image stays attached to the expense, so 'what was this ₹3,240?' has a visual answer forever.",
        ],
      },
      {
        h2: "An assistant that knows your spending",
        p: [
          "Recording is half the job; understanding is the other half. SplitEase's built-in AI assistant answers plain-language questions about your own data: 'How much did I spend on food in the Goa group?', 'Who owes me the most right now?', 'Summarize my spending by category this month.'",
          "Because it reads your live group data, the answers come back with real numbers and the settlement suggestions already computed — no spreadsheet exports, no manual filtering.",
        ],
      },
      {
        h2: "Privacy, by design",
        p: [
          "AI conversations in SplitEase aren't stored — not on the device, not on the server. Each question is answered against your live data and then forgotten. Your financial history belongs in your groups, not in a chat log.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does receipt scanning work in expense apps?",
        a: "OCR reads a photo of the bill and extracts the total, merchant and date automatically. You confirm the amount, choose who shares the expense, and the receipt image stays attached as proof.",
      },
      {
        q: "Can AI help me track shared expenses?",
        a: "Yes — SplitEase's AI assistant answers natural-language questions about your real group data, like spending by category, current balances, and who should pay whom to settle up.",
      },
      {
        q: "Is my expense data used to train AI?",
        a: "No. SplitEase answers your questions against your live data in the moment and doesn't store AI conversations at all — they're never retained on the client or the server.",
      },
    ],
  },
];

export const getPostBySlug = (slug) => BLOG_POSTS.find((p) => p.slug === slug);
