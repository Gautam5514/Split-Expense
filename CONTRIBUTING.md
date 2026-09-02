# Contributing to Split-Expense

Thanks for your interest in contributing. This document explains how to propose changes, the local setup, and the conventions this project follows. Please read it before opening a pull request.

If you find the project useful, consider [starring the repository](https://github.com/Gautam5514/Split-Expense) — it helps others discover it.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Contribution workflow](#contribution-workflow)
- [Local development setup](#local-development-setup)
- [Environment variables and secrets](#environment-variables-and-secrets)
- [Commit and branch naming](#commit-and-branch-naming)
- [Pull request guidelines](#pull-request-guidelines)
- [Code review](#code-review)
- [Getting help](#getting-help)

## Ways to contribute

You don't need to write code to help:

- **Report a bug** by opening an [issue](https://github.com/Gautam5514/Split-Expense/issues).
- **Propose a feature** by opening an issue describing the use case.
- **Improve documentation** — fix a typo, clarify a step, add a missing example.
- **Fix a bug or implement a feature** — see the workflow below.

New to open source? Look for issues labeled [`good first issue`](https://github.com/Gautam5514/Split-Expense/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — they're scoped to be approachable for first-time contributors.

## Contribution workflow

This project uses the standard fork-and-pull-request model. You cannot push directly to `main`.

```
Gautam5514/Split-Expense (upstream)  →  your fork  →  your branch  →  pull request  →  review  →  merge
```

**1. Find or open an issue**

Most changes start from an issue on the [Issues tab](https://github.com/Gautam5514/Split-Expense/issues). Read it fully — it should describe the problem and the acceptance criteria for a fix. If no issue exists for what you want to work on, open one first so the approach can be discussed before you invest time.

**2. Claim the issue**

Comment on the issue to say you're picking it up, and wait for a maintainer to confirm or assign it. This avoids duplicate work.

**3. Fork and clone**

```bash
git clone https://github.com/YOUR-USERNAME/Split-Expense.git
cd Split-Expense
git remote add upstream https://github.com/Gautam5514/Split-Expense.git
```

`origin` points to your fork, `upstream` to the original repository.

**4. Create a branch**

Never commit directly to `main`. Name the branch after the issue, e.g. `fix/2-careers-page-ui` for issue #2 (see [naming conventions](#commit-and-branch-naming)).

```bash
git checkout -b fix/2-careers-page-ui
```

**5. Make your changes**

Address the issue's acceptance criteria. Keep the change focused — avoid unrelated edits in the same branch.

**6. Commit and push**

```bash
git add .
git commit -m "Fix: correct spacing and mobile layout on Careers page"
git push origin fix/2-careers-page-ui
```

**7. Open a pull request**

Push prints a link to open the PR directly, or use the "Compare & pull request" button on your fork. In the description, include `Closes #<issue-number>` so the issue closes automatically when the PR merges.

**Keeping your fork up to date**, run before starting new work:

```bash
git checkout main
git pull upstream main
git push origin main
```

## Local development setup

The project has two parts: a **backend** (Node/Express + MongoDB) and a **frontend** (Next.js + React). You'll typically run both.

**Prerequisites:** Node.js 18+, npm, and a MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works).

**Backend** — runs on `http://localhost:5000`:

```bash
cd backend
npm install
cp .env.example .env    # fill in your values
npm run dev
```

**Frontend** — in a second terminal, runs on `http://localhost:3000`:

```bash
cd frontend
npm install
cp .env.example .env.local    # fill in your values
npm run dev
```

Some features (AI, push notifications, email) require additional API keys. If you're not working on those, leave the related variables blank — the rest of the app runs without them.

## Environment variables and secrets

**Never commit secrets or `.env` files.** A leaked API key, database credential, or private key can compromise real accounts and services.

- Real secrets belong only in `.env` / `.env.local`, which are already git-ignored.
- Use `.env.example` as a template — it should contain placeholder values only.
- Never paste a real credential into code, comments, commit messages, screenshots, or PR descriptions — including `.env.example`.

Before committing, run `git status` and confirm no `.env` file is staged. If one appears, unstage it:

```bash
git restore --staged backend/.env
```

If a secret is committed by mistake, do not simply delete it in a follow-up commit — it remains in git history. Notify a maintainer immediately and rotate the exposed credential.

## Commit and branch naming

**Branch names** use `type/short-description`, optionally prefixed with the issue number:

| Type        | Use for                        | Example                      |
|-------------|---------------------------------|-------------------------------|
| `feat/`     | a new feature                  | `feat/split-by-percentage`    |
| `fix/`      | a bug fix                      | `fix/2-careers-page-ui`       |
| `docs/`     | documentation only              | `docs/update-readme`          |
| `refactor/` | code change with no behavior change | `refactor/group-service` |

**Commit messages** should be short, imperative, and describe the change:

```
Fix: prevent crash when group has no members
Add: export expenses to CSV
Docs: clarify backend setup steps
```

Prefer small, focused commits over one large commit — they're easier to review and revert if needed.

## Pull request guidelines

- Give the PR a clear, descriptive title.
- Fill in the PR template.
- Explain what changed and why — the problem being solved, not just the diff.
- Reference the issue with `Closes #<number>` so it closes automatically on merge.
- Include screenshots or a short clip for any UI change.
- Confirm the change contains no secrets or unrelated files.
- Keep the PR scoped to one concern; open follow-up PRs for unrelated changes.

## Code review

A maintainer will review your PR and may request changes — this is a normal part of the process. To update a PR, push additional commits to the same branch:

```bash
git add .
git commit -m "Address review feedback"
git push origin your-branch-name
```

The PR updates automatically. Once approved, it will be merged and the linked issue closed.

## Getting help

If you're stuck on setup or unsure whether an idea fits the project, open an [issue](https://github.com/Gautam5514/Split-Expense/issues) and describe what you've tried, including any error messages. Asking before you start saves time for everyone.
