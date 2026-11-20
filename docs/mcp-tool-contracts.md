# MCP and Autopilot capability contracts

## Remote MCP server (`/mcp`)

`backend/services/mcpServer.js` builds a per-request, user-scoped server (v3.0.0) with server `instructions`, 54 tools and 9 prompts in `backend/services/mcp/tools/`:

| Area | Tools |
|---|---|
| Account | `get_me`, `get_overall_summary`, `get_spending_insights`, `ping` |
| Groups | `list_groups`, `get_group`, `create_group`, `update_group_settings`, `add_members`, `remove_member`, `get_invite_link`, `join_group`, `list_group_invites`, `manage_group_invite`, `complete_group`, `leave_group`, `delete_group` |
| Expenses | `add_expense`, `add_expenses` (up to 20 in one call), `update_expense`, `delete_expense`, `list_expenses`, `get_expense`, `get_group_summary`, `export_expenses` (CSV) |
| Settling | `get_balances`, `settle_up`, `list_pending_settlements`, `respond_to_settlement` |
| Invites | `list_my_invites`, `respond_to_invite` |
| People | `find_people`, `get_privacy_settings`, `update_privacy_settings` |
| Quick split | `create_quick_split`, `list_quick_splits`, `mark_quick_split_paid`, `delete_quick_split` |
| Notes, chat, alerts | `list_notes`, `add_note`, `list_group_messages`, `send_group_message`, `list_notifications`, `mark_notifications_read` |
| Smart | `get_action_items` (what to pay / confirm / answer, with the next tool), `search`, `get_exchange_rate`, `send_group_statement`, `get_statement_status`, `retry_failed_statements` |
| Monthly bills | `list_recurring_bills`, `add_recurring_bill`, `update_recurring_bill`, `delete_recurring_bill` |

Prompts (one-click starters in clients that support them): `catch_me_up`, `split_a_bill`, `add_my_bills`, `fix_a_bill`, `settle_up`, `plan_a_trip`, `split_with_friends`, `wrap_up_trip`, `monthly_review`.

Contracts:
- **Identity** comes only from the verified credential (`routes/mcpRoutes.js`, incl. `firebaseUid` for legacy creator ids). No tool takes a user id to act as.
- **Writes reuse the REST controllers** via `services/mcp/bridge.js` (in-process fake req/res). Validation, permissions, settings lock, receipt policy, consent rules for adding people, notifications and live updates are therefore identical to the app. 4xx messages are passed to the client; 5xx are logged and reported generically. The one exception is `mark_notifications_read`, which updates the user's own notifications directly (that endpoint has no rules beyond ownership).
- **References**: `group` accepts a name or id, resolved only among the user's own groups (`services/mcp/resolve.js`): exact, contains, words in any order, then a typo-tolerant match (one typo for 4-7 characters, two for 8+, a swapped pair counts as one). Members accept name / first name / email / "me" with the same tolerance. Two candidates always return the list as an error instead of guessing. `add_members` and `create_group` also take contact names, which must match exactly one contact.
- **Expenses**: `add_expense` splits equal / exact / percent / shares / itemised (`items`, which must add up to the total). A foreign-currency bill needs only `currency` + `originalAmount`; the live rate (`utils/fxRates.js`) is applied unless `fxRate` is given, and exact amounts and item prices are then read in the bill's currency. If no rate is available the tool asks for one, it never invents one.
- **Edit / delete**: `PATCH` and `DELETE /api/expenses/:expenseId` (added for this; also usable by web and app). Payer only, never a settle-up record, not in a completed group. Edit covers description, category and notes; the amount and split are changed by delete + add.
- **Safety**: every tool has annotations (`readOnlyHint` / `destructiveHint`); `delete_group` requires `confirmName` equal to the group name; `add_expense` refuses an identical bill (same group, payer, description, amount) within 10 minutes unless `allowDuplicate: true`, and `add_expenses` refuses a repeated line in the same list the same way; receipt-required groups are refused (no photo upload over MCP).
- **Limits**: each tool call is cut off after 25 s (`MCP_TOOL_TIMEOUT_MS`) with a message telling the assistant to check before retrying a write. Write tools are limited to 60 per user per minute (`MCP_WRITES_PER_MIN`, in memory per server process) so a looping agent stops; reads are only subject to the route limit (300 requests per minute per credential).
- **Privacy**: `find_people` searches contacts by name; anyone else is found only by exact email and comes back masked. `list_group_messages` does not mark messages as seen. `export_expenses` neutralises cells that start with `=`, `+`, `-` or `@`.
- **Results** are one JSON text block; write tools include a `summary` sentence.
- Tests: `tests/mcpServer.test.js` (unit, fake models), `tests/mcpTools.int.test.js` (real MCP client + controllers + MongoDB, part of `npm run test:int`).

## Autopilot

MCP uses authenticated per-request server instances and JSON text content/error responses; group reads enforce membership. HTTP transport/auth is `routes/mcpRoutes.js` and OAuth services. Raw MCP does not currently provide the new transactional expense approval contract.

Autopilot's internal in-process allowlist is strict: `create_group`, `add_members`, `set_group_budget`, `create_expense`, `read_summary`, `read_overall`, `list_expenses`, `monitor_budget`, `delete_expense`, `delete_group`, `complete_group` (creator only; emails the final statement) and `send_statement` (creator only; completed or fully settled groups). Extraction cannot supply actor IDs, SQL, arbitrary tool names or arbitrary fields. `contracts.js` is the authoritative JSON schema implementation. `domain.js` authorizes each write and uses shared business validators/persistence; it is never exposed directly to an LLM.

Run routes under `/api/agent` require normal Firebase auth. POST `/runs` accepts `{message,groupId?,requestKey:UUID}`; GET `/runs`, GET `/runs/:id`, GET `/runs/:id/events`, POST `/runs/:id/cancel`, POST `/runs/:id/resume` operate only on owned accessible runs. POST `/runs/:id/decision` requires `{decision,planVersion,payloadHash,approvedStepIds}`. Approval requires all mutation step IDs and the exact displayed hash/version. Unsupported fields return 400; unavailable identity/scope returns 404; stale/replayed approval returns 409; disabled execution returns 403. The overall feature returns 404 when off or in production.

Budget routes: GET `/monitors`, POST `/monitors/check`, PATCH `/monitors/:id` with `{enabled:false}`. Enabling always requires a new reviewed monitoring plan. SSE event IDs are persisted array positions; reconnect with `Last-Event-ID` or `?after=` and a Bearer header. Events are `run.started`, `planning.started`, `step.proposed`, `clarification.required`, `plan.ready`, `plan.approved`, `plan.rejected`, `step.verified`, `run.failed`, `run.completed`, `run.cancelled`. Streams end after a terminal/waiting state or a finite poll window; reconnect/read the run for authoritative state.
