# Financial invariants

- Actor is Firebase-attested server context. Members, payer and group references never grant permission by appearing in text.
- Existing ledger stores major-unit Numbers. This implementation does not migrate historical records. New Autopilot monetary previews/payloads use bounded integer minor units and convert at the existing domain boundary.
- Existing currencies with a two-decimal policy are supported. JPY/IDR/VND planning is blocked pending dedicated currency rules; FX never inferred.
- `expenseSplits.js` is the unchanged existing split calculator; both manual and agent paths share it. Exact preview shares must be nonnegative and sum **exactly** to amountMinor, stricter than the legacy exact-split tolerance. Unsafe tiny equal splits are refused.
- Authenticated user is the sole permitted payer. Current group membership, required receipt policy and settings lock remain mandatory. New groups contain only the creator; people join through the existing manual consent flow.
- No mutation before saved approval of immutable payload/version/hash. No schema-valid model output establishes success.
- Each step's mutation, readback and execution result commit in the same MongoDB transaction; no financial side effect occurs outside that boundary. The ledger key is run:step:version. Requires a replica set.
- Changed approved context stops remaining actions; cancellation preserves the committed-step timeline. No automatic deletion/reversal, payment or settlement confirmation.
- Shared persistence is `services/expenseLedger.js`. Existing notifications/referrals/realtime remain manual-controller effects; agent execution does not replay them.

Production remains blocked until mixed manual/agent concurrent mutations, process crashes, unknown commit outcomes and revoked membership are exercised against a replica set. No live financial testing was performed.
