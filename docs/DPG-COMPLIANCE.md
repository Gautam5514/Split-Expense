# Digital Public Good (DPG) Standard: Compliance Map

This document maps Split-Expense to the nine indicators of the
[Digital Public Goods Standard](https://digitalpublicgoods.net/standard/) and points to
the evidence for each. Status values are deliberately candid: **Met**, **Met with
documented mitigation**, or **Planned**. Last reviewed: 2026-10-14.

| # | Indicator | Status | Evidence / notes |
|---|---|---|---|
| 1 | Relevance to SDGs | Met (evidence being collected) | [SDG-IMPACT.md](SDG-IMPACT.md): primary SDG 1 (target 1.4), supporting SDG 8 and 10 |
| 2 | Use of approved open licence | Met | MIT licence in [`LICENSE`](../LICENSE) (OSI-approved); also in `splitApp/LICENSE` |
| 3 | Clarity of ownership | Met | Copyright (c) 2026 Gautam Pandit; single maintainer; contribution rules in [CONTRIBUTING.md](../CONTRIBUTING.md) |
| 4 | Platform independence | Met with documented mitigation | See section A |
| 5 | Documentation | Met | [README](../README.md), [API reference](API.md), [CONTRIBUTING](../CONTRIBUTING.md), [secure development](SECURE_DEVELOPMENT.md), [releasing](RELEASING.md), `.env.example` templates |
| 6 | Mechanism for extracting data | Met with documented mitigation | See section B |
| 7 | Adherence to privacy and applicable laws | Met | [PRIVACY.md](../PRIVACY.md), in-app `/privacy` and `/terms`, account deletion endpoint, user privacy controls |
| 8 | Adherence to standards and best practices | Met, in progress | OpenSSF Best Practices project [14650](https://www.bestpractices.dev/projects/14650), CI, CodeQL, dependency audit, SemVer ([evidence](OPENSSF-PASSING-EVIDENCE.md)) |
| 9 | Do no harm by design | Met | [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [SECURITY.md](../SECURITY.md), block and privacy controls, rate limiting, secure upload checks (`utils/uploadSecurity.js`) |

## A. Platform independence

The software is fully open source and every component can be run by a third party.
Some deployments rely on commercial *hosted services* for convenience. These are
integration points, not locks on the code, and each has a documented path to an open
alternative. All data is stored in the operator's own database.

| Component | Role today | Open alternative / mitigation | Status |
|---|---|---|---|
| MongoDB | Primary database. Operators may self-host the free Community edition or use any managed MongoDB-compatible service | Data access is through Mongoose models only; MongoDB-API-compatible open engines can be evaluated | Self-hostable today; compatibility testing **Planned** |
| Firebase Authentication / Cloud Messaging | Sign-in identity and push delivery | Auth is isolated in `config/firebaseAdmin.js` and `middleware/authMiddleware.js`, so a self-hosted identity provider (for example Keycloak or an email-and-password flow) can be added behind the same interface. The app also stores its own password-hash path for non-Firebase users | **Planned**. Currently required to start the backend |
| Cloudinary | Image storage and delivery | Uploads are isolated in `config/cloudinary.js` and `controllers/uploadController.js`; an S3-compatible or local-disk adapter (for example MinIO) is the target | **Planned** |
| OpenAI / Google Gemini | Optional AI assistant | Assistant is a separate route group (`/api/ai`); a self-hosted open-weights model behind the same service interface is the target | **Planned** |
| SMTP | Email OTP and invites | Any SMTP server works (open standard) | Met |
| Tesseract.js | Receipt OCR | Open source, runs locally on the server | Met |
| Frontend, mobile | Next.js, React Native (Expo) | All open-source frameworks | Met |

Honest note for operators: at present the backend expects Firebase credentials at
startup and the OpenAI client is initialised on import, so a fresh install needs those
credentials (free tiers are available). Removing this requirement is the first item
on the roadmap below.

## B. Data extraction

- Users own their data. A copy is available on request to the instance operator, and
  operators have full database access (standard MongoDB tooling such as `mongodump`
  and `mongoexport`).
- Account deletion is self-service: `DELETE /api/profile/account`.
- All user-visible records are available through the documented REST API ([API.md](API.md)).
- **Planned:** self-service CSV/JSON export of a user's expenses and balances, available to all users free of charge. The pricing page mentions exports as a future "Pro" feature; for DPG purposes, data export should remain part of the free, open-source core.

## C. Roadmap (documentation commitments)

1. Make Firebase, Cloudinary and AI keys genuinely optional with graceful fallbacks, and update the README accordingly.
2. Add self-service CSV/JSON export in the open-source core.
3. Provide a one-command self-hosting guide (Docker Compose with MongoDB, MinIO, SMTP).
4. Hindi and regional-language UI strings.
5. Raise automated test coverage (currently ~48% backend, ~31% frontend).
6. Publish annotated `v1.0.0` tag and release notes as per [RELEASING.md](RELEASING.md).

## D. Business model and openness

The core application is free and open source. Any future paid tier ("Splitease Pro")
must not remove data-portability or core features from the open-source release.
