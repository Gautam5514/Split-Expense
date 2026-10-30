# Performance best practices: Node/Express + MongoDB (Mongoose), Next.js, Expo (expense-splitting app)

Research date: 2026-10-30. Coverage note: Redis cache-aside patterns, helmet cost, TanStack Query v5 persistence docs, Mongoose populate/projection docs, OCR-specific tuning and APM vendor comparisons were NOT directly fetched (see Gaps).

## 1. Balances, MongoDB indexing (ESR), pagination, lean, projections

### Takeaway
Index compound keys by Equality, Sort, Range; paginate with a range (cursor) query on an indexed field instead of skip(); use lean() on read-only routes. For balances, MongoDB documents a "computed" precomputed-value pattern (cheap reads, must be kept in sync on write); prefer atomic single-document updates over multi-document transactions.

### Cited Findings
- ESR: equality fields first, then sort fields, then range fields in a compound index; placing sort before range avoids in-memory sorts. Example: query `{directors, runtime<130}` sorted by `year` gets index `{directors:1, year:1, runtime:1}`. — [MongoDB ESR guideline](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)
- `$ne`, `$nin`, `$regex` count as range operators; `$in` with fewer than 201 elements acts like equality when sorting (threshold not guaranteed across versions). Verify with `explain` and force with `hint()` for testing. — [MongoDB ESR guideline](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)
- `skip()` must scan from the start of the result set, so it slows as offset grows; range queries (`_id < lastSeen`, sort `_id:-1`, limit N, store last value) use the index and scale better. ObjectId ordering is only approximate (1-second resolution, client clocks), so use a unique tiebreaker for strict ordering. — [MongoDB cursor.skip()](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)
- `lean()` returns plain JS objects, skipping hydration; faster and lower memory; JSON output is identical, so network payload does not shrink. Loses change tracking, casting, getters/setters, virtuals, `save()`. Use for read-only GET routes. Populate still works with lean. — [Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html)
- Computed pattern: a precomputed value needs one read; cost is refreshing it, either on each write affecting the source data or in a periodic job (periodic means not guaranteed exact). Suited to repeated identical calculations with high read:write ratio. Financial running balances cited as a fit by one third-party guide, which does not show concurrency handling. — search result summarising [MongoDB computed pattern docs](https://mongodb.com/docs/manual/data-modeling/design-patterns/computed-values/computed-schema-pattern/) (direct fetch of the older URL returned 404; claims from search snippet)
- Multi-document transactions: default 1-minute lifetime, 5 ms lock wait before abort, write conflicts abort the transaction when outside writes touch the same documents; MongoDB recommends atomic single-document operations (embed related data) where the model allows. — [MongoDB transactions production considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
- Mongoose autoIndex is commonly disabled in production (startup index builds can hurt performance); build indexes in a deploy step; `syncIndexes()` can drop indexes not in the schema so run deliberately. Community-sourced (GitHub issues/Stack Overflow), not official docs. — [Mongoose issue #14602](https://github.com/automattic/mongoose/issues/14602)

### Inferences
- For groups with many expenses, store per-group per-member net balance (or per-pair balance) as a denormalized field updated with `$inc` in the same atomic write path as expense create/edit/delete/settle; keep a reconciliation job (aggregation recompute) to detect drift. This follows from the computed-pattern and atomic-update guidance but is not a documented expense-app recipe.
- Typical expense/chat list queries (`{groupId} sort {createdAt:-1}`) map to index `{groupId:1, createdAt:-1, _id:-1}` and cursor pagination on `(createdAt,_id)`.
- Mid-size groups likely do not need transactions if balance updates are `$inc` on one document; use transactions only when multiple documents must change together, accepting conflict/retry cost.

### Gaps
- No authoritative source found comparing running balances vs aggregation at scale for ledger-like apps, nor Splitwise-style debt simplification performance.
- Projection best-practice page not fetched; rely on general knowledge (`select`/projection reduces transfer and memory).
- Mongoose official index docs not fetched.

## 2. Caching (Redis, HTTP cache headers/ETag, SWR / TanStack Query)

### Takeaway
For user-specific API JSON use `Cache-Control: private, no-cache` plus ETag so the client revalidates cheaply (304); on clients use TanStack Query/SWR staleTime to avoid refetching; add server Redis caching only for expensive repeated reads. Never mark authenticated responses `public`.

### Cited Findings
- ETag is an opaque validator; client sends `If-None-Match`, server replies 304 with no body if unchanged. — [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- `private` limits storage to the browser cache; a cookie alone does not make a response private; `public` can make Authorization-bearing responses storable and is risky. MDN's example for user-specific JSON (balance) is `Cache-Control: private, no-cache` with ETag. — [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- `stale-while-revalidate` (RFC 5861) lets a cache serve stale content while revalidating; MDN page did not cover it, so the description is general knowledge; check browser/CDN support. — [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- Express docs: cache results of identical requests using a caching server (Varnish, Nginx caching); use a shared store such as Redis for sessions/state across instances. — [Express performance best practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- TanStack Query: cached data is stale by default; `staleTime` (e.g. 2 min) serves from cache; `Infinity` avoids staleness refetch; `'static'` ignores invalidation. — search result summarising [TanStack Query important defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- On React Native, online/offline detection and cache persistence must be set up manually (NetInfo + async-storage persister, resume paused mutations). Source is a single community blog, possibly outdated. — [DEV: RN offline-first with TanStack Query](https://dev.to/fedorish/react-native-offline-first-with-tanstack-query-1pe5)

### Inferences
- Balances/expense lists: short staleTime (e.g. 15-60 s) plus invalidation on mutation, plus push-triggered invalidation, gives snappy mobile UX without a server cache.
- Server Redis cache (if added) should be keyed per group with version/ETag invalidated on any expense write; the same Redis could back BullMQ and rate limits (but see BullMQ eviction note below: use a separate Redis or noeviction).

### Gaps
- No fetched source on Redis cache-aside patterns, TTL/stampede protection, or Next.js `use cache` details for this app.
- Did not verify current TanStack persistence package names/APIs.

## 3. Offloading heavy work (queues, workers, LLM streaming, push, OCR)

### Takeaway
Move push/email/OCR to a BullMQ queue with a separate worker; use worker-thread pools (not per-request threads) for CPU-bound work; stream LLM output to the client; batch Expo pushes in groups of 100 with the official SDK.

### Cited Findings
- BullMQ production: set Redis `maxmemory-policy` to `noeviction` ("the only setting that guarantees correct behavior"); enable AOF; keep `maxRetriesPerRequest: null` for Workers; disable `enableOfflineQueue` for Queue instances so calls fail fast; attach `error` handlers; handle SIGINT/SIGTERM with `await worker.close()`; configure auto-removal of completed/failed jobs; job data is plain text, so avoid secrets. — [BullMQ going to production](https://docs.bullmq.io/guide/going-to-production)
- Express: CPU-heavy work (image processing, large parsing, crypto) blocks the event loop; use `worker_threads` via a pool such as piscina, not a worker per request; workers do not replace clustering. Avoid sync APIs and `console.log` in production; use Pino. — [Express performance best practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- Expo push: up to 100 messages per request; up to 1,000 ticket IDs per receipt request; payload max 4 KiB; limit 600 notifications/sec/project; exponential backoff on 429/5xx; check receipts ~15 min after sending (cleared after 24 h); stop sending on `DeviceNotRegistered`; the Node SDK limits to 6 concurrent connections. — [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- Claude Messages API supports streaming via SSE (`stream: true`) and SDK helpers in Python/TypeScript. — [Claude streaming docs](https://platform.claude.com/docs/en/build-with-claude/streaming)
- Next.js Route Handlers can stream raw responses via Web Streams; reverse proxies (Nginx) buffer by default, so set `X-Accel-Buffering: no`; compression layers and some CDNs/serverless platforms can buffer and delay first chunks. — [Next.js streaming guide](https://nextjs.org/docs/app/guides/streaming)

### Inferences
- AI assistant: stream tokens to web (SSE/fetch stream) and RN; return immediately for receipt OCR with a job id and poll/push on completion; set explicit request timeouts and cap conversation context (send only recent messages plus a compact group/balance summary). The context-trimming and timeout advice is general practice; no specific source fetched.
- Fire-and-forget push inside request handlers should be replaced by enqueueing a job; chunk by 100 and process receipts in a delayed job.

### Gaps
- Not fetched: LLM prompt caching/token trimming docs, OCR provider performance guidance, SDK timeout configuration, Express SSE specifics (flush behavior with compression middleware).

## 4. Express hardening for speed

### Takeaway
Cheap wins: compression (or at proxy), NODE_ENV=production, async-only code, Pino logging, clustering/multiple instances with a shared rate-limit store, and avoiding free-tier spin-down by using a paid instance or accepting cold starts.

### Cited Findings
- Use gzip via `compression`, or do it at the reverse proxy for high traffic; set `NODE_ENV=production` (docs cite up to 3x improvement); run latest LTS Node; cluster one process per core (stateless app), PM2 `-i max` is one way, though docs now recommend the init system for process management; use a reverse proxy/load balancer. — [Express performance best practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- express-rate-limit: default memory store is per process; use an external store to share counts across nodes (page's `store` option text; inference about per-instance counts is the fetcher's, not stated explicitly); `passOnStoreError` controls fail-open vs fail-closed. — [express-rate-limit README](https://github.com/express-rate-limit/express-rate-limit)
- Render free web services spin down after 15 minutes of no inbound traffic, taking about a minute to wake (community reports vary 30 s to 2 min); filesystem is ephemeral; paid instances remove these limits. Scheduled pinging is a widely used but unsupported workaround. — [Render free docs](https://render.com/docs/free); [DEV: keep Render free tier alive](https://dev.to/hassanyosuf/how-to-keep-your-render-free-tier-app-alive-without-paying-for-it-o8e)

### Inferences
- If the backend is on a free tier, cold starts likely dominate perceived latency for first requests; a paid always-on instance (or external keep-warm ping accepting ToS risk) addresses it. Hosting provider of this app was not verified.
- Free-tier single-CPU instances gain little from cluster; prioritize queue offloading and DB fixes.

### Gaps
- Helmet's actual CPU cost not sourced (generally small, header-setting middleware; unverified here).
- Keep-alive tuning (`keepAliveTimeout`, Mongo `maxPoolSize`) not sourced.

## 5. Next.js App Router best practices

### Takeaway
Stream with Suspense boundaries placed near dynamic data, keep LCP elements outside Suspense, lazy-load heavy client components, move heavy libraries to Server Components, and analyze bundles with `next analyze` (Turbopack, v16.1+).

### Cited Findings
- Streaming sends the static shell first; each `<Suspense>` boundary streams independently; push dynamic access (`cookies()`, `params`, fetches) down to the component that needs it; prefer explicit Suspense over a top-level `loading.js`. — [Next.js streaming](https://nextjs.org/docs/app/guides/streaming)
- Web Vitals: keep LCP element above/outside Suspense; use `preload` prop on `next/image` for LCP images; size skeletons to match content to avoid CLS; Suspense boundaries enable selective hydration that helps INP. — [Next.js streaming](https://nextjs.org/docs/app/guides/streaming)
- `next/dynamic` / `React.lazy` defer Client Components; `ssr:false` only in Client Components; libraries can be loaded on demand via `import()`. — [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)
- `npx next analyze` (v16.1+; `--output` to save, `next analyze export` in v16.4+); `@next/bundle-analyzer` with `ANALYZE=true` for webpack; `optimizePackageImports` for packages with many exports; run chart/markdown/highlighting work in Server Components; `serverExternalPackages` to opt out of bundling. — [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling)

### Inferences
- Dashboard/group pages: render the shell and group header on the server, wrap balances/expense list/chat in separate Suspense boundaries, lazy-load charts, receipt-scanner, and chat widgets.

### Gaps
- Server Component data fetching with the separate Express backend (caching `fetch`, `use cache`) not examined; whether the app uses App Router at all was not verified in code.

## 6. Performance measurement

### Takeaway
Measure before fixing: MongoDB profiler/explain for slow queries, Clinic.js (Doctor then Flame/Bubbleprof) or event-loop-delay metrics for Node, `next analyze` + Lighthouse/web-vitals for the frontend.

### Cited Findings
- MongoDB profiler is off by default (level 0); level 1 logs ops slower than `slowms` (default 100 ms), level 2 logs everything; it can degrade performance, so MongoDB suggests Atlas Query Profiler, Performance Advisor, or `$queryStats` first; `system.profile` is a 1 MB capped collection by default; `slowms` is instance-global. — [MongoDB database profiler](https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/)
- `explain` plus `hint()` to evaluate/force index plans. — [MongoDB ESR guideline](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)
- Clinic.js workflow (third-party write-ups, not official docs): Doctor categorises the problem (CPU, I/O, memory, event loop), Flame for CPU hot paths, Bubbleprof for async/wait; `perf_hooks.monitorEventLoopDelay` for standalone checks; one author's rule of thumb is P99 above 50 ms indicates blocking. — [DEV: Node.js profiling](https://dev.to/zyvop/nodejs-performance-profiling-finding-the-bottleneck-before-your-users-do-bnm); [DEV: profiling in production](https://dev.to/axiom_agent/nodejs-performance-profiling-in-production-v8-profiler-clinicjs-and-flame-graphs-1iad)
- Express: `node --trace-sync-io` finds synchronous calls in development only. — [Express performance best practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- Next.js: verify streaming in Chrome DevTools Network timing (early TTFB, long content download). — [Next.js streaming](https://nextjs.org/docs/app/guides/streaming)

### Inferences
- Suggested order: (1) enable slow-query logging at e.g. 50-100 ms on staging, `explain("executionStats")` the top offenders (look for COLLSCAN, large docsExamined vs nReturned, in-memory SORT); (2) add request timing/Server-Timing logs per route; (3) Clinic Doctor under a load test (autocannon); (4) frontend bundle analysis and Lighthouse.

### Gaps
- Official Clinic.js documentation fetch returned empty; APM options (OpenTelemetry, Sentry, Datadog) and the `web-vitals` library/Lighthouse docs not researched.

## Prioritized playbook (synthesis from the above; priority is analyst judgment)
1. Measure: profiler/explain on slow routes; event-loop delay.
2. Indexes (ESR) for every list endpoint (group expenses, chat messages, notifications); disable autoIndex in production and deploy indexes deliberately.
3. Cursor pagination + `.lean()` + projections on all list/read endpoints.
4. Balances: denormalized per-group balances via atomic `$inc`, with reconciliation job; avoid transactions unless needed.
5. Move push/email/OCR to BullMQ (separate Redis with noeviction, or dedicated instance); batch Expo pushes by 100.
6. Stream LLM responses; cap context; set timeouts.
7. HTTP caching: `private, no-cache` + ETag on GET JSON; TanStack Query staleTime on web/app.
8. Express: compression, NODE_ENV=production, Pino, shared-store rate limiting, avoid cold starts via paid tier.
9. Next.js: Suspense streaming, lazy-load heavy client components, `next analyze`.
