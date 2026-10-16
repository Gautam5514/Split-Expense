# SplitEase MCP: OAuth login

Connect an AI app (Claude, ChatGPT, ...) to SplitEase by pasting one URL:

```
https://<your-api-host>/mcp          e.g. https://api.splitease.tech/mcp
```

The app opens the normal SplitEase login page (`https://splitease.tech/login`,
with a banner saying which app is connecting). The user signs in **or signs up**
(Google or email) exactly as usual and is sent straight back to the AI app,
which is now connected. No extra page, no token copying. If the visitor is
already signed in, they get a one-click "Connect as you@x.com" prompt instead
(never a silent connect).

## How it works

```
AI app                     SplitEase API                    splitease.tech
  | POST /mcp (no token) ------> 401 + WWW-Authenticate: resource_metadata=...
  | GET  /.well-known/oauth-protected-resource/mcp  --> authorization server
  | GET  /.well-known/oauth-authorization-server    --> endpoints
  | POST /register (dynamic client registration)    --> client_id
  | open browser: GET /authorize?...&code_challenge=... (PKCE S256)
  |                           302 ---------------------------> /login?mcp_request=<id>
  |                                                 user signs in / signs up (Firebase)
  |                           <--- POST /api/oauth/requests/<id>/decision (Firebase token)
  | <---- browser redirected to the app's redirect_uri?code=...&state=...
  | POST /token (code + code_verifier) -----> access token (1h) + refresh token (30d)
  | POST /mcp  Authorization: Bearer seat_...  --> tools run as that user
```

Code map:

| Piece | File |
|---|---|
| Provider (all security decisions) | `backend/services/oauth/provider.js` |
| Endpoints + consent API | `backend/services/oauth/setup.js` |
| Mongo storage (TTL indexes) | `backend/models/oauthModels.js`, `backend/services/oauth/mongoStore.js` |
| `/mcp` auth (OAuth + legacy token) | `backend/routes/mcpRoutes.js` |
| Env parsing | `backend/config/oauthConfig.js` |
| Banner + auto-connect (used by `/login` and `/register`) | `frontend/components/McpConnectGate.jsx`, `frontend/lib/mcpConnect.js` |

## Configuration (backend `.env`)

| Variable | Required | Meaning |
|---|---|---|
| `API_PUBLIC_URL` | yes, in production | Public **origin** of the API, e.g. `https://api.splitease.tech` (no path). If missing/invalid in production OAuth is disabled (logged at boot) and the legacy token flow keeps working. |
| `APP_PUBLIC_URL` | no | Website origin. Default: first https entry of `FRONTEND_URL`, else `https://splitease.tech`. |
| `OAUTH_LOGIN_URL` | no | Login page URL the browser is sent to. Default `<APP_PUBLIC_URL>/login`. |
| `TRUST_PROXY` | recommended | Number of proxy hops, so per-IP rate limits work behind a load balancer. |

The OAuth endpoints are served at the **root** of the API host: `/authorize`,
`/token`, `/register`, `/revoke` and `/.well-known/*`. Make sure your reverse
proxy forwards those paths to the API (not only `/api/*` and `/mcp`).

## Security properties

- PKCE S256 is mandatory; `plain` is not offered. Verified server-side and the
  authorization code is **burned on the first attempt**, pass or fail.
- Codes: single-use (atomic), 5 min, bound to client + redirect URI + challenge.
- Tokens: random, stored only as SHA-256 hashes, bound to the `/mcp` resource.
- Refresh tokens rotate; reusing a rotated token (after a 10 s retry grace)
  revokes the whole grant. Deleted accounts lose access immediately.
- The login banner names the app and the host the browser will return to, and
  connecting only happens as a result of the user actively signing in/up on that
  page (or clicking Connect when already signed in). Identity comes only from
  the verified Firebase token, never from request bodies.
- Dynamic registration validates redirect URIs (https, loopback http, or
  app-private schemes; no `javascript:`/`data:`, fragments or credentials),
  sanitises names, and only allows public (`none`) / `client_secret_post` clients.
- Rate limits on every endpoint; all OAuth data auto-expires via TTL indexes.

## Known limits

- `client_secret_basic` client authentication is not supported (SDK limitation);
  public PKCE clients (what Claude and ChatGPT use) are unaffected.
- Dynamic clients are self-described, so the banner on the login page is the
  trust boundary: only sign in on a connect link you started yourself.

## Operations

- Disconnect everything a user granted: `DELETE /api/oauth/connections`
  (signed in). Per-token revocation: `POST /revoke` (RFC 7009).
- Tests: `backend/tests/oauthUnit.test.js`, `oauthFlow.test.js` (drives the real
  MCP SDK client through the whole flow), `frontend/__tests__/McpConnectGate.test.jsx`, `frontend/__tests__/LoginMcpConnect.test.jsx`.
