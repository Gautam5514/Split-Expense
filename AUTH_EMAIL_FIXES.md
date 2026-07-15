# Auth & Email — Problem Analysis and Fixes

Date: 2026-07-15
Scope: signup / login / email reliability (the app's entry point)

This document breaks the reported problems into small, separate issues, explains
the **root cause** of each, and lists exactly what was changed to fix them.

---

## Summary of what was reported

1. Emails fail when ~10 are sent at once.
2. Login does not ask for OTP.
3. Signup does not ask for OTP.
4. Signup / auth sometimes shows a **blank screen** with only a network-tab error.

## What we decided (product)

- **OTP is needed only at SIGNUP** — to confirm the email is real and not a
  duplicate/dummy address. **Login does NOT need OTP.**
- **Keep Gmail SMTP**, but make it robust.

---

## Problem 1 — Bulk email failure (10 emails at once) ✅ FIXED

### Root cause
- `backend/utils/emailService.js` created a **non-pooled** Nodemailer
  transporter. Every `sendMail()` opened a **brand-new SMTP connection + login
  handshake**.
- `backend/controllers/groupController.js` sent all group-invite emails **at the
  same time** with `Promise.all`. Inviting 10 people opened ~10 simultaneous
  connections to `smtp.gmail.com`.
- Gmail rejects too many concurrent connections (`421 Too many concurrent
  connections` / "try again later"). Several emails **silently failed** (they
  were only `console.error`-ed, never retried).

### Fix
`backend/utils/emailService.js`
- Switched to a **pooled** transporter: `pool: true`, `maxConnections: 3`,
  `maxMessages: 50`, plus a rate limit (`rateDelta: 1000`, `rateLimit: 5` → max
  5 messages/second). Nodemailer now internally queues sends and drains them a
  few at a time, so even a burst of 20 is safe.
- `secure` is now derived from the port (`465` = implicit TLS, `587` = STARTTLS)
  so a port/secure mismatch can't silently break every send.
- Added **connection/greeting/socket timeouts** so a stuck send fails fast
  instead of hanging.
- Added **retry with backoff** (`sendEmail`, up to 2 retries) for transient SMTP
  4xx / network errors only. Permanent 5xx (bad address, auth) are not retried.
- Added `transporter.verify()` at startup — a bad SMTP config now shows in the
  server logs immediately.
- Added `sendEmailsSafely(messages)` — sends **sequentially**, never rejects the
  whole batch because one address bounced, and returns `{ sent, failed }`.

`backend/controllers/groupController.js`
- Group invites now use `sendEmailsSafely(...)` instead of a concurrent
  `Promise.all` burst.

> Note: Gmail still has a hard **~500 emails/day** cap and is not a transactional
> provider. If volume grows, move to Resend / SendGrid / SES / Brevo by swapping
> the `SMTP_*` env vars — no code change is required because everything goes
> through `emailService.js`.

### Follow-up (2026-07-15): the "500 on /auth/send-signup-otp" was Gmail quota

Live diagnosis showed the SMTP transporter connects and authenticates fine, but
Gmail rejected the send with:

```
550-5.4.5 Daily user sending limit exceeded   (responseCode: 550)
```

This is **not a code bug** — the sending mailbox (`softgpt9299@gmail.com`) was out
of its daily quota (exhausted during testing). No pooling/retry can beat a daily
cap; `550` is permanent so it is (correctly) not retried.

Handling added in `sendSignupOtp`: a quota/rate block (`550`/`421`/`452` or a
"limit exceeded" message) now returns **503** with a clear
"daily sending limit reached, try again later" message (instead of a vague 500),
and rolls back the stored code so a later retry re-sends cleanly.

**Decision (superseded 2026-07-15):** we initially stayed on Gmail. The quota
block recurred and is currently blocking all signups, so the decision is now to
**move to Brevo**. See "Still open: email delivery" at the end of this document.

---

## Problem 4 — Blank screen (entry-point killer) ✅ FIXED

> Fixed before OTP because a blank entry point is the most damaging issue.

### Root cause
- `frontend/context/AuthContext.jsx` did `if (loading) return null;`. This
  rendered **nothing for the entire site** until Firebase's `onIdTokenChanged`
  fired. If Firebase env vars were missing/invalid in production, or Firebase
  couldn't reach Google to restore a session, `loading` stayed `true`
  **forever** → permanent blank page with only a console/network error.
- There was **no error boundary** anywhere, so a crash in any provider effect or
  page render unmounted the whole React tree → blank page.

### Fix
`frontend/context/AuthContext.jsx`
- Added a **6-second fail-safe timeout** that forces `loading = false`, so the
  app always renders (as logged-out) instead of hanging.

`frontend/components/ErrorBoundary.jsx` (new) + `frontend/app/layout.jsx`
- Added an `ErrorBoundary` wrapping the whole provider tree. Any render/init
  crash now shows a friendly "Something went wrong — Reload" screen instead of a
  blank page.

---

## Problem 2 — Login does not ask for OTP — WORKING AS INTENDED

- `frontend/app/(auth)/login/page.jsx` has `LOGIN_OTP_ENABLED = false`
  (deliberate "app-review mode"). Login goes straight to Firebase.
- **This is correct per the decision above — login should NOT ask for OTP.**
- Left unchanged. (The backend login-OTP endpoints still exist but are unused by
  the web login flow.)

---

## Problem 3 — Signup does not ask for OTP ✅ ADDED

### Root cause
- The register page never had an email-verification step — it called Firebase
  `createUserWithEmailAndPassword` directly. There was no signup-OTP endpoint at
  all. Dummy/duplicate emails could create accounts.

### Fix — new signup email verification (verify BEFORE the account is created)

Backend:
- `backend/models/signupOtpModel.js` (new) — holds a pending code
  (`email`, `otpHash`, `attempts`, `expiresAt`) with a **TTL index** so codes
  auto-expire. The real account is not created until the code is verified.
- `backend/controllers/authController.js` (new handlers):
  - `sendSignupOtp` — validates name/email, **rejects duplicates** (checks both
    MongoDB and Firebase), throttles resends (60s), stores a hashed 6-digit code
    (10-min expiry), emails it. Returns a clear 500 message if the email can't
    be sent (so the UI never hangs on a blank screen).
  - `verifySignupOtp` — verifies the code, bounded by a per-record attempt
    counter (max 5) and expiry; deletes the record on success.
- `backend/routes/authRoutes.js`:
  - `POST /auth/send-signup-otp` and `POST /auth/verify-signup-otp`.
  - Given a dedicated `signupOtpLimiter` (12 / 15 min) so mistyped codes don't
    lock users out of the shared strict limiter. (Brute force is still bounded
    by the per-record attempt counter.)

Frontend:
- `frontend/app/(auth)/register/page.jsx` is now a **two-step flow**:
  1. `form` step: user enters name/email/password → `POST /auth/send-signup-otp`.
  2. `otp` step: 6-box code entry → `POST /auth/verify-signup-otp` → on success
     it runs the original Firebase `createUserWithEmailAndPassword` + backend
     sync. Includes resend (60s cooldown) and a Back button.
- Google signup is unchanged (Google emails are already verified).

### Update (2026-07-15): signup is now fully server-enforced ✅

The limitation noted here previously — "a determined user could still call
Firebase directly and bypass the code, because account creation happens
client-side" — has been closed. Three separate holes existed:

1. **Client-side account creation.** The register page called
   `createUserWithEmailAndPassword` itself, so the OTP was only a UI formality.
2. **`authMiddleware` auto-provisioned anyone.** It called `findOrCreateUser`
   for *any* valid Firebase token, so an account created directly against the
   public web API key became a real user on its first request. `POST /auth/google`
   had the same problem.
3. **`POST /auth/register` was an open door.** It created a working Firebase +
   Mongo account from name/email/password with **no verification at all**.
   Nothing called it.

What changed:

- `verifySignupOtp` now **creates the account itself** (`admin.auth().createUser`
  with `emailVerified: true`, since the code just proved the inbox), then returns
  a **Firebase custom token**. The register page calls `signInWithCustomToken`
  instead of creating anything. The `name` comes from the stored OTP record, not
  from whatever the client posts back.
- `findOrCreateUser` gained `allowCreate`. `authMiddleware` and `googleLogin`
  pass `allowCreate: decoded.email_verified === true` and return **403
  `EMAIL_NOT_VERIFIED`** otherwise. The gate is on **creation only** — existing
  accounts (which have `emailVerified: false` from the old client-side flow) are
  *not* locked out. This was verified explicitly.
- `POST /auth/register` and its handler were **removed**.

Verified end-to-end against local server + live Firebase/Mongo (probe accounts
cleaned up afterwards):

| Check | Result |
|---|---|
| `POST /auth/register` | 404 — endpoint gone |
| Correct OTP | 201 + `customToken`; Firebase `emailVerified: true`; Mongo user + referral code |
| Wrong OTP | 400, no account created |
| Code replay after use | record consumed, cannot be reused |
| **Direct Firebase signup → `/auth/google`** | **403 `EMAIL_NOT_VERIFIED`, no user created** |
| **Direct Firebase signup → `/api/profile`** | **403 `EMAIL_NOT_VERIFIED`, no user created** |
| **Legacy user (`email_verified: false`, already in Mongo)** | **200 — not locked out** |

### Still open: email delivery (the actual blocker)

Signup cannot complete for anyone while Gmail's daily quota is exhausted — the
code never arrives. Confirmed live: `POST /api/auth/send-signup-otp` → **503**
"daily sending limit reached". **Decision: move to Brevo** (300/day free). This
is an env-var change only (`SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`,
`SMTP_USER`/`SMTP_PASS` from the Brevo SMTP key, `SMTP_FROM` a verified sender);
no code change, because all sending goes through `emailService.js`.

---

## Deployment notes

- **No new dependencies.** `nodemailer` was already installed; the frontend
  changes use React only.
- **No env changes required.** Same `SMTP_*` vars. (`SMTP_PORT=587` → STARTTLS,
  which is correct.)
- The new `SignupOtp` MongoDB collection + its TTL index are created
  automatically on first use.
- **Backend must be redeployed** for the new `/auth/send-signup-otp` and
  `/auth/verify-signup-otp` routes to exist — otherwise the new register page
  will get 404s. Deploy backend and frontend together.

## How to verify after deploy

1. **Bulk email:** invite ~10 unregistered emails to a group → all should
   arrive; server logs show any individual failures without failing the batch.
2. **Blank screen:** load the site with throttled/blocked network to Firebase →
   the login page should still render within ~6s (not blank).
3. **Signup OTP:** sign up with a real email → receive a code → enter it →
   account is created. Try a duplicate email → blocked with a clear message.
4. **Login:** email/password login still works and does **not** ask for a code.
