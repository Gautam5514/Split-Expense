# Backend database and query performance bottlenecks (Node/Express + Mongoose 8.24.3)

Scope: /Users/kunalkumar/Desktop/Gautam/Split/backend. All "sources" below are repo paths (relative to backend/) with line numbers, read directly. No web sources were used; fix sketches are general Mongoose/MongoDB practice, not cited. The code already contains several optimizations (lean, select, Promise.all, auth cache, balance cache, expense/group indexes), so the findings below are what remains.

## Q1. Controller-level issues (N+1, sequential awaits, unbounded finds, populate, in-memory aggregation)

### Takeaway
The worst offenders are unbounded, triple-populated expense/group-message lists, in-memory analytics over every user expense, and synchronous OCR inside addExpense. The classic N+1 per-item loops are mostly absent. Most controllers already batch lookups.

### Cited Findings
- HIGH: `getExpenses` returns ALL expenses of a group with no limit/pagination, and populates three paths (`paidBy`, `payers.userId`, `splits.userId`) per expense. Populate issues extra `$in` queries and hydrates every split user. Cost grows linearly with expenses x splits. — controllers/expenseController.js:365-370
- HIGH: `getGroupMessages` loads the entire group chat history (`GroupMessage.find({groupId}).populate("sender").sort({createdAt:1})`), no limit, no cursor. The 1:1 chat endpoint by contrast is paginated (limit max 100, `_id` cursor). — controllers/groupChatController.js:43-46 vs controllers/chatController.js:170-174
- HIGH: `getGroupMessages` also does two writes on every read: `User.findByIdAndUpdate` ($pull hiddenGroupChats) and `GroupMessage.updateMany({groupId, seenBy:{$ne:uid}}, $addToSet seenBy)`, which touches every unseen message document and runs sequentially before the read (4 serial round trips + a socket emit). `seenBy` is an array of ObjectIds on each message (messageModel/groupMessageModel). — controllers/groupChatController.js:27-41; models/messageModel.js:14
- HIGH: OCR runs inline in the request path. `await runOcr(fileUrl)` (Tesseract.js, CPU-heavy, single persistent worker so concurrent uploads queue) blocks `addExpense` before `Expense.create`, so the response waits for OCR. — controllers/expenseController.js:250; utils/ocrService.js (single worker, comment cites ~2-3s init avoided, recognition itself still per-request)
- HIGH: `getUserAnalytics` fetches every expense the user paid or participated in (only amount/category/date selected, .lean) and aggregates in JS with dayjs (category totals, month/year filters, trends). It should be a `$group` aggregation. The `$or:[{paidBy},{participants}]` plus `description: {$not: /^Settlement/i}` (unanchored-to-index negated regex) cannot be satisfied purely from an index and forces a doc fetch/filter for each candidate. Called on every dashboard load. — controllers/userAnalyticsController.js:17-23, 94-153
- MED: Same analytics handler's second query (recent 5 expenses) uses `$or` on paidBy/participants with sort `{date:-1, createdAt:-1}` and two populates; there is no index on (paidBy,date) or (participants,date), so Mongo must fetch all matching docs and sort in memory (blocking sort). — controllers/userAnalyticsController.js:33-43; models/expenseModel.js:65-67
- MED: `getGroups` populates `members` and `createdBy` for every group, then runs two more queries (User + UserProfile) via `buildPhotoMap` for all members of all groups; unbounded (no limit) and the User query is a redundant second fetch of data the populate already loaded (populate selects only "name email", then photoURL fetched separately). — controllers/groupController.js:137-145, 98-115
- MED: `getGroupById` runs sequentially: Group.findById+2 populates, then possibly a write (auto-heal), then `buildPhotoMap` (2 queries), then `Expense.exists`. The photoMap and `exists` queries are independent and could be `Promise.all`'d. — controllers/groupController.js:172-208
- MED: `addExpense` loads the full Group document (not lean, no select) then, after create, re-fetches the expense with 3 populates just to echo it back; `notifyGroupChange`/`createNotification` are fire-and-forget (`void`), good. — controllers/expenseController.js:214, 307-311
- MED: `createNotification` is serial: insertMany, then `sendExpoPushNotifications` (User.find + Notification.aggregate unread counts + fetch to Expo per 100-chunk in a for-await loop), then `sendFCMWebPushNotifications` (another User.find). Not on the request path for addExpense (void) but recurring runner awaits it per rule. The unread-count aggregate runs once per notification batch for all recipients (acceptable, indexed). — controllers/notificationController.js:27-55, 193-209, 243-245, 394-397; utils/recurringRunner.js:83
- MED: Group chat send (`sendGroupMessage`) does Group.findById (full doc), User.findByIdAndUpdate on every message, create, `group.save()` (full doc validation + pre-save member dedupe hook), then populate re-fetch. Sequential 5 round trips. — controllers/groupChatController.js:89-130; models/groupModel.js:55-68
- MED: `getContactIds` (used by every people search, global search, and addMember) loads ALL groups and ALL conversations of the user with member arrays, builds the contact set in JS, then does `User.find({_id:{$in: all contacts}})`. Scales with total contacts; run repeatedly (also again in `lookupUserByEmail`). — utils/contacts.js:9-21; controllers/peopleController.js:25-35, 60
- MED: `globalSearch` runs 3 independent searches in parallel (good), but `searchExpenses` first loads all of the user's groups (no limit) and then does `$in` + case-insensitive regex on `description` — see regex section. `searchPeople` internally repeats getContactIds. — controllers/globalSearchController.js:99-117, 153-157
- LOW: `getConversations` has no limit; populates 2 members per convo then batch-loads profiles in one query (no N+1). — controllers/chatController.js:94-110
- LOW: `getUserNotifications` is limited to 20 and indexed but not `.lean()`; returns full Mongoose docs. — controllers/notificationController.js:477-482
- LOW: `getAdminStats` is fine: 13 queries in one `Promise.all`, uses countDocuments/aggregate; `recentMessages`/`recentApplications` are not `.lean()`. `Expense.countDocuments()` and `User.countDocuments()` with empty filter use collection metadata/_id scan and are cheap-ish. — controllers/adminStatsController.js:36-50
- LOW: `getMyBalanceSummary` loads every expense in every active group of the user (select balance fields, lean) in ONE query, and loops in JS; fixed N+1 vs the older per-group approach (comment says so). — controllers/balanceController.js:174-202
- No per-item DB query inside a loop was found in the audited controllers. Loops are CPU-only (e.g. expenseController.js:75,136; groupController.js:376-379 `uniqueInviteCode` does up to 8 sequential `Group.exists` but only on invite generation).
- Socket connect/disconnect each issue `User.findByIdAndUpdate` (isOnline/lastActive) — a write per connection event. — index.js:188, 309

### Inferences
- The biggest wall-clock costs for users are the home/dashboard (analytics + balances summary + groups, all full scans of the user's expense history) and opening a group (full expense list with 3 populates + unbounded chat).
- OCR inside addExpense likely makes expense creation with a receipt take seconds and serializes concurrent receipt uploads on a single Tesseract worker. Fix: respond first, run OCR async and `$set` ocrText later (ocrText isn't read by balances).
- Fix sketches:
  ```js
  // getExpenses: paginate + cursor, drop one populate, project
  Expense.find({groupId, ...(before && {date:{$lt:before}})})
    .sort({date:-1,_id:-1}).limit(50)
    .populate("paidBy","name").lean()   // resolve split names client-side from group.members
  // group chat: mirror chatController (limit + _id cursor); mark-seen only the returned page
  GroupMessage.find({groupId}).sort({_id:-1}).limit(50).lean()
  // analytics: DB aggregation
  Expense.aggregate([{ $match:{ $or:[{paidBy:u},{participants:u}], isSettlement:{$ne:true}, date:{$gte:startOfYear}}},
    { $group:{ _id:{m:{$month:"$date"}, c:"$category"}, total:{$sum:"$amount"} }}])
  // getGroupById: Promise.all([buildPhotoMap(ids), Expense.exists(...)])
  // OCR: don't await; Expense.updateOne({_id},{ocrText}) after response
  ```

### Gaps
- Did not read every route (e.g. whether the app passes pagination params to getExpenses); no runtime profiling/explain() data was collected, so impact ranking is based on code shape, not measured timings.
- Did not audit groupExtrasController, inviteController, quickSplitController, userProfileController, aiController in depth.

## Q2. Missing indexes and regex searches

### Takeaway
Core indexes exist (Expense groupId+date, paidBy, participants; Group members+updatedAt; Message conversationId+createdAt; Notification userId+isRead+createdAt), but several query/sort shapes are not covered, and all text searches use unanchored case-insensitive regexes that cannot use an index.

### Cited Findings
- Existing indexes: Expense `{groupId:1,date:-1}`, `{paidBy:1}`, `{participants:1}` — models/expenseModel.js:65-67 (plus redundant single-field `groupId` index at :31, which is a prefix of the compound). Group `{members:1,updatedAt:-1}` and unique `{name:1,createdBy:1}` — models/groupModel.js:72-74. Conversation `{members:1,lastMessageAt:-1}` — models/conversationModel.js:13. GroupMessage `{groupId:1,createdAt:-1}` — models/groupMessageModel.js:24. Message `{conversationId:1,createdAt:-1}` — models/messageModel.js:24. Notification `{userId:1,isRead:1,createdAt:-1}` — models/notification.model.js:13. User: email unique, firebaseUid sparse — models/userModel.js:5-7.
- HIGH (regex): `searchContacts` filters `User` by `name`/`email` with `new RegExp(escapeRegExp(term),"i")` (contains-match, case-insensitive), no index can serve it. It is bounded by `_id $in contactIds` so the scan is limited to the contact set, which is the mitigating factor. — controllers/peopleController.js:29-35
- MED (regex): `searchGroups` regex on `Group.name` within `members:` filter; uses the members index to narrow then filters names. Bounded by user's group count. — controllers/globalSearchController.js:44-51
- MED (regex): `searchExpenses` regex on `Expense.description`, `groupId $in` all of the user's groups, `isSettlement $ne`, sort `{date:-1,createdAt:-1}`: uses `{groupId,date}` index per group but must test the regex against every expense in all groups (scales with total expense history) and the sort includes createdAt (not in the index), so likely in-memory sort. — controllers/globalSearchController.js:109-117
- MED (no index for sort): analytics recent-5 query sorts `{date:-1, createdAt:-1}` with `$or` on paidBy/participants; no `{paidBy,date}` / `{participants,date}` compound. — controllers/userAnalyticsController.js:33-43
- MED (no index for sort): `Message.find({conversationId, _id:{$lt}}).sort({_id:-1})` while the index is `{conversationId,createdAt}`; `_id` sorting can't use the createdAt-ordered index (Mongo would use `{conversationId,createdAt}` and sort by _id in memory, or scan _id index with filter). Align sort field with the index (sort by `{createdAt:-1,_id:-1}`) or index `{conversationId:1,_id:-1}`. — controllers/chatController.js:170-174; models/messageModel.js:24. Same for media summary query. — controllers/chatController.js:477-486
- LOW: `GroupMessage.updateMany({groupId, seenBy:{$ne:uid}})` uses groupId prefix of `{groupId,createdAt}`; `$ne` on array can't use an index so scans the group's whole message history on each chat open. — controllers/groupChatController.js:32-35
- LOW: `Notification.deleteMany({isRead:true, createdAt:{$lt}})` has no index starting with isRead/createdAt (existing index starts with userId), so it's a collection scan; the cleanup function appears to be optional/manually triggered. — controllers/notificationController.js:549-554; models/notification.model.js:13
- LOW: no `isSettlement` in any index although most analytics/search queries filter on it; `Expense.find({groupId})` for balances reads full set (select limits fields only; not covered by an index because balance fields aren't in an index). — controllers/balanceController.js:91, 187
- LOW: `SettlementRequest` has partial unique index on pending, `groupId` index; `getPendingSettlements` filter `{groupId, status:"pending"}` sort createdAt — likely fine at small scale. — controllers/expenseController.js:729; models/settlementRequestModel.js:37
- No text indexes (`type:"text"`) or collation/case-insensitive indexes defined anywhere in models/ (grep for `text` and `index(` showed none).
- Index auto-build: no `autoIndex:false`/`syncIndexes` configured anywhere, so Mongoose default `autoIndex` builds declared indexes at startup — no evidence of manual migration. (grep over backend/ excluding node_modules found no matches.)

### Inferences
- Regex contains-searches are acceptable only because each is pre-filtered to a small set (contact ids, user's groups). The risky one is searchExpenses, which scales with total expense history. Fix options: anchored prefix search `^term` with an index on `{groupId:1, description:1}` or Atlas Search / `$text` index (`expenseSchema.index({description:"text"})`) with `groupId` filter.
- Suggested indexes:
  ```js
  expenseSchema.index({ paidBy: 1, date: -1 });
  expenseSchema.index({ participants: 1, date: -1 });
  expenseSchema.index({ groupId: 1, isSettlement: 1, date: -1 });
  messageSchema.index({ conversationId: 1, _id: -1 });
  groupMessageSchema.index({ groupId: 1, _id: -1 });
  notificationSchema.index({ isRead: 1, createdAt: 1 }); // for cleanup, or use a TTL index
  // drop redundant: groupId single-field index (expenseModel.js:31)
  ```

### Gaps
- No `explain()` output / production index list was available, so whether the declared indexes are actually built in production is unverified.
- userModel/userProfileModel index details only partly inspected (userProfile userId is unique).

## Q3. Caching, connection pooling, compression

### Takeaway
There are two in-process Map caches (auth token cache, 30s balance cache) but no shared cache, no HTTP compression, and no explicit Mongo pool/timeouts config.

### Cited Findings
- Auth token cache: in-memory `Map`, TTL 60s, max 5,000 entries, LRU via delete/re-set; avoids a Firebase verify + user upsert on every request. Invalidation scans the whole map (O(n)) on user change. — utils/authCache.js; middleware/authMiddleware.js:16-25, 80-85
- Balance cache: in-memory `Map<groupId,{data,expiresAt}>`, TTL 30s, max 2000 entries, invalidated on expense writes via `invalidateBalanceCache`. Only the HTTP `getBalances` path uses it; `computeGroupBalances` (used by settlement validation) and `getMyBalanceSummary` do not. — controllers/balanceController.js:9-13, 114-117, 160-161
- Caches are per-process: with more than one instance (or a restart) they're not shared; invalidation on one node doesn't clear another (inference from Map implementation; deployment topology not verified). No Redis/node-cache/lru-cache found in package.json dependencies (grep for compression/redis/lru/memoize in package.json and utils/middleware/controllers returned nothing relevant).
- Connection: `mongoose.connect(process.env.MONGO_URI)` with no options — no maxPoolSize, minPoolSize, serverSelectionTimeoutMS, socketTimeoutMS, readPreference, or `compressors`. — config/db.js:5. Mongoose 8.24.3 installed (node_modules/mongoose/package.json); driver defaults apply (driver default maxPoolSize is 100 per general MongoDB driver docs, not verified here against the driver source).
- No compression middleware: `compression` is not in package.json and `app.use(...)` list in index.js has helmet, cors, sanitizeServerErrors, express.json (10mb), urlencoded, mongoSanitize, and routes only. — package.json; index.js:~60-110, 211-239
- Large JSON payloads (unbounded expense lists with populated splits, group chat history) are therefore sent uncompressed unless the host/proxy compresses.
- `mongoSanitize` middleware walks every request body on every request (middleware/sanitize.js) — not inspected for cost.
- Recurring runner polls `RecurringExpense.find({active:true,nextRunAt:{$lte:now}}).limit(200)` using the nextRunAt index. — utils/recurringRunner.js:39; models/recurringExpenseModel.js:16

### Inferences
- Add `app.use(compression())` (expect large wins on the JSON-heavy list endpoints), and set pool options: `mongoose.connect(uri,{maxPoolSize:20-50, serverSelectionTimeoutMS:5000, compressors:"zstd,snappy"})` depending on plan limits (e.g. Atlas M0/M2 connection caps).
- If deployed on multiple instances, move balance/auth caches to Redis or accept 30-60s staleness; cache `getMyBalanceSummary`/analytics per user with short TTL.

### Gaps
- Hosting/proxy (Render/Railway/Cloudflare) compression and Atlas tier/connection limits unknown; couldn't confirm whether compression is applied upstream.
- sanitize.js cost not measured.

## Q4. How balances are computed and complexity

### Takeaway
Balances are recomputed per request from ALL expenses of the group (no stored/ledger totals), O(E x (P+S)) per call with a 30s per-group in-memory cache for one endpoint only; the cross-group summary reads every expense in all of the user's active groups.

### Cited Findings
- `computeGroupBalances(groupId)`: `Group.findById().populate("members")` then `Expense.find({groupId}).select("groupId paidBy amount payers splits").lean()` then JS loop `applyExpenses` over every expense, every payer and every split, with `to2()` (`Number(n.toFixed(2))`) rounding on each accumulation. No pagination or running totals. — controllers/balanceController.js:70-95, 42-65
- `getBalances` adds membership check (`Group.findById` select members), cache check (30s TTL), compute, then `buildSettlement` greedy O(M log M) over members, then a `UserProfile.find` for creditors' UPI, and `uniqueMembers.find` inside `txns.map` (O(T x M), small). — controllers/balanceController.js:97-167
- `computeGroupBalances` is also called (uncached) from settlement request create and confirm flows, each rescanning all expenses of the group. — controllers/expenseController.js:460, 591
- `getMyBalanceSummary`: finds all non-completed groups of the user then ONE `Expense.find({groupId:{$in}})` for all, buckets in a Map, runs `applyExpenses` per group. Total work O(total expenses across the user's groups) per call, no cache. The fetch transfers every expense's payers/splits arrays over the wire from Mongo. — controllers/balanceController.js:179-202
- Expense documents embed `splits` and `payers` arrays (one subdoc per participant) so doc size and CPU scale with group size too. — models/expenseModel.js (payerSchema, splitSchema, `payers`, `splits`)
- Cache invalidation: `invalidateBalanceCache(groupId)` called after addExpense (expenseController.js:313); the 30s TTL caps staleness elsewhere.

### Inferences
- Complexity per balance read is O(E*(P+S)) in CPU and O(E) in documents read; dashboard load calls summary (all groups) in addition to per-group calls, so a heavy user with thousands of expenses triggers multiple full scans per page load.
- Fix options, in rising effort: (1) `$group`/`$unwind` aggregation to compute per-user net in Mongo returning only M numbers; (2) cache `getMyBalanceSummary` and invalidate on expense write via the `notifyGroupChange` member list; (3) maintain a materialized per-group balance document updated with `$inc` on expense create/edit/delete (single source of truth, O(1) reads), with a recompute job as reconciliation. Sketch for (1):
  ```js
  Expense.aggregate([
    { $match: { groupId } },
    { $facet: {
        paid: [ { $project:{ c:{ $cond:[{ $gt:[{$size:"$payers"},0]}, "$payers", [{userId:"$paidBy",amount:"$amount"}]] } } },
                { $unwind:"$c" }, { $group:{ _id:"$c.userId", v:{ $sum:"$c.amount" } } } ],
        owed: [ { $unwind:"$splits" }, { $group:{ _id:"$splits.userId", v:{ $sum:"$splits.share" } } } ] } }
  ])
  ```
  (Note: rounding behavior of the current per-step `to2` would need to be matched/reconciled.)

### Gaps
- Typical production group/expense counts are unknown, so the point at which the scan becomes the dominant latency can't be quantified.
- Expense edit/delete handlers (if any) and whether they invalidate caches were not audited.

## Ranked summary (impact)
1. HIGH: Unbounded `getExpenses` with 3 populates (expenseController.js:365-370)
2. HIGH: Unbounded `getGroupMessages` + write-on-read (groupChatController.js:27-46)
3. HIGH: Analytics aggregated in JS over all user expenses; no (paidBy,date)/(participants,date) indexes; negated regex (userAnalyticsController.js:17-23,94-153)
4. HIGH: Balances recomputed from all expenses per request, cache only on one endpoint (balanceController.js:70-95,179-202; expenseController.js:460,591)
5. HIGH: Inline OCR in addExpense (expenseController.js:250)
6. MED: No compression; no Mongo pool/timeouts config (index.js; config/db.js:5)
7. MED: Regex searches on expense description/user name/group name (globalSearchController.js:109-117; peopleController.js:29-35)
8. MED: getContactIds loads all groups+conversations on each search (utils/contacts.js:9-21)
9. MED: Sequential awaits in getGroupById / sendGroupMessage; Message sort by `_id` vs createdAt index (groupController.js:172-208; groupChatController.js:89-130; chatController.js:170)
10. LOW: missing `.lean()` in notifications/admin stats; redundant groupId index; notification cleanup scan; socket connect/disconnect writes (index.js:188,309)
