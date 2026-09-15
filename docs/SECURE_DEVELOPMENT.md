# Secure development practices

Maintainers and contributors use the OWASP Top 10 and OWASP ASVS as the baseline
for web security decisions. Reviews consider authentication and authorization,
least privilege, secure defaults, input validation and output encoding, failure
safety, defense in depth, minimized attack surface, and protection of secrets.

Common risks in this stack and required mitigations include:

| Risk | Required mitigation |
|---|---|
| Broken access control / IDOR | Authenticate first and verify resource or group membership server-side. |
| Injection | Validate types and bounds, sanitize MongoDB operators, and avoid constructing executable queries from raw input. |
| XSS | Keep React escaping enabled; sanitize any intentionally rendered HTML and apply restrictive content rules. |
| CSRF and cross-origin abuse | Use an explicit credentialed CORS allow-list and bearer-token authentication. |
| SSRF | Allow only expected protocols/hosts for server-side fetches and reject private/link-local targets. |
| Weak secrets or randomness | Use `crypto.randomInt`/`crypto.randomBytes`; production HMAC secrets must contain at least 32 bytes. |
| File-upload attacks | Verify size, signature/type, extension, and storage destination; never trust the client MIME type alone. |
| Dependency vulnerabilities | Run `npm audit --omit=dev` in CI and update vulnerable production dependencies promptly. |
| Sensitive-data exposure | Keep secrets out of git/logs/responses and return minimal user data. |
| Abuse and denial of service | Apply request-size limits and per-route rate limits to sensitive or expensive operations. |

Every major feature must include automated tests for normal behavior, rejected
inputs, authorization boundaries, and regression cases. Security-relevant
changes receive focused review. Confirmed findings are tracked privately until
a fix and coordinated disclosure are ready; see [SECURITY.md](../SECURITY.md).
