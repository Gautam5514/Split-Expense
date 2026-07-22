// Blog content lives here as plain data so both the index page, the article
// pages and the sitemap can share one source of truth. Every post is written
// around a real search query (the `keywords`) with FAQ schema for rich results.

export const BLOG_POSTS = [
  {
    slug: "gautam-pandit-founder-splitease-story",
    category: "Founder Story",
    title: "Gautam Pandit: The Story Behind SplitEase - Why I Built It, and Everything I Learned Along the Way",
    description:
      "Gautam Pandit is the founder and developer of SplitEase, the group expense-splitting app built for flatmates, roommates, and trip planning. Read the full story - from a college problem to a live product.",
    keywords: [
      "Gautam Pandit",
      "SplitEase founder",
      "who developed SplitEase",
      "who built SplitEase",
      "SplitEase app developer",
      "Gautam Pandit SplitEase",
    ],
    date: "2026-07-22",
    readTime: "10 min read",
    author: "Gautam Pandit",
    authorRole: "Founder & Developer, SplitEase",
    authorImage: "/blog/gautam-pandit-portrait.png",
    authorBio:
      "Gautam Pandit is the founder and sole developer of SplitEase - he designed, built, and continues to maintain the product end-to-end, from the original research to the code running in production today.",
    authorLinks: [
      { label: "GitHub", key: "github", href: "https://github.com/Gautam5514" },
      { label: "X / Twitter", key: "x", href: "https://x.com/Gautamp5514" },
      { label: "LinkedIn", key: "linkedin", href: "https://www.linkedin.com/in/gautam-pandit-4b185224b/" },
      { label: "Instagram", key: "instagram", href: "https://www.instagram.com/gautamp5514/" },
      { label: "Contact", key: "contact", href: "/contact" },
    ],
    cover: {
      image: "/blog/gautam-pandit-portrait.png",
      alt: "Gautam Pandit, founder and developer of SplitEase",
      c1: "#0891B2",
      c2: "#8B5CF6",
      objectPosition: "center 22%",
      chips: ["Founder story", "Built solo"],
    },
    intro: [
      "There's a question I get asked a lot now that SplitEase is live and growing: \"Who actually built this?\" So this post is my honest answer - not a polished press release, but the real story of how a problem I lived through in college turned into a product that people now use to split expenses with their friends, flatmates, and travel groups.",
      "My name is Gautam Pandit. I'm the founder and developer of SplitEase - a group expense-splitting app for flatmates, roommates, trip planning, and pretty much any situation where money gets shared between people. This is the story of how it started, what broke along the way, and how it finally became a real, working product.",
    ],
    sections: [
      {
        h2: "Where it actually started",
        p: [
          "Like most product ideas that end up mattering, this one didn't start as a \"startup idea.\" It started as an everyday annoyance.",
          "In college, I was constantly in situations where money was shared between a group - a flat full of roommates splitting rent, groceries, and electricity bills; a trip with friends where everyone paid for different things at different times; a hostel mess where nobody could remember who owed who what by the end of the month. Somebody would pay for dinner, somebody else would cover the cab, someone would forget to pay their share for weeks, and by the time anyone tried to sort it out, nobody actually knew the real numbers anymore.",
          "What frustrated me wasn't just the math - it was that nobody around me had actually solved this properly. There were tools that technically let you log an expense, but nothing that felt built for the way groups like mine actually lived and spent. I kept waiting for someone to build something that just got it. Nobody did. So eventually, I decided I would.",
        ],
      },
      {
        h2: "The six months before I wrote a single line of code",
        p: [
          "Here's something I think a lot of people skip when they talk about building a product: most of the real work happens before you touch a keyboard.",
          "Before I wrote any code, I spent close to six months in research - genuinely trying to understand the problem, not just the feature list. I looked at how people actually split money in real groups, where existing tools broke down, what made people abandon a shared expense sheet halfway through a trip, and what would actually make someone trust an app enough to track their money in it.",
          "Once I felt like I understood the problem properly, I moved into the part most people find boring but I found essential: documentation. I wrote a full SRS (Software Requirements Specification) - laying out exactly what the product needed to do, for whom, and why. This wasn't a formality. It became the reference point I kept coming back to every time I was tempted to add a feature that sounded exciting but didn't actually serve the core problem.",
          "From there, I moved into researching the right tech stack. I didn't want to pick tools because they were trendy - I wanted a stack that could actually support real-time group interactions, receipt scanning, an AI assistant, and cross-platform apps, without falling apart as usage grew. Then came system design - mapping out how data would flow, how balances would stay accurate in real time, how the mobile and web apps would share the same backend, and how the whole thing would hold up once real users, and their real money conversations, started depending on it.",
          "Only after all of that did development actually begin.",
        ],
      },
      {
        h2: "Building SplitEase: the stack and the system",
        p: [
          "I wanted SplitEase to feel modern and reliable, not experimental. So the architecture is deliberately straightforward - nothing exotic, just the right tool for each job:",
        ],
        list: [
          "Web app: Next.js 16, React 19, Tailwind CSS, and Framer Motion, built as a full installable PWA",
          "Mobile app: Expo (React Native) - Android is live, iOS is built on the same codebase",
          "Backend & real-time layer: Node.js with an Express REST API, and Socket.IO powering live chat, presence, and real-time balance updates",
          "Intelligence layer: an OCR pipeline for receipt scanning, plus an AI assistant that answers natural questions about a group's expenses",
          "Media pipeline: Cloudinary for handling receipt images and shared media",
          "Database: MongoDB with Mongoose models, with balance data cached and invalidated on write so numbers stay both fast and correct",
          "Auth & security: Firebase authentication, server-side group-membership checks, input validation, and rate limiting on every request",
        ],
      },
      {
        h2: "What it looks like today",
        p: [
          "SplitEase is live and being used in the real world, not just running as a demo:",
        ],
        list: [
          "Live on the web, with an Android app already deployed and iOS in progress on the same codebase",
          "Hundreds of users across hundreds of groups, with a growing base of monthly active users",
          "Thousands of expenses logged, and a steady stream of settlements completed every week",
          "An AI assistant that's already answered thousands of real questions about group spending",
          "Receipt OCR scanning running with strong accuracy, with ongoing work to push it higher",
        ],
      },
      {
        h2: "Every day, a little more optimized",
        p: [
          "Nothing about SplitEase was \"finished\" the day it launched, and honestly, it still isn't. I treat it as a living product - going back through the app regularly to make things faster, fix rough edges, tighten up the balance calculations, and improve the parts users actually interact with the most. Small, boring improvements, day after day, are what most people never see - but they're the difference between an app that feels clunky and one that feels like it just works.",
        ],
      },
      {
        h2: "Why I'm sharing this",
        p: [
          "I didn't build SplitEase because I saw a market gap on a spreadsheet. I built it because I lived the problem, got frustrated that nobody had solved it properly, and decided that was going to be my problem to fix. Six months of research, a full SRS, real system design, a stack chosen for the long run, and a lot of iteration later, it's a real product that real groups depend on to keep their shared expenses honest.",
          "SplitEase is built to work for flatmates, roommates, trip groups, family expenses - basically any situation where a group needs to know, clearly and instantly, who owes what. And it's still evolving. If you're using SplitEase, or thinking about it, I'd genuinely love your feedback, good, bad, or \"this one thing is annoying.\" That feedback is exactly what shapes what I build next.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who built SplitEase?",
        a: "SplitEase was built by Gautam Pandit, who designed, developed, and continues to maintain the app end-to-end - from the original research and SRS to the Next.js web app and the Expo-based mobile app.",
      },
      {
        q: "Why did Gautam Pandit build SplitEase?",
        a: "He lived the problem firsthand in college, splitting rent, trips, and group bills with friends and roommates with no tool built for how those groups actually spent money, and decided to build one himself instead of waiting for someone else to.",
      },
      {
        q: "What tech stack does SplitEase use?",
        a: "The web app runs on Next.js, React, and Tailwind CSS as an installable PWA. The mobile app is built with Expo (React Native). The backend is Node.js and Express with Socket.IO for real time, MongoDB for data, Firebase for authentication, and Cloudinary for media.",
      },
      {
        q: "Is SplitEase free to use?",
        a: "Yes. SplitEase has no monetization yet by design - the goal is to earn genuine, engaged usage first, and only consider pricing once the product has clearly proven its value at scale.",
      },
    ],
  },
  {
    slug: "how-to-split-expenses-with-friends",
    category: "Guides",
    title: "How to Split Expenses With Friends Without Ruining the Friendship",
    description:
      "A practical 2026 guide to splitting bills, trips and group expenses with friends fairly - the rules, the math, and the apps that keep money from getting awkward.",
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
      "Money is the fastest way to make a great friendship awkward. Someone pays for dinner, someone covers the cab, someone books the hotel - and three weeks later nobody remembers who owes whom, so nobody asks, and someone quietly eats the cost.",
      "The fix isn't spreadsheets or awkward reminders. It's a simple system: record every shared expense the moment it happens, agree on the split rule upfront, and settle in one payment at the end. Here's exactly how to do it.",
    ],
    sections: [
      {
        h2: "Why splitting expenses goes wrong",
        p: [
          "Most groups fail at expense splitting for the same three reasons: expenses are remembered instead of recorded, split rules are decided after the money is spent, and debts are settled one-by-one instead of netted out.",
          "Memory is the biggest killer. Studies on informal lending consistently show people underestimate what they owe and overestimate what they're owed. Neither person is lying - that's just how memory works. The only cure is writing it down at the moment of payment.",
        ],
      },
      {
        h2: "The 4 rules of drama-free expense splitting",
        list: [
          "Record instantly - log the expense before you leave the restaurant, not at the end of the trip.",
          "Agree on the rule first - equal split, by consumption, or by income. Any rule works if it's agreed before the spending starts.",
          "Net everything out - if A owes B ₹500 and B owes A ₹300, that's one ₹200 payment, not two transfers.",
          "Settle on a schedule - end of the trip, end of the month. A deadline stops small debts from becoming resentments.",
        ],
      },
      {
        h2: "Equal split vs. itemized split: which is fair?",
        p: [
          "Equal splits are perfect for genuinely shared costs - the villa, the taxi, the groceries. But forcing an equal split on a dinner where one person had a salad and another ordered for the table breeds silent resentment.",
          "The fair rule of thumb: split shared infrastructure equally, split consumption by usage. A good expense splitting app lets you do both in the same group - equal split for the hotel, itemized shares for the dinner - without any manual math.",
        ],
      },
      {
        h2: "Let an app do the accounting",
        p: [
          "This is exactly the problem SplitEase was built for. Create a free group, add your friends, and log each expense as it happens - who paid, and how it splits. The app keeps a live balance for every member, then generates the minimum set of payments to settle everyone up.",
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
        a: "Use a shared expense app so the balance is visible to both of you, the app does the asking. A neutral 'balances are up on SplitEase, settle whenever works' removes all the awkwardness of a personal demand.",
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
      "Room sizes differ, incomes differ, and the electricity bill spikes every summer. Here's how to split rent, utilities and household costs with roommates, fairly and automatically.",
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
      "Living with roommates cuts your costs by half - and doubles your accounting. Rent, electricity, WiFi, the cleaning help, groceries, the gas cylinder, that one Amazon order everyone used. Small amounts, every week, forever.",
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
          "Utilities fluctuate - a summer electricity bill can be triple the winter one. Estimating 'my share is about ₹800' every month compounds into real money. The fix is recording the actual bill in a shared flat expense manager and splitting the true amount.",
          "Groceries are trickier because consumption differs. Most flats do best with a hybrid: shared staples (oil, cleaning supplies, milk) split equally, personal items excluded, and occasional big items itemized to whoever asked for them.",
        ],
      },
      {
        h2: "The monthly settle-up ritual",
        list: [
          "Pick a fixed day, the 1st, right after rent day, works for most flats.",
          "Everyone's balance is already live in the app, so there's nothing to compute.",
          "The app suggests the minimum payments - usually one or two transfers settle the whole flat.",
          "Mark them paid and start the month at zero. No carry-overs, no 'we'll adjust it later'.",
        ],
      },
      {
        h2: "Set it up once in SplitEase",
        p: [
          "Create a 'Flat' group in SplitEase, add your roommates, and log expenses as they happen - the rent as a custom split, the bills equally, the one-off purchases to whoever they belong to. Everyone sees the same live balances all month, and settlement day becomes a 30-second task instead of a negotiation.",
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
        a: "SplitEase is built for exactly this: a shared flat group with live balances, custom split ratios for rent, equal splits for utilities, itemized splits for groceries, and one-tap monthly settlement, free.",
      },
      {
        q: "How do you handle a roommate who always pays late?",
        a: "Make balances visible and settlement scheduled. When the whole flat sees the same numbers on the same day each month, late payment becomes a visible exception rather than a private favour - which is usually enough social pressure to fix it.",
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
      "Every group trip has a CFO - the friend who booked the villa, paid the airport taxi, and covered dinner when the restaurant wouldn't split the bill. By day three they've fronted half the trip's budget, and by the ride home they're doing forensic accounting from memory and crumpled receipts.",
      "It doesn't have to work that way. With the right setup, a group trip's finances run themselves: everyone pays for things as convenient, the app keeps score, and the trip ends with one or two transfers instead of a spreadsheet argument.",
    ],
    sections: [
      {
        h2: "Before the trip: create the group first",
        p: [
          "Set up the trip group before the first booking is made, because the big pre-trip expenses - flights, hotels, train tickets - are the easiest to lose track of. When the villa booking goes straight into the group the moment it's paid, it never becomes a 'wait, who paid for the stay?' mystery in month two.",
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
  {
    slug: "how-to-split-a-restaurant-bill-fairly",
    category: "Dining",
    title: "How to Split a Restaurant Bill Fairly: 6 Simple Methods",
    description:
      "Learn how to split a restaurant bill fairly when people order different items, share dishes, pay tax and tip, or want separate payments — without awkward math.",
    keywords: [
      "how to split a restaurant bill",
      "split dinner bill fairly",
      "restaurant bill splitting app",
      "split bill with tax and tip",
      "divide restaurant bill",
    ],
    date: "2026-07-21",
    readTime: "8 min read",
    cover: { image: "/blog/how-to-split-restaurant-bill.png", alt: "Two diners using phones to split a restaurant receipt after a shared meal", c1: "#F59E0B", c2: "#06B6D4", chips: ["Dinner ₹3,680", "Tax + tip included", "Fair split ✓"] },
    intro: [
      "The meal was easy. Dividing the bill is where the evening can get complicated: one person skipped drinks, two people shared a starter, and the final receipt adds tax and service charge to everything.",
      "There is no single fair formula for every table. The best method matches how differently people ordered and is agreed before the calculator comes out. Use this guide to choose the right split in under a minute.",
    ],
    sections: [
      {
        h2: "1. Split equally when everyone ordered similarly",
        p: [
          "An equal split is the fastest option when meals and drinks cost roughly the same. Divide the final total — including tax, service charge and tip — by the number of diners. Do not spend ten minutes correcting a difference of ₹30 unless someone asks.",
          "Equal splitting works especially well for set menus, buffets and shared family-style meals. It works poorly when one person did not drink, a child ate less, or one order was much more expensive.",
        ],
      },
      {
        h2: "2. Pay for what you ordered",
        p: [
          "For noticeably different orders, assign each item to the person who consumed it. Divide shared dishes among the people who ate them, then allocate tax, service charge and tip in proportion to each person's subtotal. That keeps the extras fair instead of splitting them equally after itemizing the food.",
          "A receipt scanning app makes this practical: scan the receipt, confirm the total, select the diners and record the custom shares without passing one calculator around the table.",
        ],
      },
      {
        h2: "3. Use shares for adults, children or non-drinkers",
        p: [
          "Weighted shares are a useful middle ground. For example, adults can count as one share, children as half a share, and someone who only had a snack as half a share. Add the shares, divide the bill by that number, then multiply by each person's share.",
          "For alcohol, separate the drinks subtotal and split it only among those who drank. The remaining food bill can still be divided equally, which is faster than itemizing every plate.",
        ],
      },
      {
        h2: "How to avoid awkwardness at the table",
        list: [
          "Choose equal, itemized or weighted splitting before asking for the bill.",
          "Include every fee in the recorded total so nobody is left covering tax or tip.",
          "Let one person pay the restaurant and log everyone else's share immediately.",
          "Use a visible group balance and settle digitally instead of relying on memory.",
        ],
      },
      {
        h2: "Split the dinner in seconds with SplitEase",
        p: [
          "Create a dinner group in SplitEase, scan the receipt and choose an equal, custom or itemized split. Everyone can see the same calculation, and the app carries each person's balance forward if your group goes for dessert or takes a cab afterward.",
        ],
      },
    ],
    faqs: [
      { q: "What is the fairest way to split a restaurant bill?", a: "Split equally when orders are similar. When costs differ significantly, assign individual items, divide shared dishes among participants, and allocate tax and tip in proportion to each person's subtotal." },
      { q: "Should tax and tip be split equally?", a: "If the meal is split equally, split tax and tip equally too. For an itemized bill, allocate tax, service charge and tip proportionally so higher-cost orders carry a fair share of the extras." },
      { q: "How do you split a bill when only some people drink alcohol?", a: "Separate the alcohol subtotal and divide it only among the people who drank. Split the food and other shared costs using the method the whole table agreed on." },
    ],
  },
  {
    slug: "split-expenses-on-an-international-group-trip",
    category: "Travel",
    title: "How to Split Expenses on an International Group Trip",
    description:
      "A practical guide to tracking shared travel costs across currencies, handling exchange rates, fees and cash, and settling an international group trip fairly.",
    keywords: [
      "split expenses international trip",
      "multi currency group expense tracker",
      "split travel costs with friends abroad",
      "track foreign currency expenses",
      "international trip budget app",
    ],
    date: "2026-07-18",
    readTime: "9 min read",
    cover: { image: "/blog/international-group-trip-expenses.png", alt: "Four friends organizing shared travel expenses together in an airport lounge", c1: "#0EA5E9", c2: "#F59E0B", chips: ["4 travellers", "3 currencies", "One final balance"] },
    intro: [
      "International group travel adds a second layer to ordinary expense splitting. Your hotel is charged in one currency, airport food in another, and someone's card converts both at a rate nobody can reconstruct a week later.",
      "The goal is not to predict every exchange rate. It is to record each cost consistently, preserve what the payer actually spent, and agree on one settlement currency before departure.",
    ],
    sections: [
      {
        h2: "Choose a base currency before the first booking",
        p: [
          "Pick the currency in which the group will view balances and settle at the end — usually the currency most travellers use at home. Record the original foreign amount as a note or receipt, but use the payer's actual card debit in the base currency whenever it is available.",
          "This avoids arguments about a theoretical market rate. The relevant number is what the payer was truly charged, including the card issuer's conversion.",
        ],
      },
      {
        h2: "Handle exchange rates and card fees consistently",
        p: [
          "For a pending card charge, use a reliable rate on the purchase date and correct the expense after it posts. If the bank adds a foreign transaction fee, include it in that expense because it was part of the cost of paying for the group.",
          "Do not mix rate methods from person to person. A simple written rule — actual posted debit first, purchase-day rate when unavailable — keeps the whole trip auditable.",
        ],
      },
      {
        h2: "Track cash without losing the trail",
        p: [
          "Treat an ATM withdrawal as moving your own money, not as a group expense. Record the taxi, market purchase or tip only when that cash is spent. If an ATM fee funded shared cash, include the fee proportionally rather than leaving one traveller to absorb it.",
          "Photograph cash receipts where possible and add a short note immediately where receipts are uncommon. Small cash purchases are the expenses groups forget most often.",
        ],
      },
      {
        h2: "A simple international trip workflow",
        list: [
          "Create the group and agree on the base currency before booking flights or stays.",
          "Log the payer's actual converted charge and attach the original receipt.",
          "Exclude travellers from activities, rooms or meals they did not join.",
          "Wait for pending card charges to finalize, then settle once in the base currency.",
          "Use net balances to minimize the number of cross-border transfers and fees.",
        ],
      },
    ],
    faqs: [
      { q: "How do you split group trip expenses in different currencies?", a: "Choose one base currency, record the payer's actual converted card debit when available, keep the original amount on the receipt, and settle every final balance in the chosen base currency." },
      { q: "Which exchange rate should a travel group use?", a: "Use the actual posted card conversion because it reflects what the payer spent. If that is unavailable, use a reliable purchase-day rate and apply the same rule to everyone." },
      { q: "Who pays foreign transaction and ATM fees?", a: "When a fee was incurred to pay a shared expense, include it in that expense and split it among the participants. Personal withdrawal or transfer fees should remain personal." },
    ],
  },
  {
    slug: "how-couples-should-split-expenses",
    category: "Couples",
    title: "How Should Couples Split Expenses? 5 Fair Systems",
    description:
      "Compare five fair ways couples can split rent, bills, groceries and dates — equally, by income, by category or with a shared account — and choose what fits.",
    keywords: [
      "how should couples split expenses",
      "split bills based on income",
      "couples expense tracker",
      "shared expenses for unmarried couples",
      "50 50 relationship finances",
    ],
    date: "2026-07-15",
    readTime: "8 min read",
    cover: { image: "/blog/couples-shared-expenses.png", alt: "A couple calmly reviewing shared household expenses on a tablet", c1: "#14B8A6", c2: "#F59E0B", chips: ["Rent + bills", "60 / 40 split", "Both agree ✓"] },
    intro: [
      "A fair financial system for a couple is not always a 50/50 system. Equal contributions can feel simple when incomes are close, but the same rule can leave one partner with no savings when salaries differ sharply.",
      "The best arrangement is one both people understand, can afford and can revisit without turning every purchase into a relationship test. These five systems cover most couples, from new partners sharing dates to long-term households planning together.",
    ],
    sections: [
      {
        h2: "1. Split everything 50/50",
        p: [
          "Each partner pays half of shared rent, utilities, groceries, travel and dates. It is transparent and easy to track, especially when incomes and spending preferences are similar.",
          "The drawback is affordability: equal amounts do not create equal impact when one income is much lower. If the system prevents one partner from saving or participating comfortably, it needs adjusting.",
        ],
      },
      {
        h2: "2. Split bills in proportion to income",
        p: [
          "Add both take-home incomes, calculate each person's percentage of the total, and use those percentages for shared necessities. If one partner earns 60% of the combined income, a 60/40 split keeps the burden more proportional.",
          "Recalculate after a major salary change, job loss or parental leave. Decide together whether bonuses and irregular freelance income count, so the formula remains predictable.",
        ],
      },
      {
        h2: "3. Divide bills by category",
        p: [
          "One person might pay rent while the other covers groceries, utilities and transport. This reduces transfers, but only works when the categories are reviewed: rising grocery prices can make an arrangement unfair without either partner noticing.",
        ],
      },
      {
        h2: "4. Fund a shared account or monthly pot",
        p: [
          "Both partners contribute an agreed amount to a joint spending pot, equally or by income. Shared costs come from it while personal accounts stay separate. This creates a useful boundary between 'ours' and 'mine' without combining every financial decision.",
        ],
      },
      {
        h2: "5. Track shared costs and settle monthly",
        p: [
          "For couples who want separate accounts and flexibility, log shared purchases as they happen and settle the net balance once a month. SplitEase can apply equal or custom shares to each expense, so rent can be 60/40 while a weekend planned by one partner uses a different agreement.",
        ],
      },
      {
        h2: "The money conversation to have first",
        list: [
          "Define which costs are shared and which remain personal.",
          "Agree on a comfortable lifestyle based on the lower budget, not only the higher income.",
          "Set a threshold for purchases that should be discussed first.",
          "Review the arrangement every three to six months and after major life changes.",
        ],
      },
    ],
    faqs: [
      { q: "Should couples split expenses 50/50?", a: "A 50/50 split works when incomes and financial capacity are similar. When they differ, an income-based percentage can create a more equal burden while keeping contributions transparent." },
      { q: "How do you calculate an income-based bill split?", a: "Divide each person's take-home pay by the couple's combined take-home pay. Apply those percentages to agreed shared expenses and recalculate after meaningful income changes." },
      { q: "Should unmarried couples combine finances?", a: "They do not have to. Many couples keep personal accounts and use a shared account or expense tracker only for agreed household costs, preserving independence and clear records." },
    ],
  },
  {
    slug: "ways-to-split-a-bill-equally-percentages-shares",
    category: "Money Math",
    title: "4 Ways to Split a Bill: Equal, Percentage, Shares or Exact Amount",
    description:
      "Understand equal, percentage, share-based and exact-amount bill splits with formulas and examples, so every group expense is divided fairly the first time.",
    keywords: [
      "ways to split a bill",
      "split bill by percentage",
      "split expenses by shares",
      "custom bill split calculator",
      "equal vs unequal expense split",
    ],
    date: "2026-07-12",
    readTime: "7 min read",
    cover: { image: "/blog/split-bill-methods.png", alt: "A phone and calculator illustrating four different methods for splitting a bill", c1: "#8B5CF6", c2: "#06B6D4", chips: ["Equal", "Percentage", "Shares · Exact"] },
    intro: [
      "'Split the bill' can mean four different calculations. Equal splits are quick, percentages reflect an agreed ratio, shares handle different levels of use, and exact amounts reproduce what each person consumed.",
      "Choosing the right method before entering the expense prevents rounding problems and arguments later. Here is how every method works, with simple examples.",
    ],
    sections: [
      {
        h2: "Equal split: one total divided by everyone",
        p: [
          "Formula: total cost ÷ number of participants. A ₹2,400 taxi package shared by four travellers is ₹600 each. Use equal splitting for costs everyone benefits from similarly, such as accommodation, WiFi or a group taxi.",
          "Before dividing, decide whether children, guests or people who joined for only part of the expense count as full participants.",
        ],
      },
      {
        h2: "Percentage split: use an agreed ratio",
        p: [
          "Formula: total cost × each person's percentage. A ₹30,000 rent split 60/40 becomes ₹18,000 and ₹12,000. All percentages must add to 100.",
          "This is useful for couples splitting by income, roommates assigning different room values, or a business team allocating costs by department budget.",
        ],
      },
      {
        h2: "Share-based split: assign relative weights",
        p: [
          "Formula: total cost ÷ total shares × each person's shares. For a ₹3,000 cost with shares of 2, 2 and 1, each share is ₹600; the participants pay ₹1,200, ₹1,200 and ₹600.",
          "Shares are easier than percentages when usage differs naturally — adults and children, full-trip and weekend guests, or larger and smaller rooms.",
        ],
      },
      {
        h2: "Exact amounts: enter each person's real cost",
        p: [
          "Assign a specific amount to every person, making sure the values add to the receipt total. This method is best for restaurant items, event tickets at different prices, or shopping where purchases are clearly individual.",
          "Remember to allocate shared fees, discounts, tax and tips. A common error is assigning the visible items but leaving the payer to cover the receipt's remaining charges.",
        ],
      },
      {
        h2: "Which splitting method should you choose?",
        list: [
          "Use equal when access or consumption is roughly the same.",
          "Use percentages for a stable financial ratio such as income or room value.",
          "Use shares when people participated at different levels.",
          "Use exact amounts when the receipt clearly identifies individual consumption.",
          "Use SplitEase to mix methods across expenses while keeping one live group balance.",
        ],
      },
    ],
    faqs: [
      { q: "How do you split a bill by percentage?", a: "Multiply the total by each person's agreed percentage and confirm all percentages add to 100. For ₹10,000 split 70/30, the shares are ₹7,000 and ₹3,000." },
      { q: "What does splitting by shares mean?", a: "Shares are relative weights. Add all shares, divide the total by that number, then multiply by each person's shares. It is useful when some people should pay half or double another person's amount." },
      { q: "What is the best method for splitting shared expenses?", a: "Use the simplest method that reflects real benefit or consumption: equal for common costs, percentage for an agreed ratio, shares for different participation, and exact amounts for itemized purchases." },
    ],
  },
  {
    slug: "wedding-expense-tracker-budget-guide",
    category: "Events",
    title: "Wedding Expense Tracker: How to Share Costs Without Confusion",
    description:
      "Build a clear wedding budget, track vendor payments and split shared costs between couples and families with a practical wedding expense tracker system.",
    keywords: [
      "wedding expense tracker",
      "wedding budget tracker",
      "split wedding costs between families",
      "track wedding vendor payments",
      "shared wedding expenses app",
    ],
    date: "2026-07-09",
    readTime: "9 min read",
    cover: { image: "/blog/wedding-expense-tracker.png", alt: "A couple and family members organizing wedding costs around a planning table", c1: "#D4A574", c2: "#06B6D4", chips: ["Budget ₹8,00,000", "Deposits tracked", "Families aligned"] },
    intro: [
      "Wedding costs rarely arrive as one neat bill. They arrive as venue deposits, photographer installments, outfit purchases, catering advances and last-minute payments — often paid by different people across two families.",
      "A useful wedding expense tracker answers three questions instantly: what has been committed, who paid it, and what is still due. Set up that shared record before the first deposit and the budget becomes far easier to control.",
    ],
    sections: [
      {
        h2: "Start with a total budget and category limits",
        p: [
          "Set the maximum amount you can spend without relying on gifts or uncertain future income. Then give major categories — venue, catering, photography, clothing, decor, travel and entertainment — their own ceiling.",
          "Keep a contingency of 5% to 10% outside those category limits. Weddings create late changes, but a reserve turns them into planned costs instead of credit card debt.",
        ],
      },
      {
        h2: "Separate estimates, commitments and payments",
        p: [
          "A ₹1,50,000 photographer quote is not yet an expense, but it matters to the forecast. Mark it as estimated until the contract is signed, committed once booked, and paid only as installments leave an account.",
          "For every vendor, record the full agreed price, deposit, remaining balance, due dates and cancellation terms. Attach invoices or receipts so the couple and both families work from the same facts.",
        ],
      },
      {
        h2: "How to split wedding costs between families",
        p: [
          "Avoid vague promises such as 'we will handle the reception.' List the actual expenses included in that commitment and agree whether overspending within a category changes the contribution.",
          "Families can contribute fixed amounts, percentages of the full wedding, or responsibility for selected categories. None is automatically fairest; clarity, affordability and voluntary agreement matter more than tradition.",
        ],
      },
      {
        h2: "A wedding payment workflow that stays organized",
        list: [
          "Create one shared group for the people authorized to view and add costs.",
          "Name each expense with the vendor, category and installment number.",
          "Attach the invoice and record who paid immediately after every transfer.",
          "Review committed versus paid totals weekly as the event approaches.",
          "Settle family balances at agreed milestones instead of after the wedding.",
        ],
      },
      {
        h2: "Use SplitEase as a shared wedding expense tracker",
        p: [
          "SplitEase keeps payer records, receipts and custom contribution ratios in one group. A venue deposit can be split by percentage, outfits assigned to individuals and a family dinner shared equally — while the live balance still shows the simplest way to reimburse everyone.",
        ],
      },
    ],
    faqs: [
      { q: "What should a wedding expense tracker include?", a: "Track the category, vendor, estimated and agreed price, payer, payment status, deposit, remaining balance, due date and receipt or contract for every wedding cost." },
      { q: "How should wedding costs be divided between families?", a: "Agree on fixed contributions, percentages or clearly defined categories based on what each party can comfortably afford. Document exactly what each commitment covers before bookings are made." },
      { q: "How often should you review a wedding budget?", a: "Review it monthly early in planning, then weekly during the final six to eight weeks. Always update the tracker immediately after signing a contract or making a payment." },
    ],
  },
];

export const getPostBySlug = (slug) => BLOG_POSTS.find((p) => p.slug === slug);
