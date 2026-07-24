# Contributing to Split‑Expense 🎉

First off — **thank you** for taking the time to contribute! Whether it's a
bug fix, a new feature, better docs, or just an idea, you're welcome here.

This guide walks you through the whole process **step by step**, even if
you've never opened a pull request before. Don't worry, it's easier than it
looks. 💪

> ⭐ **If you find this project useful, please [star the repo](https://github.com/Gautam5514/Split-Expense)!**
> It takes 1 second, helps other people discover the project, and genuinely
> keeps the maintainers motivated. Starring is the easiest way to contribute.

---

## 📚 Table of contents

1. [Ways you can contribute](#-ways-you-can-contribute)
2. [The big picture (how contributing works)](#-the-big-picture)
3. [Step‑by‑step: your first pull request](#-step-by-step-your-first-pull-request)
4. [Setting up the project locally](#-setting-up-the-project-locally)
5. [🔒 Keeping secrets safe (READ THIS)](#-keeping-secrets-safe-read-this)
6. [Commit & branch naming](#-commit--branch-naming)
7. [Opening the pull request](#-opening-the-pull-request)
8. [After you open the PR](#-after-you-open-the-pr)
9. [Need help?](#-need-help)

---

## 🌟 Ways you can contribute

You don't have to write code to help:

- 🐛 **Report a bug** — open an [issue](https://github.com/Gautam5514/Split-Expense/issues).
- 💡 **Suggest an idea/feature** — open an issue and describe it.
- 📝 **Improve docs** — fix a typo, clarify a step, add an example.
- 🔧 **Fix a bug or build a feature** — follow the steps below.
- ⭐ **Star the repo** — seriously, it helps.

**New to open source?** Look for issues labelled `good first issue` — they're
picked specifically for first‑timers.

---

## 🗺 The big picture

You **cannot** push directly to the main project. Instead, everyone uses the
standard "fork & pull request" flow. Here's the whole journey in one picture:

```
  Gautam5514/Split-Expense   ← the original repo (you can't push here)
          │
          │  1. Fork (make your own copy on GitHub)
          ▼
  YOU/Split-Expense          ← your fork (you CAN push here)
          │
          │  2. Clone to your computer
          ▼
  your laptop                ← you write code here
          │
          │  3. Create a branch, commit, push to YOUR fork
          ▼
  YOU/Split-Expense
          │
          │  4. Open a Pull Request back to the original repo
          ▼
  Gautam5514/Split-Expense   ← maintainer reviews & merges 🎉
```

Don't memorise it — the commands below do each step for you.

---

## 🚀 Step‑by‑step: your first pull request

### 1. Fork the repo
Go to **https://github.com/Gautam5514/Split-Expense** and click the
**"Fork"** button (top‑right). This creates your own copy under your account.

### 2. Clone YOUR fork to your computer
Replace `YOUR-USERNAME` with your GitHub username:

```bash
git clone https://github.com/YOUR-USERNAME/Split-Expense.git
cd Split-Expense
```

### 3. Connect to the original repo (so you can stay up to date)
This adds the original project as a remote called `upstream`:

```bash
git remote add upstream https://github.com/Gautam5514/Split-Expense.git
```

Now `origin` = your fork, `upstream` = the original. Check with `git remote -v`.

### 4. Create a new branch for your work
Never work on `main` directly. Give the branch a short, descriptive name:

```bash
git checkout -b fix/login-button-color
```

### 5. Make your changes
Edit the code, save your files. (See [local setup](#-setting-up-the-project-locally)
to actually run the app.)

### 6. Stage and commit your changes

```bash
git add .
git commit -m "Fix: correct login button color on mobile"
```

> ⚠️ Before committing, make sure you are **not** adding any `.env` file or
> secrets — see [🔒 Keeping secrets safe](#-keeping-secrets-safe-read-this).

### 7. Push your branch to YOUR fork

```bash
git push origin fix/login-button-color
```

### 8. Open the Pull Request
GitHub will print a link right after you push — click it. Or go to your fork
on GitHub and press the **"Compare & pull request"** button. Fill in the
template, describe what you changed, and submit. **That's it!** ✅

### Keeping your fork up to date (do this before starting new work)

```bash
git checkout main
git pull upstream main      # get the latest changes from the original repo
git push origin main        # update your fork
```

---

## 🛠 Setting up the project locally

Split‑Expense has two parts: a **backend** (Node/Express + MongoDB) and a
**frontend** (Next.js + React). You'll usually need both running.

**Prerequisites:** [Node.js](https://nodejs.org) 18+ and npm, plus a
MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/atlas)
cluster works great).

### Backend

```bash
cd backend
npm install
cp .env.example .env      # then open .env and fill in your values
npm run dev               # starts the API on http://localhost:5000
```

### Frontend

Open a **second terminal**:

```bash
cd frontend
npm install
cp .env.example .env.local   # then open .env.local and fill in your values
npm run dev                  # starts the app on http://localhost:3000
```

Open **http://localhost:3000** in your browser and you're up and running. 🎈

> Some features (AI, push notifications, email) need extra keys. If you're not
> touching those features, you can leave those variables blank — the rest of
> the app will still run.

---

## 🔒 Keeping secrets safe (READ THIS)

This is the **most important rule**: **never commit secrets or `.env` files.**

Leaking an API key, database password, or private key can let attackers into
real accounts and services. To keep everyone safe:

- ✅ **Real secrets go in `.env` / `.env.local`** — these are already listed in
  [`.gitignore`](.gitignore), so git will not track them.
- ✅ **Use the `.env.example` files** as your template — they contain only
  placeholder values, never real ones.
- ❌ **Never** paste a real key, password, or token into any file you commit —
  including `.env.example`, code comments, screenshots, or PR descriptions.
- ❌ **Never** run `git add .env` or force‑add an ignored file.

**Quick self‑check before every commit** — run this and make sure no `.env`
file shows up:

```bash
git status
```

If you see something like `backend/.env` in the list, **do not commit**.
Remove it from staging with:

```bash
git restore --staged backend/.env
```

**Accidentally committed a secret?** Don't just delete it in a new commit — it
stays in git history. Tell the maintainer immediately (open an issue or
comment) and **rotate/regenerate that key** so it can no longer be used.

---

## 🌿 Commit & branch naming

Keep it simple and readable so reviewers understand your change at a glance.

**Branch names** — `type/short-description`:

| Type       | Use for                    | Example                        |
|------------|----------------------------|--------------------------------|
| `feat/`    | a new feature              | `feat/split-by-percentage`     |
| `fix/`     | a bug fix                  | `fix/duplicate-notification`   |
| `docs/`    | documentation only         | `docs/update-readme`           |
| `refactor/`| code cleanup, no new feature | `refactor/group-service`     |

**Commit messages** — write a short sentence describing what you did:

```
Fix: prevent crash when group has no members
Add: export expenses to CSV
Docs: clarify backend setup steps
```

Small, focused commits are easier to review than one giant commit. 🙌

---

## 📬 Opening the pull request

When you open your PR, please:

- **Give it a clear title** describing the change.
- **Fill in the PR template** (it appears automatically).
- **Explain what and why** — what problem does this solve?
- **Link the issue** if there is one (e.g. "Closes #12").
- **Add screenshots** for any visual/UI change.
- **Confirm no secrets** are included.

Then submit. A maintainer will review it — you may be asked to make small
changes, which is a normal and healthy part of the process. 😊

---

## 🔄 After you open the PR

- If a reviewer requests changes, just make more commits on the **same branch**
  and push again — the PR updates automatically:
  ```bash
  git add .
  git commit -m "Address review feedback"
  git push origin your-branch-name
  ```
- Be patient and kind. Maintainers review in their spare time.
- Once approved and merged — **congratulations, you're a contributor!** 🎉

---

## 🙋 Need help?

- Stuck on setup? Open an [issue](https://github.com/Gautam5514/Split-Expense/issues)
  and describe what happened (include the error message).
- Not sure if your idea fits? Open an issue first and ask before coding — it
  saves everyone time.

And once more — if this project helped you, please
**[⭐ star the repo](https://github.com/Gautam5514/Split-Expense)**. Thank you
for making Split‑Expense better! ❤️
