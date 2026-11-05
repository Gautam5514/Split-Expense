<div align="center">

<a href="https://split.elitecrew.online">
  <img src="docs/assets/readme/hero.svg" width="100%" alt="SplitEase: split bills, not friendships. Exact splits, live balances, fewest-payment settle-ups and an AI that waits for your yes." />
</a>

<br />

[![CI](https://github.com/Gautam5514/Split-Expense/actions/workflows/ci.yml/badge.svg)](https://github.com/Gautam5514/Split-Expense/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Gautam5514/Split-Expense/actions/workflows/codeql.yml/badge.svg)](https://github.com/Gautam5514/Split-Expense/actions/workflows/codeql.yml)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14650/badge)](https://www.bestpractices.dev/projects/14650)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/node-22-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-8B5CF6.svg)](CONTRIBUTING.md)
[![Good first issues](https://img.shields.io/github/issues/Gautam5514/Split-Expense/good%20first%20issue?label=good%20first%20issues&color=22D3EE)](https://github.com/Gautam5514/Split-Expense/labels/good%20first%20issue)

**[🌐 Web app](https://split.elitecrew.online)** &nbsp;·&nbsp;
**[📱 Android](https://play.google.com/store/apps/details?id=com.kunal.splitapp)** &nbsp;·&nbsp;
**[🧭 Autopilot](https://split.elitecrew.online/features/autopilot)** &nbsp;·&nbsp;
**[🛰️ MCP server](https://split.elitecrew.online/mcp)** &nbsp;·&nbsp;
**[📘 API docs](docs/API.md)** &nbsp;·&nbsp;
**[📦 Mobile repo](https://github.com/Gautam5514/splitApp)**

<br />

<img src="docs/assets/readme/stats.svg" width="100%" alt="800+ automated tests, 29 MCP tools for AI apps, 10 Autopilot actions, 3 platforms on one live ledger" />

</div>

---

## Contents

- [Highlights](#highlights)
- [Live everywhere](#live-everywhere)
- [Autopilot, the AI agent](#autopilot-the-ai-agent)
- [MCP server for ChatGPT, Claude and Gemini](#mcp-server-for-chatgpt-claude-and-gemini)
- [Smart notifications](#smart-notifications)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Tests and quality](#tests-and-quality)
- [Security](#security)
- [Contributing](#contributing)

---

## Highlights

<img src="docs/assets/readme/highlights.svg" width="100%" alt="Highlights: exact splits, groups that fit, fewest payments, live everywhere, Autopilot AI, MCP server, smart nudges, secure by default" />

<details>
<summary><b>The details behind each card</b></summary>

<br />

| | |
|---|---|
| **Exact splits** | Equal, exact, percent, shares or itemised. Rounding leftovers go to the payer, so every bill adds up to the paisa. |
| **Groups that fit** | Trip (budget + dates), flatmates (monthly bill day), business (receipts required) or general, each with its own categories and default split. Settings lock after the first expense so old splits stay correct. |
| **Fewest payments** | Balances are netted and routed through the minimum number of transfers. Settle-ups are two-sided: one person claims, the other confirms. One-tap UPI on mobile. |
| **Live everywhere** | Socket.IO pushes every change to every open phone and browser tab. See [Live everywhere](#live-everywhere). |
| **Autopilot AI** | Chat in English or Hinglish. It drafts a plan with every share, and nothing changes until you approve. |
| **MCP server** | 29 tools so ChatGPT, Claude, Gemini and Cursor can run your groups, over OAuth 2.1. |
| **Smart nudges** | Festival, monthly and trip-season tips via push and web push, with frequency caps, quiet hours and holdout groups. |
| **Secure by default** | Firebase auth, Zod validation, Helmet, per-user rate limits, NoSQL-injection sanitising, CodeQL and OpenSSF practices. |

</details>

---

## Live everywhere

Add a bill on the web and it appears on every member's phone a moment later. No refresh, no restart, no clearing the cache.

| What changes | Who sees it live |
|---|---|
| Expenses, settle-ups, recurring bills | Everyone with the group open, plus every member's home screen |
| Members, invites, join requests, settings, photo | The group page, the creator's pending list, the invitee's invites |
| New, completed or deleted groups | Every member's group list, on web and app |
| Notifications | Every device you're signed in on, not just the last one |

The connection heals itself. It reconnects forever with a fresh token, re-joins every open group, and refetches whatever it missed when the app comes back from the background, the tab becomes visible again or the network returns.

---

## Autopilot, the AI agent

<img src="docs/assets/readme/autopilot-flow.svg" width="100%" alt="Autopilot flow: you ask, it plans with exact shares, you approve a hashed and versioned plan, it runs in a transaction and verifies" />

A chat agent that turns plain English or Hinglish into a **reviewable plan**, and runs it only after you approve. It lives in a floating widget on the web and a full screen in the Android app. **[See the feature page →](https://split.elitecrew.online/features/autopilot)**

```text
"rent 21000"  →  plan: Rent ₹21,000, paid by you, split equally (4 people)  →  "make it 24000"  →  Approve ₹24,000  →  done, verified
```

| ✏️ Changes (always need approval) | 🔎 Answers (read-only, instant) |
|---|---|
| Create a group (picks trip / flat / business) | Who owes whom, with the simplest settle-up |
| Add people (contacts join, others get an invite) | Your balance across every group |
| Record an expense you paid (group's default split) | Recent expenses, or search ("food", "taxi") |
| Set a trip budget and budget alerts | |
| Delete an expense you added, or a group you created | |

**Why it's safe and smart**

- **Understands casual language.** "petrol 1.5k", "maine 900 diye taxi ke liye", "pizza 600 with Aman and Priya". It fills safe defaults and asks one short question only when something is truly missing.
- **Instant corrections.** While a plan waits: "make it 4000", "Rahul ko hata do", "Priya bhi", "call it Team dinner". No retyping.
- **Approval-gated execution.** Plans are hashed and versioned, and approvals expire after 24 hours. Every step runs in a MongoDB transaction, is read back to verify it, and is idempotent on retry. Deletes, and amounts of ₹50,000 or more, need the button, not a typed "yes".
- **Grounded numbers.** Every amount the model returns must appear in your message, so "3600" can never silently become "36000".
- **Reliable on free models.** Groq → Cerebras → Gemini → OpenRouter, with per-model cooldowns, a 15 s budget and one repair retry. When every provider is busy, an offline parser still handles common requests.

Switches: `AUTOPILOT_ENABLED`, `AUTOPILOT_WRITES_ENABLED`, plus any one provider key (e.g. `GROQ_API_KEY`).
Details and threat model: [`docs/autopilot/`](docs/autopilot/README.md) · [`docs/agent-threat-model.md`](docs/agent-threat-model.md)

---

## MCP server for ChatGPT, Claude and Gemini

A remote [Model Context Protocol](https://modelcontextprotocol.io) endpoint (Streamable HTTP, OAuth 2.1). It lets AI assistants **run** your SplitEase account, not just read it: create groups, add bills, settle up, handle invites and monthly bills.

```jsonc
{ "mcpServers": { "splitease": { "url": "https://api.split.elitecrew.online/mcp" } } }
```

Add the URL as a custom connector in ChatGPT, Claude or Cursor, or use it from the Gemini CLI. Sign-in is the normal SplitEase login page.

| Area | Tools |
|---|---|
| 👤 Account | `get_me` · `get_overall_summary` · `get_spending_insights` · `ping` |
| 👥 Groups | `list_groups` · `get_group` · `create_group` · `update_group_settings` · `add_members` · `remove_member` · `get_invite_link` · `join_group` · `complete_group` · `leave_group` · `delete_group` |
| 🧾 Expenses | `add_expense` · `list_expenses` · `get_expense` · `get_group_summary` |
| 🤝 Settling | `get_balances` · `settle_up` · `list_pending_settlements` · `respond_to_settlement` |
| ✉️ Invites | `list_my_invites` · `respond_to_invite` |
| 🔁 Monthly bills | `list_recurring_bills` · `add_recurring_bill` · `update_recurring_bill` · `delete_recurring_bill` |

- **Same rules as the app.** Write tools call the exact REST controllers the web and app use, through an in-process bridge. Validation, permissions, settings lock, consent and live updates are identical, so a bill added from ChatGPT shows up in the app instantly.
- **Talk naturally.** Groups by name ("goa" finds "Goa Trip"), people by name, email or "me". When a name is ambiguous, the tool returns the candidates instead of guessing.
- **Built for AI clients.** Every tool has `readOnlyHint` / `destructiveHint` annotations, and server instructions explain the rules to the model. A duplicate guard stops retried requests from adding the same bill twice, and `delete_group` needs the group's exact name as confirmation.

Contracts and auth: [`docs/mcp-tool-contracts.md`](docs/mcp-tool-contracts.md) · [`docs/MCP-OAUTH.md`](docs/MCP-OAUTH.md)

---

## Smart notifications

Gentle, scheduled tips that bring people back without spamming them. **No setup needed:** they run automatically and can be paused from **Admin → Notifications**.

| Tip | When (IST) | Example |
|---|---|---|
| New month | 1st of every month, 10:00 | "Naya mahina, naya hisaab. Is mahine ka rent aur bills abhi add karo." |
| Weekend | One Sunday a month, 12:30 | "Sunday plans? Pay once, split in seconds." |
| Trip season | Nov and Dec, 19:30 | "Puri is calling. Plan a winter getaway, or go big with Goa." |

- **Respectful:** at most 1 a day and 5 in any 30 days, never between 21:00 and 09:00, new users wait two days, and people already planning a trip get no trip tips.
- **Personal:** first name and nearby destinations from the profile's state or city (no GPS), in English and Hinglish variants.
- **Exactly once:** each send is claimed in a unique index first, and the frequency cap is one atomic write per person, so restarts or a second server never double-send.
- **Measurable:** a 10% holdout per campaign and open tracking per variant, visible on the admin page.

Tapping a tip opens Autopilot with a ready draft ("Create group Puri Trip, budget 30000").

---

## Architecture

```mermaid
flowchart LR
  W["🌐 Web · Next.js"] -- "REST + Socket.IO" --> API["⚙️ API · Express"]
  A["📱 Android · Expo"] -- "REST + Socket.IO" --> API
  M["🤖 ChatGPT · Claude · Gemini"] -- "MCP · OAuth 2.1" --> API
  API --> DB[("🍃 MongoDB")]
  API --> LLM["🧠 Groq · Cerebras · Gemini · OpenRouter"]
  API --> P["🔔 Expo push · FCM web push"]
  API --> C["🖼️ Cloudinary · Tesseract OCR"]
  API -. "live events" .-> W
  API -. "live events" .-> A
```

```text
Split/
├── backend/                  Express API (:5000 locally)
│   ├── controllers/          groups, expenses, balances, invites, notifications …
│   ├── modules/autopilot/    planner, LLM chain, approval + transactional execution
│   ├── modules/engagement/   scheduled tips: schedule, copy, runner, admin
│   ├── services/mcp/         MCP tools, controller bridge, name resolver
│   ├── utils/realtime.js     live-update fan-out to groups and users
│   └── tests/                Jest: unit, property-based, DB integration
├── frontend/                 Next.js web app (:3000)
└── docs/                     API, Autopilot, MCP, security, invariants
```

The mobile app lives in its own repo, **[Gautam5514/splitApp](https://github.com/Gautam5514/splitApp)**, and talks to the same API.

---

## Tech stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=js,nodejs,express,mongodb,nextjs,react,tailwind,firebase,jest,githubactions,aws&perline=11" alt="JavaScript, Node.js, Express, MongoDB, Next.js, React, Tailwind CSS, Firebase, Jest, GitHub Actions, AWS" />
</p>

| Layer | Built with |
|---|---|
| **Web** | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white) |
| **Mobile** | ![Expo](https://img.shields.io/badge/Expo_54-000020?style=for-the-badge&logo=expo&logoColor=white) ![React Native](https://img.shields.io/badge/React_Native_0.81-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Android](https://img.shields.io/badge/Android-34A853?style=for-the-badge&logo=android&logoColor=white) ![Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=googleplay&logoColor=white) |
| **API** | ![Node.js](https://img.shields.io/badge/Node.js_22-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white) ![Zod](https://img.shields.io/badge/Zod_4-3E67B1?style=for-the-badge&logo=zod&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white) |
| **Data** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose_8-880000?style=for-the-badge&logo=mongoose&logoColor=white) ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white) |
| **AI** | ![Model Context Protocol](https://img.shields.io/badge/MCP_SDK-000000?style=for-the-badge&logo=modelcontextprotocol&logoColor=white) ![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge) ![Google Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white) ![OpenRouter](https://img.shields.io/badge/OpenRouter-6566F1?style=for-the-badge&logo=openrouter&logoColor=white) ![Tesseract](https://img.shields.io/badge/Tesseract.js_OCR-3C8FD8?style=for-the-badge) |
| **Auth & push** | ![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white) ![OAuth 2.1](https://img.shields.io/badge/OAuth_2.1-EB5424?style=for-the-badge&logo=auth0&logoColor=white) ![Expo Push](https://img.shields.io/badge/Expo_Push-000020?style=for-the-badge&logo=expo&logoColor=white) |
| **Quality** | ![Jest](https://img.shields.io/badge/Jest_30-C21325?style=for-the-badge&logo=jest&logoColor=white) ![fast-check](https://img.shields.io/badge/fast--check-property_tests-8B5CF6?style=for-the-badge) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white) ![Dependabot](https://img.shields.io/badge/Dependabot-025E8C?style=for-the-badge&logo=dependabot&logoColor=white) |
| **Ship** | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white) ![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge) ![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white) ![Ubuntu](https://img.shields.io/badge/Ubuntu-E95420?style=for-the-badge&logo=ubuntu&logoColor=white) |

---

## Run it locally

You need **Node 22** (18+ works) and a MongoDB connection string. A free [Atlas](https://www.mongodb.com/atlas) cluster or a local `mongod` both work.

```bash
git clone https://github.com/Gautam5514/Split-Expense.git && cd Split-Expense

# 1. API
cd backend && npm install
cp .env.example .env          # fill in MONGO_URI and auth values
npm run dev                   # http://localhost:5000

# 2. Web (new terminal)
cd frontend && npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

Only need the basics? Leave Firebase push, Cloudinary, SMTP and AI keys empty; they only matter for push, uploads, email and AI features. To try Autopilot, add `AUTOPILOT_ENABLED=true`, `AUTOPILOT_WRITES_ENABLED=true` and one free key such as `GROQ_API_KEY` (plus `NEXT_PUBLIC_AUTOPILOT_ENABLED=true` for the web build).

> [!WARNING]
> Never commit `.env` or `.env.local`. They are git-ignored; the `.env.example` files are templates.

---

## Tests and quality

```bash
cd backend  && npm test           # 660+ unit + property-based tests (fast-check)
cd backend  && npm run test:int   # real-MongoDB integration: settings lock, group security, MCP tools
cd frontend && npm test           # component tests, including the Autopilot widget
```

> [!TIP]
> Integration tests need a throwaway database: `mongod --dbpath /tmp/db --port 27099`, then
> `MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_test npm run test:int`. Never point them at a real database.

CI runs both suites, linting and dependency audits on every pull request, and CodeQL scans for security issues. The mobile repo has its own 220+ tests.

---

## Security

| | |
|---|---|
| 🔐 **Identity** | Firebase-verified tokens only; MCP uses OAuth 2.1 with PKCE, hashed tokens and refresh rotation |
| 🧱 **Input** | Zod schemas, NoSQL-injection sanitising, size limits, SSRF-safe receipt URLs |
| 🚦 **Abuse** | Per-user and per-token rate limits on the API, Autopilot and MCP |
| 💸 **Money** | Only you can be the payer of your expenses; settle-ups are two-sided; [financial invariants](docs/financial-invariants.md) are tested |
| 🔍 **Supply chain** | CodeQL, Dependabot, npm audit in CI, [OpenSSF Best Practices](https://www.bestpractices.dev/projects/14650) |

Found something? Please report it privately; see the [security policy](SECURITY.md). More: [secure development guide](docs/SECURE_DEVELOPMENT.md) · [permissions matrix](docs/permissions-matrix.md) · [release process](docs/RELEASING.md).

---

## Contributing

New to open source? Welcome. Code, docs, bug reports and ideas all count.

1. Fork, then branch: `git checkout -b feat/my-change`
2. Make the change, with tests where it makes sense
3. Open a pull request

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [`good first issue`](https://github.com/Gautam5514/Split-Expense/labels/good%20first%20issue) label.

<div align="center">

<br />

**If SplitEase helped you, a ⭐ helps others find it.**

[MIT](LICENSE) © 2026 Gautam Pandit

</div>
