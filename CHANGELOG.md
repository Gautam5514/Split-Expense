# Changelog

All notable changes are documented here. Releases use Semantic Versioning and
are identified by signed or annotated Git tags in the form `vMAJOR.MINOR.PATCH`.

## [Unreleased]

### Added

- **MCP OAuth 2.1 login.** Adding the SplitEase MCP URL to Claude / ChatGPT now
  sends the user to the existing SplitEase `/login` page (with a banner saying
  which app is connecting; `/register` works too) and connects the AI app
  automatically right after they sign in or sign up with Google/email - no
  extra page, no copy-pasting tokens. Implements discovery (RFC 9728 / 8414), dynamic client
  registration (RFC 7591), authorization-code + PKCE (S256), audience-bound
  opaque access tokens (1 h), rotating refresh tokens with reuse detection
  (30 d) and revocation (RFC 7009). The old Firebase-token flow still works.
- Rate limiting on `/mcp`, `expires` cleanup of all OAuth data via MongoDB TTL
  indexes, and a `DELETE /api/oauth/connections` endpoint to disconnect all
  AI apps.

### Changed

- MCP tools no longer return raw database error text to clients;
  `list_expenses` accepts a `limit` (default 200, max 500);
  `get_overall_summary` computes groups in bounded parallel batches;
  `create_group` trims names before validating length.

### Security

- Replaced OTP generation with a cryptographically secure random generator.
- Enforced a minimum 256-bit production JWT secret.
- Updated production dependencies to remediate known advisories.
- Added continuous integration, dependency auditing, CodeQL analysis, and
  property-based security tests.

### Documentation

- Added the MIT license, security policy, API reference, and release process.

## [1.0.0] - 2026-09-15

- Initial documented release of the Split-Expense application.

[Unreleased]: https://github.com/Gautam5514/Split-Expense/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Gautam5514/Split-Expense/releases/tag/v1.0.0
