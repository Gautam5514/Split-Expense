# Privacy

This file describes what personal data the Split-Expense software handles, based on
the data models in this repository. It complements the in-app Privacy Policy
(`/privacy`). If you run your own instance, you are the operator of that instance and
are responsible for your own policy and legal compliance (for example India's Digital
Personal Data Protection Act, 2023, or GDPR where applicable).

## Data the software stores

| Category | Fields (see `backend/models/`) | Purpose |
|---|---|---|
| Account | name, email, password hash (optional), Firebase UID, profile photo URL | Sign-in and identity |
| Profile (optional, user-provided) | mobile, address, city, state, UPI ID, UPI QR image, profession, bio, timezone, interests | Payments between members and personalisation |
| Group activity | groups, members, expenses, balances, settlements, notepads, chat messages, receipt images | Core splitting features |
| Device and notifications | push tokens (Expo / web) | Notifications |
| Security | login OTP and reset tokens (short-lived), failed-attempt counters | Authentication |
| Usage counters | active-day count, expense count, reward coins | Referral and reward features |

Only name, email and group activity are needed for core use. Profile fields are optional.

## Who can see what

- Group members see the expenses, balances, members and messages of groups they belong to.
- Users can block others, choose who may add them (`contacts` or `invite`), and choose
  whether they are discoverable by email (`privacy` settings in the user model).
- The software does not sell personal data and contains no advertising SDKs.

## Third-party services (current architecture)

| Service | Data sent | When |
|---|---|---|
| Firebase Authentication / Cloud Messaging | Identity and push tokens | Sign-in, notifications |
| Cloudinary | Profile, UPI QR, chat and receipt images | Image upload |
| SMTP provider (operator's choice) | Email address and message | OTP and invite emails |
| OpenAI / Google Gemini | Prompt context built from the user's own group data | Only when a user uses the AI assistant |
| Tesseract.js (runs on the server) | Receipt image | OCR, processed locally, not sent to a third party |

Self-hosters choose and configure these services with their own accounts.

## Your controls

- **Delete account:** `DELETE /api/profile/account` permanently removes the user, the
  profile, groups the user created, profile and UPI images from Cloudinary, and the
  Firebase Auth record, and removes the user from other groups.
- **Correct data:** edit profile fields in the app.
- **Copy of your data:** currently by request to the instance operator. A self-service
  export is on the roadmap (see [docs/DPG-COMPLIANCE.md](docs/DPG-COMPLIANCE.md)).

## Security

Passwords are hashed (bcrypt), tokens use cryptographically secure randomness, the API
uses `helmet` and rate limiting, and dependencies are audited in CI. Report
vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Contact

Open a GitHub issue for general privacy questions, or use private vulnerability
reporting for security matters. **[TO FILL: maintainer privacy contact email]**
