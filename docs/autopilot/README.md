# SplitEase Autopilot — local implementation

Autopilot is **off by default**, with an additional hard stop in `NODE_ENV=production`. No server, migration, model call, background worker, payment, notification delivery or deployment was started during implementation. Existing manual workflows remain available.

## Implemented

- Authenticated Express `/api/agent` routes with strict Zod input/intent/plan validation, actor-scoped ownership, per-read membership checks and rate limiting.
- MongoDB runs/checkpoints, immutable hashed plan, approval audit, per-step transactional execution ledger, 30-day run retention, request-key deduplication and reconnectable SSE events.
- Local deterministic grammar (no model credentials/calls); optional extraction through the existing Gemini service when explicitly configured.
- New group creation (creator only), budget setup, self-paid equal/custom exact expenses, canonical split rounding, authoritative balance/settlement suggestions, consented budget rules.
- Financial mutations require separate execution flag plus a matching saved full-plan approval. Writes/readback and the execution ledger commit in the same MongoDB transaction. Double approval is refused; resume skips committed steps. No destructive compensation.
- Context fingerprints reject changed groups/expenses. Reauthorization runs before approval, execution, readback and event polling. Cancellation prevents later steps, preserving already committed results.
- `/autopilot`: group selector, prompts, proposed/verified cards, exact shares, approval/reject/edit/cancel/resume, recoverable run URLs, recent history, manual alternative, on-demand budget checks, deduped in-app notices and disable controls.

## Run yourself

Use **an isolated local/test database**, not a production connection or real financial records. Execution uses MongoDB transactions and therefore needs a replica set (a local single-node replica set works). A standalone MongoDB will refuse transactional execution without persisting financial changes.

Install with `npm ci` separately in `backend` and `frontend`. Existing `.env.example` files describe the normal Firebase/database configuration. Copy the following into your **local** env files, without replacing existing credentials:

Backend `.env`:

```dotenv
NODE_ENV=development
AUTOPILOT_ENABLED=true
AUTOPILOT_WRITES_ENABLED=false
AUTOPILOT_PROVIDER=local
```

Frontend `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_AUTOPILOT_ENABLED=true
```

Then start each yourself with `npm run dev` and visit `/autopilot` after signing in. Next.js public flags are read at build/start time; restart after changing them. `NODE_ENV=production` deliberately refuses the new backend endpoints even if the flags are true; use development mode for this local feature.

Begin with planning only. To test approved writes, explicitly change **only your local backend** `AUTOPILOT_WRITES_ENABLED=true` and restart it. Approval is still required for every run. To stop everything, set `AUTOPILOT_ENABLED=false`; hiding the frontend alone is not an API kill switch.

Optional natural language/Hinglish extraction: `AUTOPILOT_PROVIDER=gemini` uses the existing `GOOGLE_API_KEY` and configured provider timeout/retry behavior. This sends the request and accessible group names to that provider. Local mode makes no LLM calls and intentionally clarifies unsupported phrasing.

Mongoose creates new collections/indexes using the application's normal model initialization. If your development configuration disables automatic index creation, create the declared indexes before testing (especially actorId/requestKey, monitor owner/group and notice eventKey uniqueness). No schema migration was executed.

## Manual acceptance sequence

1. With both backend flags false, authenticated `/api/agent/capabilities` returns 404; frontend route shows disabled state.
2. Enable planning locally. Select no existing group and enter `Create group Goa Trip; budget ₹40,000; add hotel ₹8,000 paid by me equally`. The preview is creator-only: ₹8,000 to you. No other people are silently created. Check the normal dashboard still has no new group before approval.
3. Enable writes locally. Approve that plan. Verify group, budget and expense in the normal group screen. Reload `?run=<id>` and confirm each completed step has a saved verified result.
4. Invite Aman/Priya through existing manual controls, then select that group for future plans. `Add dinner ₹3,600 paid by me equally` must split using the current members and canonical rounding.
5. Double-click/retry approval or call resume on a currently running run. Verify one record per committed step. Repeated create requests with the **same** UUID requestKey return the same run. A different run/requestKey intentionally creates a fresh proposal and always requires another approval.
6. Change membership/settings or add an expense after preview, then approve: expect stale-context refusal. Edit the request to create a new plan. A run never automatically replaces its approved payload.
7. Budget changes after expenses must respect the existing settings lock. Another payer or missing required receipt must clarify/refuse rather than bypass policy.
8. `Monitor 75%, 90%, 100%` previews explicit consent. Approve then choose **Check budgets**. Repeated checks create at most one notice per rule/budget/threshold. Disable alerts and ensure checks create no new notices. There are no periodic checks.
9. Inspect another user's run ID or a run whose group you have left: expect 404. Cancel a run while it executes and inspect exact committed results. No payment/debt confirmation is performed.
10. Simulate a failure or restart mid-run; use Resume saved run. Committed step ledger entries must be skipped; changed context must stop remaining actions. On replica set transaction failures, inspect the saved failure instead of assuming success.

## Automated checks for you to run

```sh
# backend
npm test -- --watchman=false --runTestsByPath tests/autopilot.test.js tests/autopilotExecution.test.js tests/pureLogic.test.js tests/groupTypes.test.js
npm run test:int
# frontend
npm run lint
npm run build
```

The added test suite covers strict contracts, unknown tools/identity spoofing, decimal conversion, canonical rounding, exclusions, ambiguous names, payer/receipt/currency/settings policy, approval tampering/version/replay checks, 30 example/hostile prompts, randomized amount conservation, and mocked execution tests for missing approval, kill switch, resume, partial success, ownership denial and stale context. It does not prove database crash recovery or concurrent domain writes; run the manual replica-set failure scenarios as well.

## Scope and remaining blueprint phases

This is a local MVP implementation, **not the entire production launch checklist**. The following are deliberately not represented as completed:

- Existing-system audit documents are code-based observations; no production latency/cost baseline or security certification has been measured.
- LangGraph and BullMQ/Redis are not installed. A sequential persisted orchestrator in `run.service.js` uses the existing MongoDB stack; each transaction is a durable checkpoint. This avoids adding runtime infrastructure for the local MVP. An actual LangGraph checkpoint adapter and durable queue worker remain future integration work.
- The internal capability boundary uses authorized domain services in process rather than a remote MCP round trip. Existing MCP tool names and security differences are documented separately. No new externally callable financial MCP tools are exposed.
- The API plans/executes within the HTTP request; UI polls a saved run during execution. Authenticated SSE supports event replay, but the UI currently uses polling. A frontend disconnect does not undo a server commit. Interrupted *planning* requires a new request; committed financial *execution* can resume.
- Invitations, editing past expenses, percentage/shares/itemized natural-language intent, FX, receipts/OCR, periodic schedules, preference memory and duplicate-audit UX are not new Autopilot capabilities. Use existing manual screens where available. Phase 4 remains deferred as the supplied blueprint recommends.
- Monitoring is **on-demand only**, not Phase 3 background automation. There is no queue, timer, email/push, recurring job or deployment. Timezones/daily summaries require the future scheduler.
- Per-step ledger/financial writes are atomic on a replica set. Full serializable coordination with all legacy manual expense operations is not proven: those controllers do not yet use a unified group transaction/version protocol. Keep the production block until those races are covered by integration tests.
- Existing notification/referral/socket side effects belong to the manual controller and are not replayed from Autopilot. Verified records appear on dashboard refresh. A transactional outbox is needed before adding those effects to execution.
- Batch approval is all-or-nothing for the displayed steps; edit to produce a different plan. There is no partial-step approval or automatic plan regeneration.
- No telemetry/cost dashboard, benchmarked intent-validity percentage, production rollout, workers or payment behavior is claimed.

## Verification performed during implementation

Backend JavaScript syntax checks and `git diff --check` passed. Isolated planner/contract/execution and existing split/group-policy tests passed (122 tests across four suites); they use mocks and do not start a server or connect to a database. Targeted frontend ESLint passed. Dependency installation succeeded with the existing lockfiles and lifecycle scripts disabled. No app startup, production build, database integration test, live provider call or deployment was performed.
