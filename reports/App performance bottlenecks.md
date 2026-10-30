# Unbounded reads and inline work slow SplitApp

SplitApp is slow mainly because it does unbounded, whole-history work on the request path, not because of any single exotic flaw. On the backend, the heaviest paths load every expense or chat message a user has ever generated and then compute in JavaScript. Examples are `getExpenses` (three populates, no limit), `getGroupMessages` (full chat history plus two writes on every read), user analytics (aggregated in JS), balances (recomputed from all expenses per request), and the AI endpoint (the entire expense history stuffed into one prompt and sent to a blocking, non-streaming, no-timeout LLM call). Receipt OCR and SMTP email also run inline inside the request. On the frontend, every authenticated page is client-rendered and fetches only after hydration and Firebase auth restore, with no data cache, so each navigation re-fetches and shows a spinner. A render-blocking `@import` of nine Google Font families, a 37 MB `public/` folder of multi-MB PNGs, and no response compression add to first-load cost. The backend runs as a single pm2 process on a small AWS EC2 box, so CPU-heavy work competes with everything else. All of this comes from code reading, not profiling: the ranking reflects code shape, and real data volumes and timings are unknown. The cheapest fixes (compression, fonts, image conversion, indexes, pagination) should come first, then confirm with measurements before the larger refactors (materialized balances, background job queue, streaming AI).

## The slowest paths scan a user's entire history

The backend audit found few classic N+1 loops; most controllers already batch lookups, use `.lean()`, and have an auth cache and a 30 s balance cache. What remains is unbounded scale. `getExpenses` returns **all expenses of a group with no limit** and populates `paidBy`, `payers.userId` and `splits.userId`, so cost grows with expenses times splits (`backend/controllers/expenseController.js:365-370`). `getGroupMessages` loads the whole group chat with a populate, while the 1:1 chat endpoint is already paginated with a 100-message cap and `_id` cursor (`groupChatController.js:43-46` vs `chatController.js:170-174`). It also performs two writes before every read: a `$pull` on the user and an `updateMany` adding to `seenBy` across every unseen message. The `$ne` on an array cannot use an index, so it scans the group's message history each time the chat opens (`groupChatController.js:27-41`).

The dashboard is the next hot spot. `getUserAnalytics` fetches every expense the user paid or took part in, then aggregates by category and month in JS with dayjs; its `$or` on `paidBy`/`participants` with a negated regex on `description` cannot be served by an index alone. It runs on every dashboard load (`userAnalyticsController.js:17-23, 94-153`). Its "recent 5" query sorts on `{date, createdAt}` with no `{paidBy,date}` or `{participants,date}` compound index, forcing an in-memory sort. Balances have the same shape: `computeGroupBalances` reads every expense of a group and loops over every payer and split (`balanceController.js:70-95`), cached for 30 s on only one endpoint. `getMyBalanceSummary` reads every expense in every active group with no cache, and settlement create/confirm re-scan uncached (`expenseController.js:460, 591`). A heavy user can therefore trigger several full-history scans per dashboard load. The single most expensive request is `/api/ai`. `buildUserContext` runs a serial `for (const group of groups) await Expense.find(...).populate(...)` with no date window or projection, writes every expense and split into markdown, and sends it as input tokens. Only the user's prompt (8,000 chars) and chat history (12 turns) are capped, not the database context. The Gemini and OpenAI services then try fallback models in sequence, each with no explicit timeout, and nothing is streamed (`services/contextBuilder.js:49-171`, `controllers/aiController.js:79-168`, `services/geminiService.js:7-40`). Two caveats apply: nothing was measured with `explain()`, and whether the declared indexes are actually built in production is unverified. The "smart query" regex shortcut still loads all expenses and computes in Node, so it only partly mitigates the AI cost.

## Slow third-party work blocks the response

Several operations that should be asynchronous run before the response is sent. `addExpense` awaits receipt OCR (`await runOcr(fileUrl)`) before `Expense.create`. The OCR service uses one shared Tesseract worker, so concurrent receipt uploads queue, and there is no timeout, size check or PDF filter even though uploads accept PDFs that Tesseract cannot read (`expenseController.js:241-251`, `utils/ocrService.js`). Nothing downstream reads `ocrText` for balances, so it can safely be filled in afterward. Uploads are base64 strings inside JSON bodies up to 10 MB, buffered and parsed in the main process, then pushed to Cloudinary inline, then re-downloaded by OCR (`index.js:109`, `uploadController.js:22-53`); chat media follows the same pattern. Signup and password-reset emails are awaited over SMTP, whose retry logic can stretch a request to several timeouts plus backoff (`authController.js:201, 479, 657`, `utils/emailService.js:52-69`). Most push notifications are already fire-and-forget (`void createNotification`), so that path is fine for users, although Expo and FCM are sent sequentially and the Expo `fetch` has no timeout.

Smaller backend costs round out the picture. There is **no `compression` middleware** and no rate limiting outside the MCP router, so large JSON goes out uncompressed on mobile networks and heavy endpoints are unthrottled (`index.js:71-115`). `mongoose.connect` is called with no pool, timeout or compressor options (`config/db.js:5`). Auth is mostly well optimized with a 60 s token cache, but concurrent cache misses are not de-duplicated, so a page load firing 5-15 requests can each run Firebase verification plus a user upsert. The socket `register` and `disconnect` handlers do global `io.emit("userStatus")` broadcasts and database writes on every reconnect, which hurts on flaky mobile connections. The deploy workflow shows a small EC2 instance run by pm2 where `npm ci` was OOM-killed and needed a 2 GB swapfile, a strong sign of a memory- and CPU-constrained host (`.github/workflows/deploy.yml`). One working hypothesis from the research was a free-tier cold start (Render's free tier spins down after 15 minutes idle, per [Render docs](https://render.com/docs/free)), but the repo has no Render configuration; deployment is EC2 plus pm2, so cold starts are evidenced only at deploy-time restarts, when the Tesseract worker and Firebase init re-warm.

## The frontend renders late and ships heavy assets

Every authenticated page (dashboard, group detail, chat, AI, profile, users) is a `"use client"` component that fetches in `useEffect` once the Firebase token arrives. The chain runs JS download, hydration, Firebase IndexedDB restore (with a fail-safe of up to 6,000 ms), `getIdToken`, then the API call and render (`app/dashboard/page.jsx:47-50`, `context/AuthContext.jsx:19-45`). There is no SWR or React Query, so the same endpoint (for example `/users/me`) is fetched from several components and re-fetched on every navigation. The group page fires **seven independent requests** in one effect, and each realtime `groupUpdate` re-downloads balances, expenses, settlements and summary, including the full expense list for a single new expense (`app/groups/[id]/page.jsx:179-211`). The `fetchGroup` handler also sets `loading` true, so a background refresh can flip the whole page back to a spinner. Because Firebase auth is client-side only, the token never reaches the Next server, which makes server-component prefetching hard; the practical fix is a client cache plus an aggregate endpoint.

The largest first-paint cost is probably `app/globals.css` line 1, a render-blocking `@import` of Google Fonts covering about nine families with up to seven weights each, stacked on three families already self-hosted via `next/font`. A **310 KB compiled CSS chunk** is also render-blocking on every route. Static assets are heavy: `public/` is **37 MB**, including 24 MB of blog PNGs at 0.6-2.4 MB each, a 1.8 MB hero poster for a small video, and several multi-hundred-KB logos. Only eight places use `next/image` versus about twenty raw `<img>` tags, including the blog article page, where multi-MB covers bypass resizing and WebP/AVIF. The build emits 3.8 MB across 82 chunks, with a 367 KB chunk containing recharts; the dashboard, group page, chat and AI pages import modals and framer-motion statically with no `next/dynamic`. The root layout also ships Firebase auth, socket.io, the notification system, a custom cursor and an install prompt to every route, including static marketing pages. Secondary issues: provider values are unmemoized object literals wrapping the whole app, two separate socket.io connections open per session, chat lists are neither virtualized nor paginated, and bare `socket.off("newMessage")` calls remove other components' listeners, a correctness bug. Bundle numbers are uncompressed and no analyzer or Profiler was run, so the recharts chunk's route mapping and re-render counts are unconfirmed. Current Next.js guidance matches these gaps: place Suspense boundaries near dynamic data, keep the LCP element outside them, lazy-load heavy client components, and inspect bundles with the built-in analyzer ([Next.js streaming](https://nextjs.org/docs/app/guides/streaming), [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling)).

## A prioritized plan: quick wins first, measure throughout

Measure before and after each change. MongoDB's profiler is off by default; level 1 logs operations slower than `slowms` (default 100 ms), but it can itself degrade performance, so MongoDB suggests the Atlas Query Profiler or Performance Advisor first ([MongoDB profiler](https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/)). Run `explain("executionStats")` on the top offenders and look for COLLSCAN, high docsExamined versus nReturned, and in-memory sorts. For Node, use Clinic.js Doctor or `perf_hooks.monitorEventLoopDelay` under an autocannon load test (third-party guides suggest P99 event-loop delay above 50 ms indicates blocking; [DEV: Node.js profiling](https://dev.to/zyvop/nodejs-performance-profiling-finding-the-bottleneck-before-your-users-do-bnm)). Add per-route timing logs, and for the frontend run `next analyze`, Lighthouse and Chrome DevTools network timing. Also capture real expense and message counts per group, since the point at which scans dominate is unknown.

| Tier | Action | Why and expected effect |
|---|---|---|
| Quick win (hours) | Add `compression()` (or proxy gzip); set `NODE_ENV=production` | Large list JSON shrinks sharply; Express docs cite gzip and production mode as basic wins ([Express performance](https://expressjs.com/en/advanced/best-practice-performance.html)) |
| Quick win | Delete the Google Fonts `@import`; keep only fonts actually used via `next/font` | Removes the likely biggest render-blocking chain |
| Quick win | Convert `public/` PNGs to WebP/AVIF, use `next/image` on blog, careers, download and security pages | Cuts up to ~37 MB of weight and the 1.8 MB hero poster |
| Quick win | Add indexes: `{paidBy,date}`, `{participants,date}`, `{groupId,isSettlement,date}`, `Message {conversationId,_id}`, `GroupMessage {groupId,_id}`; drop redundant `groupId` | Removes in-memory sorts; follow the Equality-Sort-Range rule ([MongoDB ESR](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)); verify with explain |
| Quick win | Add timeouts to LLM, Expo and Cloudinary calls; `Promise.all` the per-group AI queries and the independent queries in `getGroupById`; run Expo and FCM in parallel; `Promise.all` the sequential ChatList calls | Bounds worst-case latency with small code changes |
| Quick win | Send OTP and reset emails in the background; skip OCR for PDFs; de-duplicate concurrent auth cache misses with an in-flight promise map | Removes SMTP and OCR waits from user-visible requests |
| Medium (days) | Cursor-paginate `getExpenses` and group chat (50 per page, `_id` cursor, as the 1:1 chat already does); mark-as-seen only for the returned page; `.lean()` and drop one populate | Stops response size and latency growing with history. MongoDB notes `skip()` slows with offset while range queries use the index ([MongoDB skip](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)) |
| Medium | Move analytics and balance summaries to `$group` aggregations returning only totals; short per-user cache invalidated on expense writes | Replaces whole-history JS loops on the dashboard |
| Medium | Move OCR to a background step (respond first, then `updateOne({ocrText})`) | Receipt expenses stop waiting seconds on a single Tesseract worker |
| Medium | Frontend: adopt SWR or TanStack Query with a short staleTime and invalidation on mutation; add an aggregate group endpoint; apply socket deltas instead of refetching; lazy-load modals, charts and the cursor; scope providers to logged-in routes; share one socket | Instant cached navigations; fewer requests per group view. TanStack Query serves stale cache within `staleTime` ([TanStack defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)) |
| Larger refactor | Stream AI answers via SSE and cap context (recent N months plus per-group totals; cache the built context 30-60 s) | The biggest single latency; streaming shows text immediately, and the Claude API supports SSE streaming ([Claude streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)); behind nginx set `X-Accel-Buffering: no` ([Next.js streaming](https://nextjs.org/docs/app/guides/streaming)) |
| Larger refactor | Materialize per-group balances updated with `$inc` on expense create/edit/delete, plus a reconciliation job | O(1) balance reads; MongoDB's computed pattern trades write-time work for cheap reads, and atomic single-document updates are preferred over transactions ([transactions guidance](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)). This is an inference, not a documented expense-app recipe |
| Larger refactor | Direct-to-Cloudinary signed uploads; BullMQ plus Redis for email, push and OCR; shared Redis for caches and rate limits; larger instance or pm2 cluster | Removes 10 MB body parsing and in-process background work; BullMQ requires `noeviction` Redis ([BullMQ production](https://docs.bullmq.io/guide/going-to-production)); cluster only helps once caches are shared |

Order matters for risk. Indexes and pagination are safest and pay off on every list endpoint. Disable `autoIndex` in production and build indexes deliberately, since startup builds can hurt performance; this advice is community-sourced ([Mongoose issue #14602](https://github.com/automattic/mongoose/issues/14602)). Paginated endpoints need matching client changes (infinite scroll or "load more"), and balance materialization must reproduce the existing per-step `to2` rounding. Expo's push limits (100 messages per request, 600 per second per project) matter once pushes move to a queue ([Expo push](https://docs.expo.dev/push-notifications/sending-notifications/)).

## Conclusion

The pattern across both halves is that work scales with total history rather than with what is on screen. A dashboard, a group page and an AI question each re-read everything, and the client has no cache to absorb the repetition. That makes pagination, aggregation and caching the shared fix, and it suggests the pain will worsen for exactly the most engaged users. The infrastructure (one small EC2 process with in-memory caches) amplifies this, and it also constrains the fixes: in-memory auth and balance caches stop working if you scale to a cluster, so Redis should arrive together with any multi-process move.

Two parts of the investigation were deliberately left unresolved. No profiling, `explain()` output, production index list, group-size distribution or proxy compression status was available, so the order within the top five backend items (expenses list, group chat, analytics, balances, AI) is a judgment from code shape. Whether Atlas tier connection limits or an upstream proxy already compress responses could change the quick-win value. Spending a day on slow-query logging and a load test before the medium and large work will show which of the five dominates real traffic and keep the effort aimed at measured wins.

## Implementation status and measured results (2026-10-30)

Phase 1 and Phase 2 quick wins have been implemented in the working tree (not committed or deployed). The hard constraint was that the mobile app and the web app share one live backend, so every backend change keeps default responses identical and new behavior is opt-in.

### What changed

| Area | Change | Compatibility |
|---|---|---|
| Backend | HTTP compression added (skipped for `/mcp` and streamed responses) | Transparent to all clients |
| Backend | Compound indexes `{paidBy,date}` and `{participants,date}` on expenses | Additive only |
| Backend | Mongo `serverSelectionTimeoutMS: 15000` | Fails fast if DB unreachable |
| Backend | Opt-in pagination: `GET /expenses/:groupId?limit=&cursor=` and group chat `?limit=&before=` | No `limit` returns the legacy full array, unchanged |
| Backend | AI context queries run in parallel; `getGroupById` and group-chat open run independent queries/writes together | Same output (verified byte-identical) |
| Backend | Expo and FCM pushes sent in parallel (`allSettled`); Expo call has 15 s timeout | One channel failing no longer blocks the other |
| Backend | Timeouts: LLM 90 s, OCR 30 s (expense still saves without OCR text on timeout) | Only bounds hangs |
| Backend | Auth middleware shares one in-flight Firebase verify + user upsert per token | Same results and error responses |
| Frontend | Render-blocking Google Fonts `@import` (9 families) removed; the 3 families actually used moved to `next/font` | Visual check recommended |
| Frontend | Blog author photo (1.6 MB) served via `next/image` | None |
| Frontend | Chat list fetches `/users/me` and contacts in parallel; group page realtime refreshes no longer flash the full-page loader; identical in-flight GETs are shared | None |

### Deliberately not done (compatibility risk)

- Moving OCR after the response: the mobile app is outside this repo and may read `ocrText`.
- Sending signup/reset emails in the background: changes user-visible failure behavior.
- Capping or streaming the AI context: changes answers.
- Materialized balances and a SWR/React Query cache: larger changes, to be done one at a time with measurements.

### Benchmark (median of 5, local MongoDB, 5,000 expenses and 5,000 chat messages in one group)

| Test | Before | After |
|---|---|---|
| Group expense list, time | 475 ms | 12 ms (first page of 50) |
| Group expense list, JSON size | 5,492 KB (78 KB gzipped) | 55 KB (1 KB gzipped) |
| Group chat, time | 125 ms | 7 ms (latest 50) |
| Group chat, JSON size | 2,289 KB (39 KB gzipped) | 23 KB (1 KB gzipped) |
| AI context build, 12 groups, no DB latency | 484 ms | 421 ms |
| AI context build, 12 groups, simulated 25 ms DB round trip | 1,241 ms | 596 ms |

The AI context output was identical before and after.

### Caveats

- Measured on a local database with near-zero network latency; production (Atlas) timings were not measured, and round-trip savings should be larger there.
- The paginated gains apply only once clients send `limit`. The web group page and chat do not yet, so current web and app users still receive full lists. Compression benefits everyone immediately.
- Font, image and double-fetch changes build and lint cleanly but were not timed in a browser; run Lighthouse before and after deploy.

### Verification

- Backend unit tests: 489 passed. DB integration tests against a real local MongoDB: 35 passed, including new `backend/tests/pagination.int.test.js` (legacy shape unchanged, every item returned exactly once when paging, tie-broken dates, bad cursor returns 400, non-member returns 403).
- Frontend: lint clean, 103 tests passed, production build succeeds.

### Before deploying

1. Run `npm ci` on the server (new `compression` dependency).
2. Smoke-test one group page and one chat locally (`npm run dev`), and check the serif, handwritten and sidebar fonts look unchanged.
3. Expect a one-time index build on first startup.

### Next step

Add "load more" to the web group page and group chat so they send `limit`, then re-measure with real Atlas data.
