# SplitEase - Honest Production Readiness Audit

**Audited by:** Claude Code  
**Date:** 2026-05-26  
**Verdict: NOT READY FOR PRODUCTION**

---

## What You Built (Appreciation First)

Let me be honest about this part too - **this is genuinely impressive for an indie project.**

- Full expense splitting with equal/exact/percent modes
- Real-time chat (direct + group) with Socket.io
- Multi-channel push notifications (FCM + OneSignal + Expo) - that's rare
- OCR receipt scanning with Tesseract.js
- AI assistant via Gemini with fallback models
- Firebase Auth + JWT dual-auth system
- QR code group invites
- Collaborative notepad
- PWA with service worker
- Dark mode with context
- Analytics/balance charts with Recharts
- 17 pages, 14 controllers, 10 models - a complete product

You shipped a LOT. The architecture is clean, the feature set is real. This isn't a tutorial project. But production is a different standard - here's exactly what will kill you.

---

## CRITICAL - These Will Get You Hacked or Taken Down

### 1. YOUR ENTIRE `.env` IS COMMITTED TO GIT

This is the most serious issue in the codebase. Your `backend/.env` contains live production secrets:

```
MongoDB URI with password:        RbkJ5YAlAw9Yfuw9
JWT Secret:                       supersecretkey
Cloudinary API Secret:            2t1OBGToZKZ39WZYfcbuGJsAaVs
Firebase RSA Private Key:         (full 2048-bit private key exposed)
Gmail App Password:               hhrs ytzy itth vihb
OneSignal REST API Key:           os_v2_app_alnprder5bhchkgtjywqpqm4svys4nf7...
Google API Key:                   AIzaSyCHOVbVjAAR-Za8-XjjgeY4-Jf-ESRYBKY
```

**Anyone who has ever cloned this repo, or will clone it, has these keys.** GitHub scans public repos for secrets and often notifies service providers. Your Firebase project can be taken over. Your MongoDB database can be wiped. Your Gmail can be used to send spam.

**What to do RIGHT NOW (before anything else):**

1. Go to Firebase Console → Service Accounts → Revoke and regenerate the key
2. Go to MongoDB Atlas → Rotate the database password
3. Go to Cloudinary → Regenerate API secret
4. Go to Google Cloud Console → Delete and recreate the API key
5. Go to OneSignal → Regenerate REST API key
6. Go to Gmail → Revoke the app password and generate a new one
7. Run `git filter-repo --path backend/.env --invert-paths` to purge from git history
8. Add `.env` to `.gitignore` immediately
9. Create `backend/.env.example` with placeholder values

**This is Day 0 work. Do not deploy until this is done.**

---

### 2. JWT SECRET IS "supersecretkey"

```
JWT_SECRET=supersecretkey
```

This is a dictionary word. Any JWT signed with this can be forged by anyone who knows the secret (and it's now public). A forged JWT lets someone impersonate any user in your app.

**Fix:** Generate a proper secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 3. No Rate Limiting on Any Endpoint

Your login endpoint, password reset, and all API routes have zero rate limiting. This means:

- Someone can brute-force any user's password with no obstacle
- Someone can spam your password reset email (burning your Gmail quota)
- Someone can hammer your MongoDB Atlas free tier into suspension

**Fix:** Add `express-rate-limit` to your backend:
```bash
npm install express-rate-limit
```
```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }));
```

---

### 4. Frontend Stores JWT in localStorage (XSS Vulnerable)

Any JavaScript running on your page (including injected scripts via XSS, browser extensions, or a compromised npm package) can read `localStorage` and steal the token. Firebase token is also stored there.

**Fix:** Move tokens to HttpOnly cookies. This is a larger refactor but it matters.

---

### 5. Socket.io Online Users Stored in Memory

```javascript
export const onlineUsers = new Map(); // in index.js
```

Every time your backend restarts (deploy, crash, auto-restart), all online users are wiped. More importantly, if you ever run two backend instances (horizontal scaling), they each have a separate map - messages won't route correctly.

**Fix:** Use Redis via `socket.io-redis` adapter. Required before any scaling.

---

## HIGH PRIORITY - These Will Hurt in First Month of Real Traffic

### 6. No Structured Logging or Error Tracking

Your backend has 56+ `console.log` statements. In production:
- Logs scroll past and disappear
- You can't search them
- You get no alerts when errors spike
- You have no idea what's failing

**Fix:** 
- Replace `console.log` with `pino` or `winston` (structured JSON logs)
- Add Sentry for error tracking (free tier is enough to start):
  ```bash
  npm install @sentry/node
  ```

---

### 7. Error Responses Expose Internal Details

Several controllers return raw error messages to the client:
```javascript
res.status(500).json({ message: error.message }); // ❌ exposes stack traces
```

This leaks your database schema, file paths, and implementation details to anyone who pokes your API.

**Fix:** Add a global error handler and sanitize production errors:
```javascript
// At the bottom of index.js, before server.listen
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});
```

---

### 8. No Health Check Endpoint

No `/health` or `/api/health` endpoint. This means:
- Your hosting platform can't verify the app is alive
- Load balancers can't route around a crashed instance
- You have no simple way to check if the backend is up

**Fix:**
```javascript
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
```

---

### 9. No Database Indexes (Beyond One)

You have one index in your entire schema (`Group.name + createdBy`). Missing:

| Collection | Missing Index | Impact |
|---|---|---|
| User | `email`, `firebaseUid` | Login is a full collection scan |
| Expense | `groupId`, `date` | Loading group expenses is slow |
| Message | `conversationId`, `createdAt` | Chat history is slow |
| GroupMessage | `groupId`, `createdAt` | Group chat is slow |
| Conversation | `members` | Finding DMs is slow |
| Notification | `userId` | Loading notifications is slow |

At 10,000 users these will be visible. At 100,000 they'll time out.

**Fix:** Add indexes to your Mongoose schemas:
```javascript
// In expenseModel.js
expenseSchema.index({ groupId: 1, date: -1 });
// In messageModel.js
messageSchema.index({ conversationId: 1, createdAt: -1 });
```

---

### 10. No Graceful Shutdown

Your server has no `SIGTERM` handler. When your host sends a shutdown signal (every deploy, every restart), in-flight requests are killed mid-execution - potentially corrupting database operations.

**Fix (add to the bottom of index.js):**
```javascript
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close(false, () => process.exit(0));
  });
});
```

---

### 11. No Node.js Version Pinned

There's no `.nvmrc`, no `engines` field in package.json. If your hosting platform upgrades Node, your app might break silently.

**Fix:** Add to both `package.json` files:
```json
"engines": { "node": ">=20.0.0" }
```

---

### 12. Expense Creation Has No Database Transaction

When an expense is created, you:
1. Save the expense to MongoDB
2. Create notifications for each member

If step 2 fails, the expense exists but no one was notified. There's no rollback. MongoDB Atlas supports sessions/transactions - use them for write operations that span multiple collections.

---

## MEDIUM PRIORITY - These Will Annoy Your Users

### 13. No Currency Support

All amounts are stored as plain numbers with `₹` hardcoded in the frontend. There's no `currency` field on the Expense model. If you ever want to support international users or even just show currency correctly, this becomes a migration. Add the field now while the schema is young.

---

### 14. No Group Size or Usage Limits

- No limit on members per group
- No limit on groups per user
- No limit on expenses per group
- No limit on messages

A single bad actor can create 10,000 groups and fill your MongoDB Atlas free tier. Add application-level limits.

---

### 15. Multiple Notification Channels With Silent Failures

You have FCM, OneSignal, and Expo notifications all firing at once. If any one channel fails (rate limit, quota, token expired), the error is swallowed silently. Users think they got notified but didn't. Add logging at minimum for failed notification sends.

---

### 16. No Archive for Completed Groups

`isCompleted` is a boolean flag, but completed groups still appear in lists, expenses are still editable, and there's no UI treatment difference. Either enforce immutability on completion or remove the field until you implement it properly.

---

### 17. Socket.io Has No Authentication Per Event

The `joinConversation` and `joinGroup` socket events accept any room name with no authorization check:
```javascript
socket.on("joinConversation", (conversationId) => {
  socket.join(conversationId); // ❌ No check if user is in this conversation
});
```

Anyone with a socket connection can join any conversation room by guessing a valid MongoDB ObjectId and receive all messages.

**Fix:** Verify membership before allowing room join.

---

## LOW PRIORITY - Code Quality & Future-Proofing

### 18. Zero Tests

No unit tests, no integration tests, no E2E tests. This isn't blocking production today, but the moment you touch a controller to fix a bug, you'll have no safety net. Start with controller-level tests using Jest + supertest. Even 20% coverage on core paths (auth, expenses, balances) changes everything.

---

### 19. Backend Has No TypeScript

Frontend has TypeScript (partially). Backend is plain JavaScript. You'll hit runtime errors that TypeScript would have caught at compile time - especially in the expense splitting math and balance calculations where a wrong type ruins a financial calculation.

---

### 20. No API Documentation

No Swagger, no README with endpoints. The moment someone else touches this backend, or you come back to it in 6 months, you'll spend an hour reverse-engineering your own routes.

---

### 21. Inconsistent User ID String Handling

Scattered through controllers:
```javascript
String(userId)           // in one place
userId.toString()        // in another
userId                   // raw ObjectId in a third
```

You have a helper `asId()` in some places but don't use it everywhere. This causes subtle bugs where `===` comparisons fail because one side is a string and the other is an ObjectId.

---

### 22. Gmail SMTP Will Rate-Limit You

Gmail app passwords are for personal use. At scale, Gmail will throttle or block your password reset emails. Switch to a transactional email provider: Resend (free tier is 3,000/month), SendGrid, or Postmark. All of them have better deliverability and real dashboards.

---

## Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Feature Completeness | 8/10 | Genuinely impressive for an indie product |
| Code Structure | 7/10 | Clean separation, readable controllers |
| Security | 2/10 | Exposed secrets, no rate limiting, XSS-vulnerable storage |
| Database Design | 6/10 | Good schemas, missing indexes |
| Error Handling | 4/10 | Inconsistent, leaks internals |
| Scalability | 3/10 | In-memory state, no Redis, no transactions |
| Observability | 1/10 | Just console.log, no metrics, no tracing |
| Testing | 0/10 | Zero tests |
| Documentation | 2/10 | No API docs, no .env.example |
| Production Ops | 2/10 | No health check, no graceful shutdown, no node version pin |

---

## What to Fix and In What Order

### This Week (Blockers)
1. Rotate all exposed credentials immediately
2. Remove .env from git history
3. Change JWT secret to a real 64-byte random string
4. Add rate limiting to auth routes
5. Add .env.example files

### Next Week (Stability)
6. Add global error handler (sanitize 500 responses)
7. Add `/health` endpoint
8. Add database indexes (User.email, Expense.groupId, Message.conversationId)
9. Add graceful shutdown handler
10. Add Sentry for error tracking
11. Pin Node.js version

### Before Scaling Beyond 1,000 Users
12. Move Socket.io state to Redis
13. Add Socket.io room authorization
14. Move JWT to HttpOnly cookies
15. Add database transactions for expense creation
16. Add group/usage limits
17. Switch from Gmail to Resend/SendGrid

### Nice to Have
18. Add TypeScript to backend
19. Write integration tests for core flows
20. Add API documentation (Swagger)
21. Add currency field to expense model
22. Implement proper group archive

---

## Final Verdict

**Ship it to a small group of trusted beta users? Yes.**  
**Open it to the public and scale? No, not yet.**

Fix the credential exposure and rate limiting first - those are emergencies, not improvements. Everything else can be done incrementally without blocking a soft launch. The product itself is solid. The infrastructure around it needs work.

The good news: none of these are fundamental design flaws. Your architecture is sound. These are operational gaps, and they're all fixable in 2-3 focused weeks.
