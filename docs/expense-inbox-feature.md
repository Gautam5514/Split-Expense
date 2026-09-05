# Expense Inbox — feasibility & implementation plan

Status: **discussion draft, nothing implemented yet.** Written after reading the "FinPilot" product blueprint you shared. This doc separates what FinPilot actually proposes (a full personal-finance app) from the one piece of it — the **Expense Inbox** UI — that's genuinely portable to SplitEase, and lays out what building it here would actually require.

---

## 1. TL;DR / my recommendation

- **Don't build what FinPilot describes.** FinPilot is a different product: a bank/UPI transaction-tracking app that reads your phone's SMS/notifications to auto-capture *every* payment you make, then classifies it. That requires Android's `NotificationListenerService`, a native Kotlin module, Google Play's restricted-permission declaration process, and has **no iOS equivalent at all** (the doc says this itself in section 12.1). Adopting that architecture would turn SplitEase from a group-expense splitter into a personal-finance surveillance app, split your platforms (Android gets it, iOS never can), and puts every future Play Store release at rejection risk for requesting SMS/notification access that a splitting app has no obvious "core use case" for.
- **Do build the Expense Inbox *pattern*, scoped to what SplitEase already knows.** The valuable idea isn't "read the user's SMS" — it's "never silently commit an AI guess to shared money; let the human confirm." SplitEase already has a moment where that principle is missing: receipt OCR today **requires picking a group before scanning** (`groupId` is validated before OCR even runs — see `backend/controllers/expenseController.js:106`). That's backwards. Scan first, decide later, is the actual feature worth building.
- This is a **real, shippable, low-risk feature** if scoped this way. It needs no new OS permissions, no native module, and works identically on Android and iOS and web.

If you want the full FinPilot vision (auto-capture from bank SMS), that's not a feature addition to SplitEase — it's a different product, months of work, and a real Play Store policy fight. Worth naming explicitly so we don't half-build toward it by accident.

---

## 2. What "Expense Inbox" becomes for SplitEase

Reframed from your mockup, using data SplitEase actually has:

```
Expense Inbox                         3

₹850 • Swiggy                              [scanned receipt]
No obvious group match
[Discard] [Add to a group ▾]

₹2,400 • Indian Oil                        [scanned receipt]
No obvious group match
[Discard] [Add to a group ▾]

₹3,260 • Cafe Mocha                        [scanned receipt]
Possible match: Goa Trip (3 members active this week)
[Add to Goa Trip] [Choose a different group]
```

**Sources that feed the inbox** (all things SplitEase already has, nothing new to capture):
1. **Receipt scans without a group chosen yet** — the main driver. User taps "Scan Receipt" from Home (new entry point, not inside a group), OCR runs immediately, item lands in the inbox.
2. *(stretch, phase 2)* **Manual quick-add** — a bare "₹___ for ___" box on Home with no group required, same inbox landing.
3. *(stretch, phase 2, needs your sign-off separately)* **Chat-detected claims** — someone types "I paid 500 for the cab" in a group chat that already exists; today this is just a message. Detecting this and offering "log as expense?" is a nice-to-have but is a distinct feature (chat NLP) — I'd keep it out of v1 so this doesn't turn into three features at once.

**What it explicitly does NOT do:** read notifications, read SMS, request any new Android/iOS permission, or touch anything outside the app.

---

## 3. Why "possible match" is honest, not fake-smart

FinPilot's own doc is right about this (section 3.3, "Evidence before advice"): a suggestion nobody can audit is worse than no suggestion. For SplitEase, "possible match" should be a **transparent, explainable heuristic**, not an ML black box:

- Merchant/description text vs. recent expense descriptions in the user's groups (simple string similarity, no AI call needed for v1).
- Recency + membership: groups the user has logged an expense in within the last N days, ranked by recency.
- `groupType` from the existing Group model (`trip` / `roommate` / `general`) — a rent-shaped merchant name biases toward `roommate` groups, a restaurant name biases toward active `trip` groups.
- Show the *reason* next to the suggestion ("3 members active this week", "you added an expense here yesterday") — same "evidence, not vibes" principle FinPilot correctly insists on.

No LLM call is required for v1 matching. If it's not confident, just say "No obvious group match" and let the user pick — exactly like your mockup's first two items.

---

## 4. Backend changes

### 4.1 New model: `PendingExpense`
```js
// backend/models/pendingExpenseModel.js
{
  userId:        ObjectId,          // who scanned/created it
  imageUrl:      String,            // receipt photo (reuse existing upload pipeline)
  ocrText:       String,            // reuse existing runOcr()
  amount:        Number | null,     // best-effort OCR extraction; user can correct
  merchantGuess: String | null,     // best-effort OCR extraction
  status:        "pending" | "resolved" | "discarded",
  resolvedGroupId: ObjectId | null, // set once the user picks a group
  resolvedExpenseId: ObjectId | null, // the real Expense created on resolve
  createdAt, updatedAt
}
```

### 4.2 New endpoints (`/api/pending-expenses`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/pending-expenses` | Upload a receipt with **no groupId** — runs OCR, extracts best-effort amount/merchant, creates a pending item |
| GET | `/pending-expenses` | List the current user's pending inbox items |
| GET | `/pending-expenses/:id/suggestions` | Return ranked candidate groups with a reason string each |
| POST | `/pending-expenses/:id/resolve` | Body: `{ groupId, ...normal addExpense fields }` — creates the real `Expense` (reuses existing `addExpense` logic) and marks the pending item `resolved` |
| DELETE | `/pending-expenses/:id` | Discard ("Personal", not a group expense) |

### 4.3 Reused, not duplicated
- OCR: `utils/ocrService.js` (`runOcr`) — already exists, just called before a group is known instead of after.
- Expense creation: on resolve, call the same validation/split/notification path `addExpense` already uses, just triggered from a different entry point.
- File upload: whatever pipeline currently gets `fileUrl` to `addExpense` (Cloudinary, per `backend/config/cloudinary.js`) — unchanged.

### 4.4 What does NOT change
- `POST /expenses` (the existing add-expense endpoint) — untouched, still works exactly as today for the normal "already in a group" flow.
- No changes to balances, settlements, or anything from the recent settle-up fix.

---

## 5. App (splitApp) changes

- **New screen**: `app/inbox.jsx` (or a tab badge on Home) — list of pending items, matches your mockup layout (amount, merchant, suggestion, action buttons).
- **New entry point**: "Scan Receipt" button on Home, outside any group context — opens camera/picker, uploads to the new pending-expense endpoint instead of the existing in-group `AddExpenseModal` flow.
- **Resolve flow**: tapping "Add to [Group]" reuses `AddExpenseModal`'s split UI, pre-filled with the OCR'd amount/description/receipt, just called from the inbox instead of from inside a group screen.
- **Badge**: Home tab or a bell-style badge showing pending count, following the same pattern `NotificationBell`/`hasUnread` already use in `NotificationContext.jsx`.
- **Push notification** (optional, cheap once the above exists): "3 receipts waiting in your inbox" — reuses the existing Expo push pipes from the earlier notification fix.

## 6. Web (frontend) changes

Given the standing rule in this repo (web and app should stay at feature parity, backend is the shared source of truth), the same inbox should exist on web: a `/inbox` page mirroring `app/groups/[id]/page.jsx`'s patterns, same three endpoints. Not committing to this yet — flagging it because if we build this only in the app, web silently falls behind again, which is exactly the kind of gap that caused the settle-up bug we just fixed.

---

## 7. Effort shape (rough, not a committed estimate)

| Piece | Size |
|---|---|
| Backend: model + 5 endpoints + reuse existing OCR/expense logic | Small–medium |
| App: inbox screen + scan-receipt entry point + resolve flow reusing AddExpenseModal | Medium |
| Matching/suggestion heuristic (non-AI, string + recency based) | Small |
| Web parity page | Medium (if we do it) |
| Push badge/notification | Small (infra already exists) |

No new infra, no new third-party service, no new OS permission, no native module. This is meaningfully smaller than anything in the FinPilot doc because it deliberately skips the capture problem (SMS/notifications) that makes FinPilot hard.

---

## 8. Open questions for you before anything gets built

1. **Scope confirmation**: build the scoped version in section 2–6 (receipt-scan inbox), explicitly *not* the SMS/notification auto-capture from the FinPilot doc? (My recommendation: yes, only this.)
2. **Web parity**: build it on web too in the same pass, or app-only for now and backfill web later?
3. **OCR quality**: current OCR (Tesseract via `runOcr`) extracts raw text; pulling a clean `amount`/`merchant` out of that reliably for the inbox card is its own small parsing problem (regex over OCR text, not a new OCR engine). Worth a quick spike before committing to a timeline — OCR text can be messy and the "₹850 • Swiggy" card only looks good if extraction is decent.
4. **Chat-detected claims** (section 2, item 3) — in scope for v1 or a later phase? I'd default to later.
5. **Naming** — "Expense Inbox," "Unsorted Receipts," or something else? Doesn't block building, just want the UI copy to match what you'll actually call it.

Nothing here has been implemented. Once you've weighed in on the above, I'll turn this into an actual task list and start on the backend model + endpoints first (they're required regardless of app/web ordering).
