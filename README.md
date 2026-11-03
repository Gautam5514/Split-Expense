# 💸 Split‑Expense

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14650/badge)](https://www.bestpractices.dev/projects/14650) [Click to verify our public status →](https://www.bestpractices.dev/projects/14650)
[![CI](https://github.com/Gautam5514/Split-Expense/actions/workflows/ci.yml/badge.svg)](https://github.com/Gautam5514/Split-Expense/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Gautam5514/Split-Expense/actions/workflows/codeql.yml/badge.svg)](https://github.com/Gautam5514/Split-Expense/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Split bills with friends, groups, and roommates  track who paid, who owes
what, and settle up. Frontend is **Next.js**, backend is **Node/Express +
MongoDB**.

> ⭐ New here? This guide is written for beginners — just follow the steps in
> order and you'll have it running locally.
>
> **Like this project?** [Give it a star](https://github.com/Gautam5514/Split-Expense) — it helps others find it!

---

## 🛠️ Tech Stack

**Frontend**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-8884d8?style=flat-square)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)

**Database, Auth & Storage**

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-22B573?style=flat-square&logo=nodemailer&logoColor=white)

**AI, Agents & OCR**

![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white)
![Cerebras](https://img.shields.io/badge/Cerebras-F96316?style=flat-square)
![OpenRouter](https://img.shields.io/badge/OpenRouter-6566F1?style=flat-square)
![Model Context Protocol](https://img.shields.io/badge/MCP-000000?style=flat-square&logo=modelcontextprotocol&logoColor=white)
![Tesseract.js](https://img.shields.io/badge/Tesseract.js-EE4C2C?style=flat-square)

**Real-time, Security & DevOps**

![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)
![Helmet](https://img.shields.io/badge/Helmet-000000?style=flat-square&logo=helmet&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![CodeQL](https://img.shields.io/badge/CodeQL-2088FF?style=flat-square&logo=github&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-2B037A?style=flat-square&logo=pm2&logoColor=white)
![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?style=flat-square&logo=amazonec2&logoColor=white)

**Testing**

![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white)
![fast-check](https://img.shields.io/badge/fast--check-6E4AFF?style=flat-square)

---

## 🤖 AI, MCP Server & Autopilot

Split-Expense ships with a full AI layer, not just a chat box:

- **🛰️ Remote MCP Server** — an [MCP](https://modelcontextprotocol.io)
  (Model Context Protocol) endpoint built on `@modelcontextprotocol/sdk`
  that lets AI clients (Claude, Cursor, and other MCP hosts) securely read
  your Split-Expense data. Each connection is a **per-request server scoped
  to one Firebase-authenticated user** — tools run through the same Mongoose
  models and balance engine as the REST API, so group membership and
  permissions are always enforced. Exposed tools: `get_me`, `list_groups`,
  `get_group`, `list_expenses`, `get_balances`, `get_overall_summary`,
  `create_group`.
- **🧭 Autopilot AI Agent** — a guarded agent (`/api/agent`) that turns a
  plain-English request ("split dinner 3 ways in the Goa trip group") into a
  **reviewable plan** of actions. It never executes blindly: every write step
  is proposed, hashed, and must be **explicitly approved** before it runs,
  with a strict in-process allowlist (`create_group`, `set_group_budget`,
  `create_expense`, `read_summary`, `monitor_budget`). Progress streams live
  over SSE. Off by default — guarded by `AUTOPILOT_ENABLED` and a second
  `AUTOPILOT_WRITES_ENABLED` switch.
- **🔌 Pluggable LLM providers** — the agent is provider-agnostic and only
  needs "JSON in, JSON out", so it auto-selects from whichever keys you set:
  **Groq → Cerebras → Gemini → OpenRouter**, with automatic fallback. Add a
  provider with just an API key; no redeploy or code change needed.
- **🧾 Receipt OCR** — **Tesseract.js** reads itemized receipts so expenses
  can be drafted from a photo.

👉 Protocol and tool details: [`docs/mcp-tool-contracts.md`](docs/mcp-tool-contracts.md).

### 🔌 Connect an MCP client

The MCP server speaks the **Streamable HTTP** transport, so any MCP host can
reach it at a plain URL — no local install:

```
https://api.splitease.tech/mcp     # hosted
http://localhost:5000/mcp          # local dev
```

**Claude / Cursor / ChatGPT connectors (recommended — OAuth 2.1):**
just add the URL as a custom connector. On first use the client is bounced to
the SplitEase login page, you approve access, and it receives an access token
scoped to your account. No manual token handling.

```jsonc
// Example MCP client config (e.g. an mcp.json)
{
  "mcpServers": {
    "splitease": {
      "url": "https://api.splitease.tech/mcp"
    }
  }
}
```

**Manual / scripted access (legacy — Firebase ID token):** send the token as a
Bearer header. Grab a fresh one from the `/mcp-login` page.

```bash
curl -s https://api.splitease.tech/mcp \
  -H "Authorization: Bearer <YOUR_SPLITEASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

> 🔐 Every request is **scoped to the authenticated user** — tools only ever
> see your own groups and expenses, and group-membership checks are enforced.
> The endpoint is **stateless** (a fresh, user-scoped server per POST) and
> rate-limited per credential.

---

## ✨ What it does

- 👥 Create groups, add friends, split bills
- 🧾 Track expenses and see who owes what
- 🔔 Real-time updates + push notifications
- 🤖 AI helpers for receipts (OCR) and smart summaries
- 🧭 **Autopilot** AI agent that plans actions for you — with approval before any write
- 🛰️ **MCP server** so AI assistants (Claude, Cursor, …) can securely read your data
- 🔐 Login/signup with secure auth

---

## 🗂️ Project layout

```
Split/
├── backend/    # Express API + MongoDB (runs on :5000)
└── frontend/   # Next.js app (runs on :3000)
```

---

## 🚀 Run it locally (step by step)

**You need:** [Node.js](https://nodejs.org) 18+, and a MongoDB connection
string (get a free one at [MongoDB Atlas](https://www.mongodb.com/atlas)).

### 1. Get the code
```bash
git clone https://github.com/Gautam5514/Split-Expense.git
cd Split-Expense
```

### 2. Start the backend
```bash
cd backend
npm install
cp .env.example .env      # open .env and fill in your values
npm run dev                # → http://localhost:5000
```

### 3. Start the frontend (open a **new** terminal)
```bash
cd frontend
npm install
cp .env.example .env.local   # open .env.local and fill in your values
npm run dev                   # → http://localhost:3000
```

### 4. Open the app
Go to **http://localhost:3000** in your browser. That's it! 🎉

> 🔒 **Never commit `.env` / `.env.local`.** They hold secrets and are
> already git-ignored — the `.env.example` files are just templates to copy.

**Only need MongoDB + auth working?** You can leave the Firebase, Cloudinary,
SMTP, and AI keys blank for now — those only matter if you're touching push
notifications, image uploads, emails, or AI features.

---

## 🧪 Running tests

```bash
cd backend && npm test     # backend tests
cd frontend && npm test    # frontend tests
```

Continuous integration runs both suites (including fast-check property-based
security tests), frontend linting and production
dependency audits on every pull request and push to `main`. Security-focused
static analysis is run by CodeQL. See the [API reference](docs/API.md),
[security policy](SECURITY.md), [secure-development guide](docs/SECURE_DEVELOPMENT.md),
and [release process](docs/RELEASING.md).

---

## 🤝 Contributing

New to open source? You're welcome here — code, docs, bug reports, and ideas
all count as contributions.

👉 **Full step-by-step guide:** [CONTRIBUTING.md](CONTRIBUTING.md)
(explains forking, branches, and pull requests in plain language)

Quick version:
1. **Fork** this repo (button top-right on GitHub)
2. **Clone** your fork, then create a branch: `git checkout -b feat/my-change`
3. Make your changes and **commit** them
4. **Push** to your fork and **open a Pull Request**

Look for issues labeled [`good first issue`](https://github.com/Gautam5514/Split-Expense/issues) to get started.

---

## ⭐ Support the project

If Split-Expense helped you, please **[star the repo](https://github.com/Gautam5514/Split-Expense)** — it's the easiest way to say thanks. ❤️

## 📄 License

Released under the [MIT License](LICENSE). Copyright © 2026 Gautam Pandit.
