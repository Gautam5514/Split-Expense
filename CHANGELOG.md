# Changelog

All notable changes are documented here. Releases use Semantic Versioning and
are identified by signed or annotated Git tags in the form `vMAJOR.MINOR.PATCH`.

## [Unreleased]

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
