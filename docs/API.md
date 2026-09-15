# REST API reference

The backend serves JSON under `/api` (default local origin:
`http://localhost:5000`). Request bodies use `application/json`, except media
uploads, which use `multipart/form-data`. Successful responses are JSON unless
an endpoint returns no content. Errors use an appropriate 4xx/5xx status and a
body shaped like `{ "message": "Human-readable explanation" }`.

Protected routes require `Authorization: Bearer <Firebase-ID-token>`. Admin
routes, other than login, require the admin JWT returned by `/api/admin/login`.
Identifiers in paths are MongoDB object IDs unless otherwise noted. Fields not
shown below are optional unless the endpoint validates them as required.

## Authentication

| Method | Path | Input | Output |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | User/session data |
| POST | `/api/auth/google` | `{ idToken }` | User/session data |
| POST | `/api/auth/forgot-password` | `{ email }` | Reset-request status |
| POST | `/api/auth/reset-password` | `{ token, password }` | Reset status |
| POST | `/api/auth/send-login-otp` | `{ email }` | Delivery status |
| POST | `/api/auth/verify-login-otp` | `{ email, otp }` | User/session data |
| POST | `/api/auth/send-signup-otp` | `{ name, email, password }` | Delivery status |
| POST | `/api/auth/verify-signup-otp` | `{ name, email, password, otp }` | Created user/session data |

OTP and authentication endpoints are rate-limited. OTPs expire and are never
returned in API responses.

## Groups, expenses, and balances

| Method | Path | Input | Output |
|---|---|---|---|
| POST | `/api/groups` | Group name and member data | Created group |
| GET | `/api/groups` | — | Current user's groups |
| GET | `/api/groups/:groupId` | — | Group details |
| DELETE | `/api/groups/:groupId` | — | Deletion status |
| GET | `/api/groups/:groupId/available-users` | — | Addable users |
| POST | `/api/groups/:groupId/members` | `{ emails: string[] }` | Updated group |
| DELETE | `/api/groups/:groupId/members/:userId` | — | Updated group |
| PUT | `/api/groups/:groupId/complete` | Completion state | Updated group |
| POST | `/api/groups/:groupId/invite` | — | Invite URL/code |
| POST | `/api/groups/join/:inviteCode` | — | Joined group |
| POST | `/api/expenses` | Description, amount, payer and split data | Created expense |
| GET | `/api/expenses/:groupId` | — | Group expenses |
| POST | `/api/expenses/settle/request` | Settlement participants and amount | Settlement request |
| GET | `/api/expenses/settle/pending/:groupId` | — | Pending settlements |
| POST | `/api/expenses/settle/:requestId/confirm` | — | Confirmed settlement |
| POST | `/api/expenses/settle/:requestId/reject` | — | Rejection status |
| POST | `/api/expenses/settle/:requestId/cancel` | — | Cancellation status |
| GET | `/api/balances/:groupId` | — | Calculated group balances |

The server validates group membership before returning, changing, or relaying
group-scoped data.

## Chat, notepads, notifications, and profile

| Method | Path | Input | Output |
|---|---|---|---|
| GET/POST | `/api/groups/:groupId/messages`, `/api/groups/:groupId/message` | Message body for POST | Group messages/message |
| POST | `/api/groups/messages/delete` | Message identifiers | Deletion status |
| POST | `/api/groups/:groupId/mark-seen` | — | Read status |
| POST | `/api/chat/conversation` | Participant ID | Conversation |
| GET | `/api/chat/conversations` | — | Conversations |
| GET | `/api/chat/messages/:id` | — | Direct messages |
| POST | `/api/chat/message` | Recipient/conversation and message | Created message |
| GET | `/api/chat/my-contacts` | — | Contacts |
| POST | `/api/chat/reset-unread` | Conversation ID | Read status |
| POST | `/api/chat/delete-conversations` | Conversation IDs | Deletion status |
| POST/GET | `/api/notepads`, `/api/notepads/:groupId` | Notepad data for POST | Notepad(s) |
| POST | `/api/notepads/:notepadId/steps` | Step data | Updated notepad |
| PUT | `/api/notepads/:notepadId/reorder` | Ordered step IDs | Updated notepad |
| GET | `/api/notifications` | — | Notifications |
| POST/DELETE | `/api/notifications/push-token` | Push token | Registration status |
| POST/DELETE | `/api/notifications/web-push-token` | FCM token | Registration status |
| PUT | `/api/notifications/mark-read` | — | Read status |
| PUT | `/api/notifications/:id/read` | — | Updated notification |
| GET/PUT | `/api/profile` | Profile fields for PUT | Profile |
| POST | `/api/profile/image` | Image upload | Updated image URL |
| DELETE | `/api/profile/account` | — | Account deletion status |
| GET | `/api/users`, `/api/users/me`, `/api/users/:id` | — | User data |
| GET | `/api/users/analytics` | — | User analytics |

## Public, AI, upload, referral, and administration

| Method | Path | Input | Output |
|---|---|---|---|
| POST | `/api/upload` | Authenticated media upload | Media URL and metadata |
| POST | `/api/ai/query` | `{ query, ...context }` | AI response |
| GET | `/api/referrals/me` | — | Referral balance/history |
| POST | `/api/referrals/purchase` | Store item identifier | Purchase result |
| POST | `/api/contact` | Contact form fields | Submission status |
| GET | `/api/blog/posts`, `/api/blog/posts/:slug` | — | Published post(s) |
| GET | `/api/careers/jobs`, `/api/careers/jobs/:id` | — | Open job(s) |
| POST | `/api/careers/jobs/:id/apply` | Application fields/file | Application status |
| POST | `/api/admin/login` | `{ email, password }` | `{ token, email }` |
| GET | `/api/admin/stats` | — | Administrative statistics |
| GET/PATCH/DELETE | `/api/admin/contact-messages/:id?` | Status for PATCH | Message data/status |
| GET/POST/PATCH/DELETE | `/api/admin/blog/posts/:id?` | Post data for writes | Post data/status |
| GET/POST/PATCH/DELETE | `/api/admin/careers/jobs/:id?` | Job data for writes | Job data/status |
| GET/PATCH | `/api/admin/careers/applications/:id?` | Status for PATCH | Application data/status |

Exact validation and response fields are versioned with the route and
controller source under `backend/routes` and `backend/controllers`. When a
breaking API change is needed, it requires a major release and release notes.
