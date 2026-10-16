/**
 * Persistence for the MCP OAuth authorization server.
 *
 * Every collection carries a TTL index on `expiresAt` so abandoned data
 * (unfinished logins, unused codes, expired tokens, idle clients) is purged by
 * MongoDB itself - no cron needed. Secrets (codes, tokens) are stored ONLY as
 * SHA-256 hashes, so a database leak does not hand out working credentials.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;
const ttl = { type: Date, required: true, index: { expireAfterSeconds: 0 } };

const clientSchema = new Schema(
  {
    clientId: { type: String, required: true, unique: true },
    // Full RFC 7591 client record (redirect_uris, client_name, ...).
    metadata: { type: Schema.Types.Mixed, required: true },
    // Sliding: pushed forward whenever the client is used.
    expiresAt: ttl,
  },
  { timestamps: true },
);

// A login the user has been sent to the website for, not yet approved/denied.
const pendingSchema = new Schema({
  requestId: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  codeChallenge: { type: String, required: true },
  state: { type: String, default: null },
  scopes: [{ type: String }],
  resource: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: ttl,
});

const codeSchema = new Schema({
  codeHash: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  codeChallenge: { type: String, required: true },
  scopes: [{ type: String }],
  resource: { type: String, default: null },
  expiresAt: ttl,
});

const tokenSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  kind: { type: String, enum: ["access", "refresh"], required: true },
  // All tokens descending from one authorization share a family so that
  // revocation / refresh-token reuse can kill the whole chain at once.
  familyId: { type: String, required: true, index: true },
  clientId: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  scopes: [{ type: String }],
  resource: { type: String, default: null },
  usedAt: { type: Date, default: null }, // refresh tokens: set on rotation
  expiresAt: ttl,
});

const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

export const OAuthClient = model("OAuthClient", clientSchema);
export const OAuthPending = model("OAuthPending", pendingSchema);
export const OAuthCode = model("OAuthCode", codeSchema);
export const OAuthToken = model("OAuthToken", tokenSchema);
