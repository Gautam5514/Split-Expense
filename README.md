# 💸 Split‑Expense

A modern app to **split expenses with friends, groups and roommates** — track
who paid, who owes what, and settle up easily. Built with a Next.js frontend
and a Node/Express + MongoDB backend.

> ⭐ **Like this project? [Give it a star](https://github.com/Gautam5514/Split-Expense)!**
> It helps others discover it and motivates us to keep building.

---

## ✨ Features

- 👥 Create groups and split bills between members
- 🧾 Track expenses and see balances at a glance
- 🔔 Real‑time updates and push notifications
- 🤖 Smart receipt/AI helpers
- 🔐 Secure authentication

---

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 18+ and a MongoDB connection string.

```bash
# 1. Clone the repo
git clone https://github.com/Gautam5514/Split-Expense.git
cd Split-Expense

# 2. Backend
cd backend
npm install
cp .env.example .env        # fill in your values
npm run dev                 # http://localhost:5000

# 3. Frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env.local  # fill in your values
npm run dev                 # http://localhost:3000
```

Open **http://localhost:3000** and you're ready. 🎉

> 🔒 **Never commit your `.env` files.** They hold secrets and are already
> ignored by git. Use the `.env.example` files as your template.

---

## 🤝 Contributing

Contributions of all kinds are welcome — code, docs, bug reports, and ideas!

👉 **Read the full step‑by‑step guide in [CONTRIBUTING.md](CONTRIBUTING.md).**
It explains, in plain language, how to fork the repo, create a branch, make
your changes, and raise a pull request — even if it's your first time.

Quick version:

1. **Fork** this repo (top‑right button).
2. **Clone** your fork and create a branch: `git checkout -b feat/my-change`
3. Make your changes and **commit**.
4. **Push** to your fork and **open a Pull Request**.

Good first contributions are labelled [`good first issue`](https://github.com/Gautam5514/Split-Expense/issues).

---

## ⭐ Show your support

If Split‑Expense is useful to you, please **[star the repository](https://github.com/Gautam5514/Split-Expense)** —
it's the simplest way to support the project. Thank you! ❤️
