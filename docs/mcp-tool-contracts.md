# MCP and Autopilot capability contracts

## Remote MCP server (`/mcp`)

`backend/services/mcpServer.js` builds a per-request, user-scoped server (v2.0.0) with server `instructions` and 29 tools in `backend/services/mcp/tools/`:

| Area | Tools |
|---|---|
| Account | `get_me`, `get_overall_summary`, `get_spending_insights`, `ping` |
| Groups | `list_groups`, `get_group`, `create_group`, `update_group_settings`, `add_members`, `remove_member`, `get_invite_link`, `join_group`, `complete_group`, `leave_group`, `delete_group` |
| Expenses | `add_expense`, `list_expenses`, `get_expense`, `get_group_summary` |
| Settling | `get_balances`, `settle_up`, `list_pending_settlements`, `respond_to_settlement` |
| Invites | `list_my_invites`, `respond_to_invite` |
| Monthly bills | `list_recurring_bills`, `add_recurring_bill`, `update_recurring_bill`, `delete_recurring_bill` |

Contracts:
- **Identity** comes only from the verified credential (`routes/mcpRoutes.js`, incl. `firebaseUid` for legacy creator ids). No tool takes a user id to act as.
- **Writes reuse the REST controllers** via `services/mcp/bridge.js` (in-process fake req/res). Validation, permissions, settings lock, receipt policy, consent rules for adding people, notifications and live updates are therefore identical to the app. 4xx messages are passed to the client; 5xx are logged and reported generically.
- **References**: `group` accepts a name (exact, then contains) or id, resolved only among the user's own groups (`services/mcp/resolve.js`); members accept name / first name / email / "me". Ambiguity returns the candidates as an error instead of guessing.
- **Safety**: every tool has annotations (`readOnlyHint` / `destructiveHint`); `delete_group` requires `confirmName` equal to the group name; `add_expense` refuses an identical bill (same group, payer, description, amount) within 10 minutes unless `allowDuplicate: true`; receipt-required groups are refused (no photo upload over MCP); expenses cannot be edited or deleted (no REST endpoint exists).
- **Results** are one JSON text block; write tools include a `summary` sentence.
- Tests: `tests/mcpServer.test.js` (unit, fake models), `tests/mcpTools.int.test.js` (real MCP client + controllers + MongoDB, part of `npm run test:int`).

## Autopilot

MCP uses authenticated per-request server instances and JSON text content/error responses; group reads enforce membership. HTTP transport/auth is `routes/mcpRoutes.js` and OAuth services. Raw MCP does not currently provide the new transactional expense approval contract.

Autopilot's internal in-process allowlist is strict: `create_group`, `set_group_budget`, `create_expense`, `read_summary`, `monitor_budget`. Extraction cannot supply actor IDs, SQL, arbitrary tool names or arbitrary fields. `contracts.js` is the authoritative JSON schema implementation. `domain.js` authorizes each write and uses shared business validators/persistence; it is never exposed directly to an LLM.

Run routes under `/api/agent` require normal Firebase auth. POST `/runs` accepts `{message,groupId?,requestKey:UUID}`; GET `/runs`, GET `/runs/:id`, GET `/runs/:id/events`, POST `/runs/:id/cancel`, POST `/runs/:id/resume` operate only on owned accessible runs. POST `/runs/:id/decision` requires `{decision,planVersion,payloadHash,approvedStepIds}`. Approval requires all mutation step IDs and the exact displayed hash/version. Unsupported fields return 400; unavailable identity/scope returns 404; stale/replayed approval returns 409; disabled execution returns 403. The overall feature returns 404 when off or in production.

Budget routes: GET `/monitors`, POST `/monitors/check`, PATCH `/monitors/:id` with `{enabled:false}`. Enabling always requires a new reviewed monitoring plan. SSE event IDs are persisted array positions; reconnect with `Last-Event-ID` or `?after=` and a Bearer header. Events are `run.started`, `planning.started`, `step.proposed`, `clarification.required`, `plan.ready`, `plan.approved`, `plan.rejected`, `step.verified`, `run.failed`, `run.completed`, `run.cancelled`. Streams end after a terminal/waiting state or a finite poll window; reconnect/read the run for authoritative state.
