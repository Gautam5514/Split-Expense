/**
 * OAuth 2.1 authorization server for the SplitEase remote MCP endpoint.
 *
 * Implements the MCP SDK's OAuthServerProvider so the SDK's battle-tested
 * handlers do the protocol plumbing (discovery documents, dynamic client
 * registration, /authorize + /token parameter validation, revocation, rate
 * limits). This class owns the security-critical decisions:
 *
 *  - Login happens on the normal SplitEase /login page (Firebase). /authorize
 *    only parks the request and redirects the browser to /login?mcp_request=<id>;
 *    a code is minted only once a signed-in user completes that request.
 *  - Authorization codes are single-use (atomic consume), short-lived, bound
 *    to client + redirect_uri + PKCE challenge. PKCE (S256) is verified HERE
 *    and the code is burned on ANY failed attempt, so no verifier guessing.
 *  - Access/refresh tokens are opaque random values stored as SHA-256 hashes,
 *    audience-bound to the MCP resource. Refresh tokens rotate; presenting a
 *    used one again (token theft) revokes the entire family.
 *  - Dynamic client registration is validated and normalised (redirect URI
 *    schemes, sizes, auth methods) before anything is stored.
 */

import crypto from "node:crypto";
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidRequestError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
  AccessDeniedError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";

export const ACCESS_PREFIX = "seat_";
export const REFRESH_PREFIX = "serf_";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
export const DEFAULTS = {
  accessTtlMs: 60 * MINUTE,
  refreshTtlMs: 30 * DAY,
  codeTtlMs: 5 * MINUTE,
  pendingTtlMs: 10 * MINUTE,
  clientTtlMs: 90 * DAY,
  // A just-rotated refresh token re-sent within this window (lost response,
  // client retry) is rejected but does NOT nuke the family.
  refreshReuseGraceMs: 10 * 1000,
};

const MAX_REDIRECT_URIS = 10;
const MAX_URI_LENGTH = 2048;
const MAX_NAME_LENGTH = 100;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const BLOCKED_SCHEMES = new Set(["javascript", "data", "vbscript", "file", "about", "blob", "ftp", "chrome", "view-source"]);
const AUTH_METHODS = new Set(["none", "client_secret_post"]);
const GRANT_TYPES = new Set(["authorization_code", "refresh_token"]);
const VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

const randomToken = (prefix, bytes = 32) => `${prefix}${crypto.randomBytes(bytes).toString("base64url")}`;
export const sha256hex = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

export const isOAuthAccessToken = (t) =>
  typeof t === "string" && t.startsWith(ACCESS_PREFIX) && t.length > ACCESS_PREFIX.length && t.length <= 256;

/** RFC 7636 S256: BASE64URL(SHA256(verifier)) === challenge, constant-time. */
export function pkceMatches(verifier, challenge) {
  if (typeof verifier !== "string" || !VERIFIER_RE.test(verifier)) return false;
  if (typeof challenge !== "string" || !challenge) return false;
  const computed = Buffer.from(crypto.createHash("sha256").update(verifier).digest("base64url"));
  const expected = Buffer.from(challenge);
  return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
}

const comparable = (v) => String(v).split("#")[0].replace(/\/$/, "");
const sameResource = (a, b) => a != null && b != null && comparable(a) === comparable(b);

/** Throws InvalidClientMetadataError unless the redirect URI is safe to register. */
export function assertSafeRedirectUri(uri) {
  if (typeof uri !== "string" || !uri || uri.length > MAX_URI_LENGTH) {
    throw new InvalidClientMetadataError("redirect_uris must be non-empty strings of reasonable length");
  }
  let u;
  try {
    u = new URL(uri);
  } catch {
    throw new InvalidClientMetadataError(`Invalid redirect URI: ${uri.slice(0, 80)}`);
  }
  if (u.hash) throw new InvalidClientMetadataError("redirect_uris must not contain a fragment");
  if (u.username || u.password) throw new InvalidClientMetadataError("redirect_uris must not contain credentials");
  const scheme = u.protocol.slice(0, -1).toLowerCase();
  if (BLOCKED_SCHEMES.has(scheme)) throw new InvalidClientMetadataError(`Redirect URI scheme not allowed: ${scheme}`);
  if (scheme === "http" && !LOOPBACK_HOSTS.has(u.hostname)) {
    throw new InvalidClientMetadataError("http redirect URIs are only allowed for localhost / 127.0.0.1");
  }
  if (scheme !== "http" && scheme !== "https" && !/^[a-z][a-z0-9+.-]*$/.test(scheme)) {
    throw new InvalidClientMetadataError("Invalid redirect URI scheme");
  }
}

const cleanText = (s, max) =>
  String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, max);

/** Validate + normalise a registration request. Returns the record to store. */
export function normalizeClientRegistration(info) {
  const uris = info.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0) {
    throw new InvalidClientMetadataError("redirect_uris is required");
  }
  if (uris.length > MAX_REDIRECT_URIS) {
    throw new InvalidClientMetadataError(`At most ${MAX_REDIRECT_URIS} redirect_uris are allowed`);
  }
  uris.forEach((u) => assertSafeRedirectUri(u.href ?? u));

  const method = info.token_endpoint_auth_method ?? "none";
  if (!AUTH_METHODS.has(method)) {
    throw new InvalidClientMetadataError("token_endpoint_auth_method must be 'none' or 'client_secret_post'");
  }
  const grants = info.grant_types ?? ["authorization_code", "refresh_token"];
  if (!Array.isArray(grants) || grants.some((g) => !GRANT_TYPES.has(g))) {
    throw new InvalidClientMetadataError("grant_types may only contain authorization_code and refresh_token");
  }
  const responses = info.response_types ?? ["code"];
  if (!Array.isArray(responses) || responses.some((r) => r !== "code")) {
    throw new InvalidClientMetadataError("response_types may only contain 'code'");
  }

  const name = info.client_name ? cleanText(info.client_name, MAX_NAME_LENGTH) : "";
  const record = {
    client_id: info.client_id,
    client_id_issued_at: info.client_id_issued_at,
    redirect_uris: uris.map((u) => String(u.href ?? u)),
    token_endpoint_auth_method: method,
    grant_types: grants,
    response_types: responses,
    client_name: name || "Unnamed application",
  };
  if (method !== "none") {
    record.client_secret = info.client_secret;
    record.client_secret_expires_at = info.client_secret_expires_at;
  }
  if (info.scope) record.scope = cleanText(info.scope, 200);
  if (info.client_uri) record.client_uri = String(info.client_uri).slice(0, MAX_URI_LENGTH);
  return record;
}

export class SplitEaseOAuthProvider {
  /**
   * @param {object}   opts
   * @param {object}   opts.store      storage (see mongoStore.js)
   * @param {object}   opts.config     { loginUrl, resourceUrl, scopes }
   * @param {Function} opts.userExists async (userId) => boolean
   * @param {Function} [opts.now]      () => epoch ms (injectable for tests)
   */
  constructor({ store, config, userExists, now = Date.now, ttl = {} }) {
    this.store = store;
    this.config = config;
    this.userExists = userExists;
    this.now = now;
    this.ttl = { ...DEFAULTS, ...ttl };
    // We verify PKCE ourselves inside exchangeAuthorizationCode so that the
    // code is consumed on the first attempt, pass or fail.
    this.skipLocalPkceValidation = true;

    this._clientsStore = {
      getClient: async (clientId) => {
        if (typeof clientId !== "string" || !clientId || clientId.length > 200) return undefined;
        return (await this.store.getClient(clientId)) || undefined;
      },
      registerClient: async (info) => {
        const record = normalizeClientRegistration(info);
        await this.store.createClient(record.client_id, record, new Date(this.now() + this.ttl.clientTtlMs));
        return record;
      },
    };
  }

  get clientsStore() {
    return this._clientsStore;
  }

  // ── step 1: /authorize → park the request, send the browser to the website ──
  async authorize(client, params, res) {
    const allowed = this.config.scopes;
    const scopes = params.scopes?.length ? [...new Set(params.scopes)] : [...allowed];
    if (scopes.some((s) => !allowed.includes(s))) {
      throw new InvalidScopeError(`Unsupported scope. Supported: ${allowed.join(" ")}`);
    }
    if (params.resource && !sameResource(params.resource.href, this.config.resourceUrl.href)) {
      throw new InvalidTargetError("Unknown resource. This server only issues tokens for its own MCP endpoint.");
    }

    const requestId = crypto.randomBytes(24).toString("base64url");
    await this.store.createPending({
      requestId,
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      state: params.state ?? null,
      scopes,
      resource: this.config.resourceUrl.href,
      expiresAt: new Date(this.now() + this.ttl.pendingTtlMs),
    });

    const target = new URL(this.config.loginUrl);
    target.searchParams.set("mcp_request", requestId);
    res.redirect(302, target.href);
  }

  // ── step 2 (website calls these): show what is being approved ─────────────
  /** Non-secret details for the consent screen, or null if unknown/expired. */
  async getPendingRequest(requestId) {
    if (typeof requestId !== "string" || requestId.length > 100) return null;
    const pending = await this.store.peekPending(requestId, new Date(this.now()));
    if (!pending) return null;
    const client = await this.store.getClient(pending.clientId);
    if (!client) return null;
    let redirectHost = "";
    try {
      const u = new URL(pending.redirectUri);
      redirectHost = u.host || `${u.protocol}//`;
    } catch {
      /* leave blank */
    }
    return {
      clientName: client.client_name || "Unnamed application",
      redirectHost,
      redirectScheme: new URL(pending.redirectUri).protocol.replace(":", ""),
      scopes: pending.scopes,
    };
  }

  /**
   * The signed-in user approved or denied. Consumes the pending request
   * (once only) and returns the URL to send the browser back to the client.
   */
  async completeAuthorization({ requestId, userId, approve }) {
    if (typeof requestId !== "string" || requestId.length > 100) {
      throw new InvalidRequestError("Unknown or expired authorization request.");
    }
    const pending = await this.store.takePending(requestId, new Date(this.now()));
    if (!pending) throw new InvalidRequestError("This authorization request has expired. Please start the connection again.");

    const back = new URL(pending.redirectUri);
    if (pending.state) back.searchParams.set("state", pending.state);

    if (!approve) {
      const denied = new AccessDeniedError("The user denied the request.");
      back.searchParams.set("error", denied.errorCode);
      back.searchParams.set("error_description", denied.message);
      return { redirectUrl: back.href, approved: false };
    }

    const client = await this.store.getClient(pending.clientId);
    if (!client) throw new InvalidRequestError("The application is no longer registered. Please reconnect.");

    const code = randomToken("sec_");
    await this.store.createCode({
      codeHash: sha256hex(code),
      clientId: pending.clientId,
      userId: String(userId),
      redirectUri: pending.redirectUri,
      codeChallenge: pending.codeChallenge,
      scopes: pending.scopes,
      resource: pending.resource,
      expiresAt: new Date(this.now() + this.ttl.codeTtlMs),
    });
    back.searchParams.set("code", code);
    return { redirectUrl: back.href, approved: true };
  }

  // ── step 3: /token ────────────────────────────────────────────────────────
  async challengeForAuthorizationCode(client, code) {
    const rec = await this.store.peekCode(sha256hex(code));
    if (!rec || rec.clientId !== client.client_id) throw new InvalidGrantError("Invalid or expired authorization code");
    return rec.codeChallenge;
  }

  async exchangeAuthorizationCode(client, code, codeVerifier, redirectUri, resource) {
    // Consume FIRST: whatever happens next, this code can never be tried again.
    const rec = await this.store.takeCode(sha256hex(code));
    const now = this.now();
    if (!rec || new Date(rec.expiresAt).getTime() <= now) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    if (rec.clientId !== client.client_id) throw new InvalidGrantError("Authorization code was issued to a different client");
    if (redirectUri !== undefined && redirectUri !== rec.redirectUri) {
      throw new InvalidGrantError("redirect_uri does not match the authorization request");
    }
    if (!pkceMatches(codeVerifier, rec.codeChallenge)) {
      throw new InvalidGrantError("code_verifier does not match the code_challenge");
    }
    if (resource && !sameResource(resource.href, rec.resource)) {
      throw new InvalidTargetError("resource does not match the authorization request");
    }
    if (!(await this.userExists(rec.userId))) throw new InvalidGrantError("The account no longer exists");

    await this.store.touchClient(client.client_id, new Date(now + this.ttl.clientTtlMs));
    return this._issue({
      clientId: client.client_id,
      userId: rec.userId,
      scopes: rec.scopes,
      resource: rec.resource,
      familyId: crypto.randomUUID(),
    });
  }

  async exchangeRefreshToken(client, refreshToken, scopes, resource) {
    const hash = sha256hex(refreshToken);
    const existing = typeof refreshToken === "string" && refreshToken.startsWith(REFRESH_PREFIX)
      ? await this.store.findToken(hash)
      : null;
    const now = this.now();
    if (!existing || existing.kind !== "refresh" || existing.clientId !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    if (new Date(existing.expiresAt).getTime() <= now) throw new InvalidGrantError("Refresh token expired");

    if (existing.usedAt) {
      // A rotated token was presented again. Within the grace window treat it
      // as a client retry; later, assume theft and revoke the whole family.
      if (now - new Date(existing.usedAt).getTime() > this.ttl.refreshReuseGraceMs) {
        await this.store.deleteFamily(existing.familyId);
      }
      throw new InvalidGrantError("Refresh token has already been used");
    }

    let granted = existing.scopes;
    if (scopes?.length) {
      if (scopes.some((s) => !existing.scopes.includes(s))) throw new InvalidScopeError("Cannot widen the original scope");
      granted = [...new Set(scopes)];
    }
    if (resource && !sameResource(resource.href, existing.resource)) {
      throw new InvalidTargetError("resource does not match the original grant");
    }
    if (!(await this.userExists(existing.userId))) {
      await this.store.deleteFamily(existing.familyId);
      throw new InvalidGrantError("The account no longer exists");
    }

    // Atomic rotation: exactly one concurrent caller wins.
    const won = await this.store.markRefreshUsed(hash, new Date(now));
    if (!won) throw new InvalidGrantError("Refresh token has already been used");

    await this.store.touchClient(client.client_id, new Date(now + this.ttl.clientTtlMs));
    return this._issue({
      clientId: client.client_id,
      userId: existing.userId,
      scopes: granted,
      resource: existing.resource,
      familyId: existing.familyId,
    });
  }

  async _issue({ clientId, userId, scopes, resource, familyId }) {
    const now = this.now();
    const access = randomToken(ACCESS_PREFIX);
    const refresh = randomToken(REFRESH_PREFIX);
    const base = { familyId, clientId, userId: String(userId), scopes, resource, usedAt: null };
    await this.store.createTokens([
      { ...base, tokenHash: sha256hex(access), kind: "access", expiresAt: new Date(now + this.ttl.accessTtlMs) },
      { ...base, tokenHash: sha256hex(refresh), kind: "refresh", expiresAt: new Date(now + this.ttl.refreshTtlMs) },
    ]);
    return {
      access_token: access,
      token_type: "Bearer",
      expires_in: Math.floor(this.ttl.accessTtlMs / 1000),
      refresh_token: refresh,
      scope: scopes.join(" "),
    };
  }

  // ── using / revoking tokens ───────────────────────────────────────────────
  async verifyAccessToken(token) {
    if (!isOAuthAccessToken(token)) throw new InvalidTokenError("Invalid access token");
    const rec = await this.store.findToken(sha256hex(token));
    if (!rec || rec.kind !== "access") throw new InvalidTokenError("Invalid access token");
    const exp = new Date(rec.expiresAt).getTime();
    if (exp <= this.now()) throw new InvalidTokenError("Token has expired");
    return {
      token,
      clientId: rec.clientId,
      scopes: rec.scopes,
      expiresAt: Math.floor(exp / 1000),
      resource: rec.resource ? new URL(rec.resource) : undefined,
      extra: { userId: rec.userId, familyId: rec.familyId },
    };
  }

  /** RFC 7009: unknown tokens are not an error; other clients' tokens are ignored. */
  async revokeToken(client, { token }) {
    if (typeof token !== "string" || !token || token.length > 256) return;
    const rec = await this.store.findToken(sha256hex(token));
    if (rec && rec.clientId === client.client_id) await this.store.deleteFamily(rec.familyId);
  }

  /** Revoke everything a user has granted (e.g. "disconnect all AI apps"). */
  async revokeAllForUser(userId) {
    await this.store.deleteUserTokens(String(userId));
  }
}
