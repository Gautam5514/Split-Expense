// AI-focused SplitEase articles: MCP server, Autopilot and AI safety.
// Kept in their own module and appended to BLOG_POSTS in blogPosts.js.
// Every link uses the canonical domain: https://splitease.tech

export const AI_BLOG_POSTS = [
  {
    slug: "connect-splitease-mcp-server-claude-chatgpt-gemini",
    category: "MCP Server",
    title: "How to Connect SplitEase to Claude, ChatGPT and Gemini with One MCP Link",
    description:
      "Step-by-step guide to the SplitEase MCP server. Paste https://api.split.elitecrew.online/mcp into Claude, ChatGPT, Gemini or Cursor, sign in once, and manage groups, bills and settlements in plain language.",
    keywords: [
      "SplitEase MCP server",
      "MCP server expense splitting",
      "Claude connector",
      "ChatGPT connector",
      "Gemini MCP",
      "Model Context Protocol finance",
      "api.split.elitecrew.online/mcp",
    ],
    date: "2026-11-06",
    readTime: "8 min read",
    cover: {
      image: "/mcp-hub.png",
      alt: "SplitEase MCP server connecting Claude, ChatGPT and Gemini to shared expense groups",
      c1: "#8B5CF6",
      c2: "#06B6D4",
      chips: ["MCP Server", "OAuth 2.1", "29 Tools"],
    },
    intro: [
      "Your AI assistant can already draft emails and summarize documents. With the SplitEase MCP server it can also run your shared money: create a trip group, add last night's dinner, check who owes whom and even start a settlement, all from a normal chat.",
      "The whole setup is one link. Add https://api.split.elitecrew.online/mcp as a connector, sign in with your usual SplitEase account, and your assistant is connected. No tokens to copy, no developer console, no code.",
    ],
    sections: [
      {
        h2: "What is the SplitEase MCP server?",
        p: [
          "MCP stands for Model Context Protocol, an open standard that lets AI apps use outside tools safely. SplitEase publishes a remote MCP server at https://api.split.elitecrew.online/mcp. It exposes 29 tools that cover accounts, groups, expenses, balances, settlements, invites and monthly bills.",
          "Unlike a read-only integration, the server can take real actions. Every write goes through the same controllers as the SplitEase web and mobile apps, so validation, permissions and live updates behave exactly the same. A bill added from your assistant appears in the app within moments.",
        ],
      },
      {
        h2: "Connect in four steps",
        list: [
          "Copy the link: https://api.split.elitecrew.online/mcp (you can also copy it with one click from splitease.tech/mcp).",
          "Add it as a custom connector in Claude, ChatGPT or Cursor. For Gemini CLI, run: gemini mcp add --transport http splitease https://api.split.elitecrew.online/mcp",
          "Your assistant opens the normal SplitEase login page with a banner showing which app is connecting. Sign in or sign up with Google or email.",
          "You are sent straight back and the connector shows as connected. Try a prompt such as: 'Show my balance across all groups.'",
        ],
      },
      {
        h2: "What you can ask once connected",
        p: [
          "Because the tools understand names, you can talk the way you would to a friend. 'Goa' finds your 'Goa Trip' group, and people can be referenced by name, email or simply 'me'. When a name is ambiguous the tool returns the candidates instead of guessing.",
        ],
        list: [
          "Groups: create a group, add or remove members, share an invite link, complete or leave a group.",
          "Expenses: add a bill with the group's split, list recent expenses, open one expense in detail.",
          "Balances: see who owes whom, get a per-group summary and spending insights across all groups.",
          "Settling: propose a payment, review pending settlements and confirm or reject them.",
          "Monthly bills: add, change or remove recurring bills such as rent and WiFi.",
        ],
      },
      {
        h2: "Built for safe AI access",
        p: [
          "Sign-in uses OAuth 2.1 with PKCE, short-lived access tokens, rotating refresh tokens and revocation, so your password never reaches the AI app. Every tool is annotated as read-only or destructive so clients can warn you before risky actions.",
          "Guard rails protect against mistakes. A duplicate guard stops a retried request from adding the same bill twice, and deleting a group requires typing the group's exact name as confirmation. You can disconnect all AI apps at any time from your account.",
        ],
      },
      {
        h2: "Example prompts to try today",
        list: [
          "'Create a group called Manali Trip with Aman and Priya.'",
          "'Add 2400 for dinner, paid by me, split with everyone.'",
          "'Who owes me money right now?'",
          "'Add 18000 monthly rent to the flat group.'",
          "'How much did we spend on food on the trip?'",
        ],
      },
      {
        h2: "Start now",
        p: [
          "Open splitease.tech/mcp for the live connection page, or paste https://api.split.elitecrew.online/mcp straight into your assistant. It is free, secure and takes about a minute.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the SplitEase MCP server link?",
        a: "The live link is https://api.split.elitecrew.online/mcp. Add it as a custom connector in Claude, ChatGPT or Cursor, or use it with the Gemini CLI.",
      },
      {
        q: "Is it safe to let an AI assistant manage my expenses?",
        a: "Yes. Sign-in uses OAuth 2.1 with PKCE and your password is never shared with the AI app. Destructive tools are flagged, duplicate requests are blocked and deleting a group needs the exact group name.",
      },
      {
        q: "Does it cost anything?",
        a: "No. The MCP server uses your normal free SplitEase account.",
      },
      {
        q: "Which AI apps work with the SplitEase MCP server?",
        a: "Any client that supports remote MCP servers, including Claude, ChatGPT, Gemini CLI and Cursor.",
      },
    ],
  },
  {
    slug: "splitease-autopilot-ai-agent-expense-splitting",
    category: "Autopilot AI",
    title: "SplitEase Autopilot: The AI Agent That Splits Your Bills and Waits for Your Yes",
    description:
      "Meet SplitEase Autopilot, an approval-gated AI agent for group expenses. Type 'rent 20000' in English or Hinglish, review the plan, approve once, and it does the work.",
    keywords: [
      "SplitEase Autopilot",
      "AI expense agent",
      "AI bill splitting",
      "Hinglish expense tracker",
      "approval gated AI agent",
      "AI group expense manager",
    ],
    date: "2026-11-05",
    readTime: "8 min read",
    cover: {
      alt: "SplitEase Autopilot AI agent drafting an expense plan for approval",
      c1: "#06B6D4",
      c2: "#3B82F6",
      chips: ["Autopilot", "Approval-gated", "English + Hinglish"],
    },
    intro: [
      "Most expense apps make you open a form, pick a group, choose a payer, tick members and choose a split. Autopilot replaces all of that with one sentence. Type 'rent 20000' and it prepares a complete plan for you to review.",
      "The key idea is control. Autopilot never changes your money data on its own. It drafts, you read, and nothing happens until you approve.",
    ],
    sections: [
      {
        h2: "How Autopilot works",
        list: [
          "You ask in plain English or Hinglish, for example 'dinner 3000 Rahul ko chhod ke'.",
          "Autopilot builds a plan: the title, the amount, who paid and the exact share for each person.",
          "You review the plan card. The approve button shows the amount, such as 'Approve 1,200'.",
          "After approval it runs the steps, reads the result back to verify it and confirms in the chat.",
        ],
      },
      {
        h2: "What Autopilot can do",
        p: [
          "Autopilot handles both changes and quick answers. Anything that changes data waits for approval. Anything that only reads data is answered instantly.",
        ],
        list: [
          "Create a group and pick the right type for a trip, flat or business.",
          "Add people. Contacts join straight away and others receive an invite.",
          "Record an expense you paid using the group's default split.",
          "Set a trip budget and budget alerts.",
          "Answer 'who owes whom', 'my total balance' or 'show food expenses' without changing anything.",
        ],
      },
      {
        h2: "Edit instead of retyping",
        p: [
          "While a plan is waiting you can adjust it in normal language. 'Make it 24000', 'Ravi ko hata do', 'Priya bhi' or 'call it Team dinner' update the plan immediately. The 'Edit amount or people' option opens a sheet to change the title, amount and members.",
          "Autopilot also remembers the conversation. Leave the screen and come back, and the chat and any waiting plan are still there.",
        ],
      },
      {
        h2: "Where to find it",
        p: [
          "On the web, Autopilot lives in a floating widget. In the Android app it is a full screen, opened by the glossy blue Autopilot icon in the header of Home, Trips and any group. Inside a group it opens already working in that group. Both use the same backend, so web and app always behave the same.",
        ],
      },
      {
        h2: "Smart tips that feel helpful, not noisy",
        p: [
          "Autopilot also powers a few well-timed nudges: one on the first of the month, a weekend reminder and trip ideas in November and December. They send at most once a day and never at night. Tapping a tip opens Autopilot with a ready draft such as 'Create group Puri Trip, budget 30000'.",
        ],
      },
      {
        h2: "Try Autopilot at splitease.tech",
        p: [
          "Open splitease.tech, tap the Autopilot launcher and type your first expense. It takes about ten seconds from sentence to settled.",
        ],
      },
    ],
    faqs: [
      {
        q: "Will Autopilot change my expenses without asking?",
        a: "No. Every change is shown as a plan first and only runs after you approve it. Deletes and amounts over 50,000 always need the approve button.",
      },
      {
        q: "Does Autopilot understand Hinglish?",
        a: "Yes. Phrases like 'maine 900 diye taxi ke liye' or 'dinner 3000 Rahul ko chhod ke' are understood and turned into a plan.",
      },
      {
        q: "Can I fix a plan without starting over?",
        a: "Yes. Say 'make it 4000' or 'Ravi ko hata do' while the plan is waiting and it updates instantly.",
      },
    ],
  },
  {
    slug: "natural-language-expense-tracking-with-ai",
    category: "AI Guide",
    title: "Natural Language Expense Tracking: Log Shared Bills by Just Typing a Sentence",
    description:
      "Learn how AI turns casual sentences like 'petrol 1.5k' or 'pizza 600 with Aman and Priya' into accurate shared expenses, and why exact math still matters.",
    keywords: [
      "natural language expense tracking",
      "AI expense tracker",
      "chat expense splitter",
      "voice style expense entry",
      "AI shared expenses",
    ],
    date: "2026-11-04",
    readTime: "7 min read",
    cover: {
      alt: "Typing a sentence to log a shared expense with AI",
      c1: "#10B981",
      c2: "#06B6D4",
      chips: ["Natural Language", "Exact Math", "AI Assist"],
    },
    intro: [
      "The fastest way to record an expense is the way you would tell a friend: 'petrol 1.5k' or 'pizza 600 with Aman and Priya'. Natural language entry removes forms, dropdowns and the small delays that make people skip logging at all.",
      "But money is unforgiving. A good AI expense tool must understand casual phrasing and still produce exact numbers. Here is how SplitEase approaches both.",
    ],
    sections: [
      {
        h2: "Why typing beats tapping",
        p: [
          "A typical manual entry needs a title, amount, payer, split type and members. On a busy trip that is five decisions for a 200 rupee tea. When logging is slow, expenses are forgotten and settlements get argued over later.",
          "A single sentence carries most of that information already. The tool only needs to fill safe defaults and ask one short question when something truly cannot be guessed.",
        ],
      },
      {
        h2: "Sentences SplitEase understands",
        list: [
          "'petrol 1.5k' becomes an expense of 1,500 for fuel.",
          "'maine 900 diye taxi ke liye' records a 900 taxi bill paid by you.",
          "'pizza 600 with Aman and Priya' splits between just the three of you.",
          "'dinner 3000 Rahul ko chhod ke' splits among everyone except Rahul.",
          "'rent 21000' uses the group's usual split.",
        ],
      },
      {
        h2: "Keeping the numbers exact",
        p: [
          "Language models are good at understanding intent but can slip on arithmetic. SplitEase treats the model as a reader, not a calculator. The split engine computes every share, and any amount the model returns must literally appear in your message, so '3600' can never silently become '36000'.",
          "The result is shown as a plan with the exact share per person before anything is saved.",
        ],
      },
      {
        h2: "Fixing mistakes in the same breath",
        p: [
          "Real conversations contain corrections. While a plan is waiting you can say 'make it 4000', add 'Priya bhi' or remove someone with 'Ravi ko hata do'. The plan updates in place, so you never retype the whole expense.",
        ],
      },
      {
        h2: "When the AI is busy",
        p: [
          "SplitEase tries several AI providers in order with cooldowns and a short time budget. If all of them are busy, an offline parser still handles common requests such as simple amounts and names, so logging never stops completely.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I log an expense without opening a form?",
        a: "Yes. Type a sentence into SplitEase Autopilot at splitease.tech and review the plan it prepares.",
      },
      {
        q: "How does SplitEase avoid wrong amounts?",
        a: "The split engine does the math, and every amount the AI returns must appear in your original message.",
      },
      {
        q: "What happens if the AI service is down?",
        a: "An offline parser still handles common requests so you can keep logging expenses.",
      },
    ],
  },
  {
    slug: "why-ai-agents-handling-money-must-ask-for-approval",
    category: "AI Safety",
    title: "Why AI Agents That Touch Your Money Must Ask for Approval First",
    description:
      "AI agents are getting powerful enough to move money data. Here is the approval-first design SplitEase uses so Autopilot and the MCP server stay safe, reversible and verifiable.",
    keywords: [
      "AI agent safety",
      "approval gated AI",
      "human in the loop finance",
      "safe AI expense manager",
      "MCP security OAuth",
    ],
    date: "2026-11-03",
    readTime: "9 min read",
    cover: {
      alt: "Approval gate between an AI agent and shared money",
      c1: "#F59E0B",
      c2: "#EF4444",
      chips: ["AI Safety", "Human Approval", "Audit Trail"],
    },
    intro: [
      "An assistant that only answers questions can only be wrong in words. An assistant that adds, edits and deletes financial records can be wrong in ways that cost real money and real friendships.",
      "That is why SplitEase builds every AI feature around one rule: the AI proposes, the human approves.",
    ],
    sections: [
      {
        h2: "The risk with autonomous money agents",
        p: [
          "Language models can misread a number, pick the wrong group or repeat a request after a timeout. An agent that acts instantly turns each of those small slips into a changed ledger. The fix is not a smarter model alone, it is a design that assumes the model will sometimes be wrong.",
        ],
      },
      {
        h2: "Five safeguards in SplitEase Autopilot",
        list: [
          "Approval first: changes are shown as a plan and run only after you approve. The button shows the amount, such as 'Approve 1,200'.",
          "Stronger gates for big actions: deletes and amounts of 50,000 or more always need the button, never a typed 'yes'.",
          "Hashed, expiring plans: an approved plan cannot be altered afterwards and approvals expire after 24 hours.",
          "Transactions and verification: steps run in a database transaction, are read back to confirm and are safe to retry without duplicates.",
          "Grounded numbers: any amount returned by the model must appear in your message.",
        ],
      },
      {
        h2: "Safeguards for the MCP server",
        p: [
          "When an outside assistant such as Claude or ChatGPT connects at https://api.split.elitecrew.online/mcp, extra protections apply. Sign-in is OAuth 2.1 with PKCE, access tokens are short-lived, refresh tokens rotate with reuse detection and every request is rate limited.",
          "Tools are labelled read-only or destructive, a duplicate guard prevents retried requests from adding a bill twice, and deleting a group needs its exact name.",
        ],
      },
      {
        h2: "Settlement needs two people",
        p: [
          "Even outside AI, SplitEase never lets one person mark a debt as paid alone. A settlement is confirmed by the person on the receiving end, so a mistaken or malicious claim cannot erase a balance.",
        ],
      },
      {
        h2: "What good looks like for any finance AI",
        list: [
          "Shows exactly what it will do before it does it.",
          "Needs explicit approval for anything destructive or large.",
          "Verifies the result after acting.",
          "Fails safely when providers are down.",
          "Lets you disconnect access at any time.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can SplitEase Autopilot delete my data by itself?",
        a: "No. Deletes always show a red confirmation card and only the red button performs them.",
      },
      {
        q: "How are AI apps authenticated?",
        a: "Through OAuth 2.1 with PKCE. Your SplitEase password never reaches the AI app and you can revoke access any time.",
      },
      {
        q: "What stops duplicate expenses from retried requests?",
        a: "Actions are idempotent and the MCP server has a duplicate guard, so a retry does not add the same bill twice.",
      },
    ],
  },
  {
    slug: "ask-ai-about-group-spending-insights-balances",
    category: "AI Insights",
    title: "Ask AI About Your Group Spending: Balances, Insights and Settle-Ups in Plain Language",
    description:
      "Use the SplitEase AI assistant, Autopilot and the MCP server to ask 'who owes me?', 'how much on food?' and 'what is our budget left?' and get answers grounded in your real group data.",
    keywords: [
      "AI spending insights",
      "ask AI about expenses",
      "group budget assistant",
      "who owes me app",
      "SplitEase AI assistant",
    ],
    date: "2026-11-02",
    readTime: "7 min read",
    cover: {
      alt: "Asking an AI assistant questions about group spending in SplitEase",
      c1: "#3B82F6",
      c2: "#8B5CF6",
      chips: ["AI Insights", "Live Balances", "Trip Budgets"],
    },
    intro: [
      "After a trip or a month with flatmates, the useful questions are simple. Who owes me? How much did we spend on food? Are we over budget? SplitEase lets you ask them in plain language and answers from your live group data.",
      "You can ask inside the app, in Autopilot, or from your own AI assistant through the SplitEase MCP server.",
    ],
    sections: [
      {
        h2: "Questions worth asking",
        list: [
          "'Who owes whom?' returns the simplest set of payments to settle the group.",
          "'My total balance' shows what you owe and are owed across every group.",
          "'Show food expenses' or 'search taxi' filters the ledger by what you describe.",
          "'Recent expenses' lists the latest bills with payer and amount.",
          "'How is our trip budget?' compares spending against the budget you set.",
        ],
      },
      {
        h2: "Answers come from real data",
        p: [
          "Read-only questions never change anything and answer instantly. The numbers come from your ledger, not from the model's memory, which is why balances always match what you see in the app.",
        ],
      },
      {
        h2: "Spending insights across groups",
        p: [
          "Through the MCP server, an assistant can call the spending insights tool and the overall summary to describe where money goes across all of your groups. Ask 'What did I spend most on this month?' in Claude or ChatGPT and get a clear breakdown without opening a spreadsheet.",
        ],
      },
      {
        h2: "Budgets and alerts",
        p: [
          "Set a budget on a trip group and SplitEase can alert the group as spending approaches it. Ask Autopilot for the current position at any point, and adjust the budget with one sentence such as 'make the budget 45000'.",
        ],
      },
      {
        h2: "From insight to settlement",
        p: [
          "Once you know the balances, settle them. SplitEase nets everyone down to the fewest payments, supports one-tap UPI, and the receiver confirms the payment so balances reset correctly.",
        ],
      },
      {
        h2: "Try it",
        p: [
          "Open splitease.tech, tap Autopilot and ask 'who owes whom?', or connect your assistant with https://api.split.elitecrew.online/mcp.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can the AI change my data when I ask a question?",
        a: "No. Questions about balances, expenses and totals are read-only and answered instantly.",
      },
      {
        q: "Can I ask about all my groups at once?",
        a: "Yes. 'My total balance' and the overall summary cover every group you belong to.",
      },
      {
        q: "Where can I ask these questions?",
        a: "In SplitEase Autopilot on splitease.tech and the Android app, or in Claude, ChatGPT and Gemini after connecting the SplitEase MCP server.",
      },
    ],
  },
];
