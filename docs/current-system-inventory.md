# Existing-system inventory (code audit)

The repository has a Next.js 16 / React 19 frontend (`frontend`), Express 4 ES-module API (`backend`), Mongoose 8/MongoDB, Firebase identity, Socket.IO, existing OpenAI/Gemini assistants, and Streamable HTTP MCP with optional OAuth. `splitApp/` is pre-existing untracked content and was not modified.

Manual expense flow: frontend → `POST /api/expenses` → Firebase `authMiddleware` → `addExpense` → shared `expenseSplits`/`defaultSplitFor` → shared `createExpenseRecord` → Expense collection → balance cache invalidation, referral count, member notifications and Socket.IO events. `computeGroupBalances`/`buildSettlement` in `balanceController` remain authoritative for balances/suggestions.

Group creation is `POST /api/groups`; member invitations follow existing consent/relationship rules. Settings PATCH is creator-only; `applyExpenseLock` prevents financial settings changes after an expense. Group budget is `trip.budget`, currency `settings.currency`. Payer must be the authenticated user. Required receipts cannot be bypassed.

Autopilot additions reuse that stack; see [local setup and scope](autopilot/README.md). Existing expense split implementation was extracted unchanged into a pure utility and re-exported from its original location for compatibility. Persistence now has a common domain boundary.

No database credentials were read, server started, live user data inspected, baseline timings measured or migration run. Production performance, hosting/database topology, provider cost and staging isolation remain deployment-owner verification tasks.
