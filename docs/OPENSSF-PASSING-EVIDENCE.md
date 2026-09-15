# OpenSSF Passing badge evidence

This file records the evidence prepared for OpenSSF Best Practices project
[14650](https://www.bestpractices.dev/projects/14650). Only criteria that are
true in the public default branch should be marked Met in the badge form.

## Repository-backed updates

| Criterion | Evidence |
|---|---|
| `floss_license`, `floss_license_osi`, `license_location` | [`LICENSE`](../LICENSE) declares the OSI-approved MIT license. |
| `documentation_interface` | [`docs/API.md`](API.md) documents authentication, inputs, outputs, errors, and every public route group. |
| `vulnerability_report_process` | [`SECURITY.md`](../SECURITY.md) provides a private report URL, response targets, and disclosure process. |
| `version_semver` | Package versions and [`docs/RELEASING.md`](RELEASING.md) use Semantic Versioning. |
| `test_continuous_integration` | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs tests, lint, and production audits on pushes and pull requests. |
| `tests_documented_added` | [`CONTRIBUTING.md`](../CONTRIBUTING.md) requires automated tests for major functionality and bug fixes. |
| `warnings_fixed`, `warnings_strict` | CI runs ESLint with `--max-warnings=0`; the verified local result is zero findings. |
| `crypto_keylength` | Production startup rejects JWT HMAC secrets shorter than 32 bytes; the environment template documents secure generation. |
| `crypto_random` | Authentication OTPs use Node's cryptographically secure `crypto.randomInt`; invite/reset tokens use `crypto.randomBytes`. |
| `vulnerabilities_fixed_60_days`, `vulnerabilities_critical_fixed` | Both production dependency audits return zero vulnerabilities and CI blocks new moderate-or-higher findings. |
| `static_analysis`, `static_analysis_common_vulnerabilities`, `static_analysis_often` | CodeQL security-extended queries run on every push/PR and weekly in [`.github/workflows/codeql.yml`](../.github/workflows/codeql.yml). |
| `dynamic_analysis`, `dynamic_analysis_enable_assertions` | Jest assertion suites include fast-check property-based fuzzing and run in CI before release. |

## Actions that require maintainer/public-repository state

- `version_tags`: after the changes are merged, create the annotated `v1.0.0`
  tag and matching GitHub release using the documented release process.
- `test_most`: current measured branch coverage is 48.09% for the backend and
  31.01% for the frontend. Do not claim that most branches are covered until
  coverage is materially expanded (normally at least 80%).
- `know_secure_design` and `know_common_errors`: a primary maintainer must
  personally confirm this knowledge. [`docs/SECURE_DEVELOPMENT.md`](SECURE_DEVELOPMENT.md)
  is the project baseline but is not a substitute for an honest attestation.

## Verified locally

- Backend: 8 suites, 154 tests passed; production audit: 0 vulnerabilities.
- Frontend: 3 suites, 13 tests passed; ESLint: 0 findings; production build:
  successful; production audit: 0 vulnerabilities.
