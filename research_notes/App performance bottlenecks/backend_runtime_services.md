# Backend server-side runtime bottlenecks (non-DB) — SplitEase `backend/`

All sources are local code paths (paths relative to `/Users/kunalkumar/Desktop/Gautam/Split/`). Format: [file:line](path). No external web sources were used; this is a pure code audit. Nothing was profiled or load-tested, so impact rankings are inferences from code.

## 1. Express bootstrap (backend/index.js): middleware, compression, rate limiting, socket.io, startup, recurring jobs

### Takeaway
The global pipeline is light (helmet, CORS, JSON parser, recursive sanitizer), but there is NO response compression and NO global rate limiting. The biggest request-path costs are elsewhere. The recurring job and socket handlers are not event-loop blockers, but socket `register` and `disconnect` do heavy fan-out.

### Cited Findings
- Middleware order is helmet -> CORS (+ explicit `app.options("*")`) -> `sanitizeServerErrors` -> `express.json({limit:"10mb"})` -> `express.urlencoded` (10mb) -> `mongoSanitize` -> routes — [backend/index.js:71-115](backend/index.js)
- No `compression` middleware anywhere: it is not in package.json dependencies and a grep for `compression` across backend source finds no usage. Large JSON (expense lists, chat history, AI context) goes out uncompressed unless the reverse proxy gzips (no nginx config is in the repo) — [backend/package.json:13-33](backend/package.json)
- No global/route rate limiting except on the MCP router (`express-rate-limit` is imported only in `routes/mcpRoutes.js`; grep for `rateLimit` elsewhere finds only the nodemailer pool option). So `/api/ai`, `/api/upload`, expense creation (OCR) are unthrottled and can saturate a small box — [backend/routes/mcpRoutes.js:21,56-62](backend/routes/mcpRoutes.js)
- JSON body limit is 10 MB globally because uploads are base64 data-URIs inside JSON bodies, so every upload is fully buffered and JSON-parsed in the main process (base64 inflates by ~33%) — [backend/index.js:109](backend/index.js), [backend/controllers/uploadController.js:24-39](backend/controllers/uploadController.js)
- A second `express.json({limit:"4mb"})` is mounted inside the MCP router (body already parsed by the global parser first, so it is redundant, but harmless) — [backend/routes/mcpRoutes.js:55](backend/routes/mcpRoutes.js)
- No request logging middleware (no morgan); only `console.log` calls. Each socket connect/disconnect/online event logs with emoji strings via synchronous-ish console writes — [backend/index.js:154,199,301,321](backend/index.js)
- Startup: `connectDB()` is fire-and-forget at top level (not awaited before `server.listen`), so the server accepts requests before Mongo is connected; `process.exit(1)` on failure — [backend/index.js:47](backend/index.js), [backend/config/db.js:3-11](backend/config/db.js). Firebase Admin initialises on import (sync cert parse) — [backend/config/firebaseAdmin.js:11-30](backend/config/firebaseAdmin.js)
- Import-time side effects that add boot time and memory: Tesseract worker warm-up at import (`getWorker()` at module load) — [backend/utils/ocrService.js:29-30](backend/utils/ocrService.js); SMTP `transporter.verify()` at import — [backend/utils/emailService.js:37-39](backend/utils/emailService.js); `bcrypt.hashSync(..., 10)` at import in authController (a ~50-100ms sync block, once) — [backend/controllers/authController.js:32](backend/controllers/authController.js)
- Recurring-expense runner: `setInterval` every 15 min (first tick 30s after boot), processes up to 200 rules, sequentially with several awaited DB ops per rule and an awaited `createNotification` (which itself awaits Expo + FCM push). It's async I/O, not CPU-bound, so it does not block the loop, but it runs in the same process and contends for the Mongo pool — [backend/utils/recurringRunner.js:38-95,98-105](backend/utils/recurringRunner.js)
- Socket.IO runs in the same process as the REST API (`new Server(server, ...)`), default transports (polling then upgrade) — [backend/index.js:120-126](backend/index.js)
- Socket `register` does `admin.auth().verifyIdToken` + `User.findOne` + `User.findByIdAndUpdate`, then `io.emit("userStatus", ...)` to EVERY connected client (global broadcast, O(connected sockets) per login). `disconnect` does the same, and iterates the entire `onlineUsers` Map linearly to find the socket — [backend/index.js:157-199,300-324](backend/index.js). On a mobile app with flaky connectivity, reconnects trigger repeated broadcasts + DB writes.
- `markPendingDelivered` on every register: `Conversation.find().distinct` + `Message.distinct` + `Message.updateMany` + one `io.emit` per affected conversation (fire-and-forget, so not in a request path, but spikes DB load at login/reconnect) — [backend/index.js:134-148,205-207](backend/index.js)
- Deployment target is a single small AWS EC2 instance run by pm2 (`pm2 restart split-backend`), and the deploy script notes `npm ci` was OOM-killed (exit 137) on it, forcing a 2 GB swapfile and `--max-old-space-size=512` for install. Strong signal of a memory/CPU-constrained host. No Render/Heroku free-tier config found (no render.yaml/Procfile), so a "free-tier cold start" is NOT evidenced; instead pm2 restarts on each deploy and the Tesseract worker + Firebase init must re-warm — [.github/workflows/deploy.yml:1-45](.github/workflows/deploy.yml)

### Inferences
- (Med) Missing compression raises transfer time on mobile networks for large list/JSON endpoints; easy win (`compression()` after helmet, or enable gzip at the proxy).
- (Med) No rate limiting on expensive endpoints (AI, upload, expense-with-OCR) means one user can starve the single Node process; add per-user limits.
- (Low-Med) Single process on a small EC2 box means any CPU-heavy task (OCR, base64 JSON parse, JSON.stringify of big payloads) competes with all requests. pm2 cluster mode or a larger instance would help; nothing in the repo shows cluster mode.
- (Low) Global `io.emit("userStatus")` scales poorly with concurrent users; use rooms (contacts/groups) instead.
- Cold start: not evidenced on this host type; only deploy-time restarts.

### Gaps
- Whether nginx/ALB in front of EC2 adds gzip, keep-alive, or TLS termination is not in the repo. Instance type is not stated. No Node `--max-old-space-size` for runtime (only install) found.

## 2. Middleware: authMiddleware, sanitize, validate, errorSanitizer

### Takeaway
Auth is already well-optimised: a 60 s in-memory token cache avoids Firebase + DB on repeat calls. The cache-miss path costs one Firebase `verifyIdToken` plus one atomic user upsert; that is the dominant per-request cost on the first request after each token/minute rollover. Sanitize and errorSanitizer are cheap for normal payloads.

### Cited Findings
- Cache hit path: Map lookup, LRU refresh, shallow copy, `next()` — no I/O — [backend/middleware/authMiddleware.js:16-23](backend/middleware/authMiddleware.js)
- Cache TTL is only 60 s and max 5,000 entries; so every user pays the miss path at least once per minute of activity (verifyIdToken + `findOrCreateUser` DB upsert + fire-and-forget `recordActiveDay`) — [backend/utils/authCache.js:6-8](backend/utils/authCache.js), [backend/middleware/authMiddleware.js:29,55-61,71](backend/middleware/authMiddleware.js)
- On a cache miss with several concurrent requests (a page load fires 5-15 requests per the cache comment) there is no in-flight de-duplication: N parallel requests with the same uncached token each call `verifyIdToken` + upsert, because the cache is only set after completion — [backend/utils/authCache.js:1-5](backend/utils/authCache.js), [backend/middleware/authMiddleware.js:27-85](backend/middleware/authMiddleware.js)
- `verifyIdToken` verifies signature locally using cached Google public certs (the SDK fetches certs over HTTPS only when the cache expires) — SDK behaviour, not in repo code; certs fetch occurs on first call after boot, adding a cold-start latency to the first authenticated request after each restart. (Inference from firebase-admin design; not verified in this repo.)
- `invalidateAuthCache` iterates the entire cache Map (up to 5,000) linearly; called on user edits — [backend/utils/authCache.js:11-16](backend/utils/authCache.js)
- `mongoSanitize` recursively copies `req.body`, `req.query` and `req.params` (rebuilds every object/array via `Object.entries` + new object per node) on EVERY request, including the huge `file` base64 string bodies. Strings are not traversed (only objects/arrays are), so base64 costs nothing extra here, but large arrays (e.g. expense `items`, `exactSplits`, AI `history`) are deep-copied — [backend/middleware/sanitize.js:7-40](backend/middleware/sanitize.js). Note `req.query = clean(...)` reassigns; in Express 4 this is fine.
- `sanitizeServerErrors` wraps `res.json` once per request (a closure allocation); negligible — [backend/middleware/errorSanitizer.js:18-43](backend/middleware/errorSanitizer.js)
- `validate.js` helpers are cheap regex/sync functions; `escapeRegExp` is used to avoid ReDoS — [backend/middleware/validate.js:3-47](backend/middleware/validate.js)
- bcrypt is `bcryptjs` (pure JS) with cost 10: `bcrypt.compare`/`hash` in login/signup/reset run in JS on the main thread (bcryptjs yields in chunks asynchronously but still consumes main-thread CPU, ~60-100 ms per op on a small CPU, more than native `bcrypt`). Also runs against a dummy hash for non-existent users to equalise timing, which deliberately burns CPU on every failed attempt — [backend/controllers/authController.js:32,317,363,446,714](backend/controllers/authController.js); dependency [backend/package.json:15](backend/package.json)
- Admin login also uses bcryptjs compare — [backend/controllers/adminAuthController.js:18](backend/controllers/adminAuthController.js)

### Inferences
- (Low-Med) Auth is not a bottleneck on warm users; the extra latency is on the first request each minute (Firebase verify + Mongo upsert). Fix: increase TTL toward token expiry (bounded by `decoded.exp`, which the code already caps), and de-dupe concurrent misses with an in-flight Promise Map keyed by token.
- (Low) Sanitizer cost is O(payload node count); fine for normal payloads. Could be replaced with `express-mongo-sanitize` or limited to specific routes, but gains small.
- (Low) bcryptjs -> native `bcrypt` (or lowering nothing—cost 10 is standard) would reduce login CPU; login is infrequent, so low impact.

### Gaps
- `findOrCreateUser` / `recordActiveDay` internals (utils/referralService.js) were not read in depth; their DB cost is out of this scope (DB researcher).

## 3. Services: LLM calls (geminiService, openaiService, contextBuilder, smartQueryHandler), MCP server

### Takeaway
The AI endpoint is the slowest request path by design: it loads the user's ENTIRE expense history into a single prompt, runs N+1 sequential per-group queries, then makes a blocking, non-streaming, no-timeout LLM call (with sequential model fallbacks). This is the highest-impact non-DB bottleneck.

### Cited Findings
- `queryAI` is a single synchronous-from-the-client's-view request: optional smart intent -> `buildUserContext` -> full prompt -> `await PROVIDERS[requested].generate(...)` -> `res.json`. No streaming, no SSE, no caching of context or answers — [backend/controllers/aiController.js:79-168](backend/controllers/aiController.js)
- `buildUserContext` loads all groups (populate members), all notepads, then runs a sequential `for (const group of groups) await Expense.find({groupId}).populate("paidBy")` — an N+1 awaited serially (not `Promise.all`), with NO limit/date-window and no projection: every expense ever recorded in all of the user's groups is loaded, populated, string-interpolated into markdown (including per-split lines) — [backend/services/contextBuilder.js:49-88](backend/services/contextBuilder.js)
- The context string grows linearly with total expenses and members (one multi-line block per expense including each split); it is concatenated by repeated `context +=` in loops and sent to the LLM as input tokens each time — [backend/services/contextBuilder.js:96-171](backend/services/contextBuilder.js). Bigger prompt = higher LLM latency (time-to-first-token and processing) and cost; only the user prompt is capped (8000 chars) and history (12 turns x 1500 chars), NOT the DB context — [backend/controllers/aiController.js:88-90,75-76](backend/controllers/aiController.js)
- `toLocaleDateString()` called per expense in the loop (locale lookup each time; minor CPU) — [backend/services/contextBuilder.js:165](backend/services/contextBuilder.js)
- Gemini service: sequential model fallback `gemini-2.5-flash -> flash-lite -> 2.0-flash`; each `generateContent` has no explicit timeout/AbortSignal, so a hung or slow upstream call blocks the HTTP request (and any client/proxy timeout) until the SDK default. On 429/500/503 errors it retries the next model sequentially, adding the full latency of failed attempts — [backend/services/geminiService.js:7-40](backend/services/geminiService.js)
- OpenAI service: same pattern (`gpt-4o-mini -> gpt-4o -> gpt-3.5-turbo`), no timeout configured on the client (`new OpenAI({apiKey})` — SDK default timeout is long, 10 min, per the openai library defaults; verify), no streaming — [backend/services/openaiService.js:5-37](backend/services/openaiService.js)
- Gemini client constructed at import with `process.env.GOOGLE_API_KEY` — module-level, no issue — [backend/services/geminiService.js:5](backend/services/geminiService.js)
- Smart intent path mitigates cost for common queries via regexes (10 patterns tested sequentially per request; negligible CPU) — [backend/services/smartQueryHandler.js:11-31](backend/services/smartQueryHandler.js). But those handlers still do `Group.find().populate` + `Expense.find({groupId: {$in}}).populate("paidBy")` over ALL expenses with no date/limit and compute in Node — [backend/services/smartQueryHandler.js:44-52](backend/services/smartQueryHandler.js). The broad regexes (e.g. SPEND_BY_CATEGORY matches the word "food"/"travel"; BALANCE_ALL matches "net"/"owe") can catch general questions and return a canned DB answer.
- MCP server: a fresh `McpServer` + transport is built per POST request (stateless) — registering all tools each time. Tool list caps expenses (`MAX_EXPENSES=500`, default 200) and summary concurrency 5, which is sensible — [backend/services/mcpServer.js:46-48,57-60](backend/services/mcpServer.js), [backend/routes/mcpRoutes.js:18](backend/routes/mcpRoutes.js). MCP route has a rate limiter (300/min per credential, 60 anon) — [backend/routes/mcpRoutes.js:56-62](backend/routes/mcpRoutes.js)
- FX rates are well-handled: 6-hour in-memory cache, 6 s abort timeout, stale-on-error — [backend/utils/fxRates.js:6-19,38-50](backend/utils/fxRates.js)
- Balance computation has a TTL in-memory cache keyed by groupId (max 2000 entries), invalidated on writes — [backend/controllers/balanceController.js:10-13,114-117,160-161](backend/controllers/balanceController.js). (Process-local; lost on pm2 restart, not shared if clustered.)

### Inferences
- (HIGH) `/api/ai` latency = serial per-group Mongo queries + O(all-expenses) prompt construction + LLM latency on a large prompt, with no streaming and no timeout. Fixes: (1) run per-group queries in one `Expense.find({groupId:{$in}})` or `Promise.all`; (2) cap the context (recent N months/expenses, aggregate older data into per-group totals; select only needed fields); (3) add `AbortSignal.timeout`/SDK `timeout` (e.g. 20-30 s) and consider only one fallback hop; (4) stream the response (SSE) so the app shows text immediately; (5) cache the built context for ~30-60 s per user and invalidate on writes.
- (Med) Sequential fallback chain can multiply latency during provider incidents; add per-attempt timeouts.
- (Low-Med) Smart-query handlers could use aggregation/`$match` by date rather than loading all expenses and filtering in JS (DB researcher may overlap).

### Gaps
- Actual openai SDK default timeout/retries and @google/generative-ai default timeout were not verified from node_modules; stated as "no explicit timeout set in repo code". Remaining smartQueryHandler handlers (lines 120-481) were skimmed, not exhaustively analysed.
- mcpServer tool bodies beyond the caps were not exhaustively analysed.

## 4. Uploads and OCR (uploadController, ocrService, expenseController)

### Takeaway
OCR runs inline and awaited inside the "create expense" request, with no timeout, serialised on a single shared Tesseract worker. Uploads are base64-in-JSON (10 MB body) forwarded to Cloudinary inline. These are the second biggest request-path bottleneck.

### Cited Findings
- `createExpense` calls `ocrText = await runOcr(fileUrl)` before creating the expense: the user's "add expense" response waits for Tesseract to download the image from Cloudinary and recognize it — [backend/controllers/expenseController.js:241-251](backend/controllers/expenseController.js)
- The OCR service uses ONE persistent worker (`Tesseract.createWorker("eng")`) shared by all requests. `worker.recognize` calls on a single tesseract.js worker are processed one at a time, so concurrent receipt uploads queue behind each other. No timeout, no size/dimension check, no concurrency cap — [backend/utils/ocrService.js:11-49](backend/utils/ocrService.js)
- In Node, tesseract.js (v6) runs recognition in a worker thread, so it doesn't block the main event loop directly, but it consumes CPU on a small shared EC2 box and the HTTP request waits (tesseract.js version ^6.0.1 — [backend/package.json:27](backend/package.json); worker-thread behaviour is library knowledge, not shown in repo code).
- The worker is created at module import and keeps a language model resident (`backend/eng.traineddata` exists in the backend dir) — memory cost on a 512MB-class heap/small instance; on failure it is terminated and recreated on next call (cold OCR ~2-3 s per the code comment) — [backend/utils/ocrService.js:3-9,42-47](backend/utils/ocrService.js)
- OCR input is only validated as a trusted Cloudinary URL (SSRF guard), not for file type: a PDF receipt is accepted by uploads (`RECEIPT_MIME_TYPES` includes `application/pdf`), then passed to Tesseract, which cannot OCR PDFs (likely wasted time/exception; an exception in `runOcr` propagates and the worker is torn down and recreated) — [backend/utils/uploadSecurity.js:27](backend/utils/uploadSecurity.js), [backend/controllers/expenseController.js:246-251](backend/controllers/expenseController.js), [backend/utils/ocrService.js:41-48](backend/utils/ocrService.js). (Inference; behaviour for PDFs not tested.)
- `uploadMedia` receives the whole file as a base64 data-URI inside `req.body` (JSON up to 10 MB), validates MIME via regex/slice, then `await cloudinary.uploader.upload(file, ...)` synchronously within the request; client then separately calls createExpense (two sequential network round trips + Cloudinary processing, then OCR re-downloads the image from Cloudinary) — [backend/controllers/uploadController.js:22-53](backend/controllers/uploadController.js), [backend/index.js:109](backend/index.js)
- `uploadRejectionReason` does `file.slice(5, file.indexOf(";"))` plus a regex test with `^data:...;base64,` on a multi-MB string — cheap (anchored), but the string is fully held in memory ~3 times (raw body, parsed object, sanitized copy via `clean`: `sanitized[key] = clean(value)` returns the same string reference, so no extra copy) — [backend/utils/uploadSecurity.js:7-8,34-37](backend/utils/uploadSecurity.js)
- Chat media upload follows the same inline pattern: `await cloudinary.uploader.upload(file, {resource_type:"auto"})` inside `sendMessage` before `Message.create`, and group chat likewise — [backend/controllers/chatController.js:244](backend/controllers/chatController.js), [backend/controllers/groupChatController.js:103-107](backend/controllers/groupChatController.js). Videos/audio allowed in chat (`CHAT_MIME_TYPES`) through a 10 MB JSON cap — [backend/utils/uploadSecurity.js:28-31](backend/utils/uploadSecurity.js)
- Profile image upload awaits `cloudinary.uploader.destroy` of the old image inline before uploading the new one (sequential); UPI QR path swallows the destroy error but still awaits it — [backend/controllers/userProfileController.js:168-172,213-216](backend/controllers/userProfileController.js)

### Inferences
- (HIGH) Move OCR off the request path: save the expense immediately, then run OCR in the background and `Expense.updateOne({ocrText})` (and optionally emit a socket event). Or at minimum add a timeout (e.g. 8 s) with fallback to `ocrText = null`. Skip OCR for PDFs/non-images. Consider a bounded queue/concurrency and a worker pool of 2 if CPU allows.
- (Med) Replace base64-in-JSON with direct-to-Cloudinary signed uploads (client uploads directly; server only receives the URL). This removes 10 MB body buffering/parsing from Node and one hop. Alternatively use multipart streaming.
- (Low-Med) Client-side image compression/resizing before upload would cut upload time (mobile networks) and OCR time.
- (Low) Await of `destroy` before upload could be parallelised or made fire-and-forget.

### Gaps
- Actual image sizes users upload and real OCR duration were not measured. Whether `eng.traineddata` is the "fast" or "best" model variant was not checked.

## 5. Notifications (Expo, FCM) and email in request path

### Takeaway
Most notification calls are correctly fire-and-forget (`void createNotification(...)`), so push latency is not in the response path for expense/group/settlement actions. However, signup/forgot-password email sends ARE awaited inline (SMTP round trip, with retries/backoff), and `createNotification` internally serialises DB insert, Expo push (sequential 100-chunks) and FCM.

### Cited Findings
- Expense creation uses `void createNotification(...)` (not awaited) after `Expense.create`; same for invites, settlements, group events — [backend/controllers/expenseController.js:327,488,512,552,623,667](backend/controllers/expenseController.js), [backend/controllers/groupController.js:297,310,330,586,793,818](backend/controllers/groupController.js), [backend/controllers/inviteController.js:29,172,230](backend/controllers/inviteController.js)
- Chat message push is fire-and-forget with `.catch` (`sendPushToUsers(...).catch(...)`) — [backend/controllers/chatController.js:300-312](backend/controllers/chatController.js); group chat similarly — [backend/controllers/groupChatController.js:154](backend/controllers/groupChatController.js)
- `createNotification` runs `insertMany`, socket emits, then `await sendExpoPushNotifications` and then `await sendFCMWebPushNotifications` one after the other (sequential, not `Promise.all`), each of which does its own `User.find` for tokens. Not request-blocking when called with `void`, but it holds DB/pool and delays delivery, and runs inside the recurring runner's loop where it IS awaited per rule — [backend/controllers/notificationController.js:16-70](backend/controllers/notificationController.js), [backend/utils/recurringRunner.js:83-89](backend/utils/recurringRunner.js)
- Expo pushes are sent in chunks of 100 sequentially with `fetch` and NO timeout/AbortSignal — a hung connection to `exp.host` keeps that promise (and its `User` doc refs) alive indefinitely; harmless to the HTTP response but leaks work — [backend/controllers/notificationController.js:243-262](backend/controllers/notificationController.js)
- `sendFCMWebPushNotifications` makes a `User.find` then `sendEachForMulticast` (tokens array not chunked to FCM's 500 limit — [backend/controllers/notificationController.js:386-433](backend/controllers/notificationController.js)); stale-token cleanup awaited inline.
- `sendPushToUsers` (chat) similarly sequential Expo then FCM — [backend/controllers/notificationController.js:84-92](backend/controllers/notificationController.js)
- Emails: signup OTP (`sendEmail` awaited before `res.status(200)`), plus two other awaited sends at authController lines 479 and 657 (password reset flows). `sendEmail` retries transient errors with 1 s, 2 s backoff, so worst-case request time is SMTP timeouts (connection 10 s, greeting 10 s, socket 20 s) x up to 3 attempts + 3 s backoff — [backend/controllers/authController.js:201,479,657](backend/controllers/authController.js), [backend/utils/emailService.js:16-32,52-69](backend/utils/emailService.js)
- Group invite emails are correctly fire-and-forget via `void sendEmailsSafely(...)`, but that helper sends sequentially through a pool throttled at 5 msgs/s with 3 connections — [backend/controllers/groupController.js:346](backend/controllers/groupController.js), [backend/utils/emailService.js:24-28,75-88](backend/utils/emailService.js)
- The SMTP pool is created at module import and `verify()` runs at boot, so the first email after a cold start may include TLS/login latency — [backend/utils/emailService.js:16-39](backend/utils/emailService.js)

### Inferences
- (Med) OTP/password-reset emails block the response for the SMTP round trip (typically 0.5-3 s with Gmail-class SMTP, much worse on retry). Fix: respond immediately after persisting the OTP and send the email in the background, or use a transactional API (SES/Resend) over HTTPS. The user-facing trade-off: failures must be surfaced differently (the current catch distinguishes quota errors — [backend/controllers/authController.js:~205-215](backend/controllers/authController.js)).
- (Low) Run Expo + FCM in parallel with `Promise.all` and add `AbortSignal.timeout` to the Expo fetch; chunk FCM to 500 tokens.

### Gaps
- Real SMTP provider latency unknown (SMTP_HOST is env-configured; error-handling comments mention Gmail quota, implying Gmail SMTP). Lines 479/657 flow context not examined in depth.

## 6. Sync fs / CPU-heavy / large payload / timeouts summary

### Takeaway
No sync fs calls exist in the request path. Remaining CPU/payload hazards are the 10 MB base64 JSON bodies, recursive sanitize copies, bcryptjs, and large in-Node aggregations (AI context/smart queries). Outbound calls to third parties mostly lack timeouts (except FX).

### Cited Findings
- grep for `readFileSync|writeFileSync|execSync|existsSync|compareSync` over backend source (excluding node_modules/tests) finds none in request handlers; only `bcrypt.hashSync` once at import in authController — [backend/controllers/authController.js:32](backend/controllers/authController.js)
- Outbound HTTP/SDK calls with explicit timeouts: FX (6 s abort) — [backend/utils/fxRates.js:10-15](backend/utils/fxRates.js); SMTP (10/10/20 s) — [backend/utils/emailService.js:29-31](backend/utils/emailService.js). Without explicit timeouts: Cloudinary upload calls ([backend/controllers/uploadController.js:39](backend/controllers/uploadController.js)), Gemini/OpenAI, Expo fetch ([backend/controllers/notificationController.js:245](backend/controllers/notificationController.js)), Firebase `verifyIdToken`/FCM (SDK defaults).
- Whole-process in-memory caches (auth, balance) are single-instance state; fine on one pm2 process, but any switch to cluster/multi-instance would lose cache effectiveness — [backend/utils/authCache.js:8](backend/utils/authCache.js), [backend/controllers/balanceController.js:10](backend/controllers/balanceController.js)
- The notification module imports `io`/`onlineUsers` from `index.js` (circular import); not a perf issue — [backend/controllers/notificationController.js:4](backend/controllers/notificationController.js)

### Inferences
- Add explicit timeouts to Cloudinary (`timeout` option), LLM SDKs, and Expo fetch to bound worst-case request time.

### Gaps
- No APM/profiling data, no load tests; no Node CPU/heap metrics available. `coverage/` and `tests/` were not mined for performance information.

## Ranked summary (impact on API response time, evidence from code)

| Rank | Impact | Issue | Where | Fix |
|---|---|---|---|---|
| 1 | High | AI endpoint: serial per-group queries over ALL expenses, giant prompt, blocking non-streaming LLM call, no timeouts, sequential model fallback | services/contextBuilder.js:49-171; controllers/aiController.js:99-168; services/geminiService.js:15-40; services/openaiService.js:11-37 | Batch/limit/aggregate context, cache, timeout, stream via SSE |
| 2 | High | OCR awaited inline in createExpense, one shared Tesseract worker (serialised), no timeout, PDFs not filtered | controllers/expenseController.js:241-251; utils/ocrService.js | Background OCR + update, timeout, skip PDFs |
| 3 | Med-High | Base64-in-JSON uploads (10 MB parse, then inline Cloudinary upload, then OCR re-download); same in chat | index.js:109; controllers/uploadController.js:22-53; chatController.js:244 | Direct signed Cloudinary upload, client-side compression |
| 4 | Med | Signup/reset OTP emails awaited inline over SMTP with retries | controllers/authController.js:201,479,657; utils/emailService.js:52-69 | Send in background or HTTPS email API |
| 5 | Med | No response compression; no rate limiting on heavy endpoints | index.js:71-115; package.json | `compression()`, per-user limits on /ai, /upload, expense create |
| 6 | Med | Auth cache miss per minute (Firebase verify + DB upsert), no in-flight dedupe of concurrent misses | middleware/authMiddleware.js:27-85; utils/authCache.js:6 | Longer TTL up to token exp, single-flight Map |
| 7 | Low-Med | Single small EC2 + pm2 process: OCR/JSON/bcryptjs compete for one core; deploy needed swap because of OOM | .github/workflows/deploy.yml | Larger instance / pm2 cluster (needs shared cache) |
| 8 | Low-Med | Socket register/disconnect global `io.emit` + DB writes + delivery-receipt queries on each (re)connect | index.js:157-207,300-324 | Emit to rooms/contacts, debounce presence |
| 9 | Low | Sequential Expo then FCM in createNotification; no timeouts on Expo fetch; FCM not chunked | controllers/notificationController.js:43-55,84-92,243-262 | Promise.all, timeouts, chunk 500 |
| 10 | Low | bcryptjs (JS) at cost 10; dummy-hash compare on unknown users | controllers/authController.js:32,363,446 | Native bcrypt / argon2 |
| 11 | Low | mongoSanitize deep-copies body/query/params every request | middleware/sanitize.js | Use only on routes that need it |

Not found / not evidenced: Render/Heroku free-tier cold starts (deployment is EC2 + pm2), sync fs in request path, per-request logging middleware, Redis/queue for background jobs (none; all background work is in-process).
