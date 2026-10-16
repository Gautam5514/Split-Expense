/**
 * MongoDB-backed storage for the OAuth provider.
 *
 * The provider only talks to this small interface (see memoryStore in the
 * tests for a second implementation), so the security-critical logic is
 * identical under test and in production. Anything that must happen exactly
 * once (consuming a code / pending request, rotating a refresh token) is a
 * single atomic findOneAndDelete / findOneAndUpdate - never read-then-write.
 */
import { OAuthClient, OAuthPending, OAuthCode, OAuthToken } from "../../models/oauthModels.js";

const plain = (doc) => (doc ? (typeof doc.toObject === "function" ? doc.toObject() : doc) : null);

export function createMongoOAuthStore() {
  return {
    // ── clients ─────────────────────────────────────────────────────────
    async getClient(clientId) {
      const doc = await OAuthClient.findOne({ clientId, expiresAt: { $gt: new Date() } }).lean();
      return doc ? doc.metadata : null;
    },
    async createClient(clientId, metadata, expiresAt) {
      await OAuthClient.create({ clientId, metadata, expiresAt });
    },
    async touchClient(clientId, expiresAt) {
      await OAuthClient.updateOne({ clientId }, { $set: { expiresAt } });
    },

    // ── pending authorization requests ──────────────────────────────────
    async createPending(doc) {
      await OAuthPending.create(doc);
    },
    async peekPending(requestId, now) {
      return plain(await OAuthPending.findOne({ requestId, expiresAt: { $gt: now } }).lean());
    },
    /** Atomically fetch + delete, so a request can be completed only once. */
    async takePending(requestId, now) {
      return plain(await OAuthPending.findOneAndDelete({ requestId, expiresAt: { $gt: now } }).lean());
    },

    // ── authorization codes ─────────────────────────────────────────────
    async createCode(doc) {
      await OAuthCode.create(doc);
    },
    async peekCode(codeHash) {
      return plain(await OAuthCode.findOne({ codeHash }).lean());
    },
    /** Atomically fetch + delete: a code is single-use even under a race. */
    async takeCode(codeHash) {
      return plain(await OAuthCode.findOneAndDelete({ codeHash }).lean());
    },

    // ── tokens ──────────────────────────────────────────────────────────
    async createTokens(docs) {
      await OAuthToken.insertMany(docs);
    },
    async findToken(tokenHash) {
      return plain(await OAuthToken.findOne({ tokenHash }).lean());
    },
    /** Marks a refresh token used. Returns the doc only for the FIRST caller. */
    async markRefreshUsed(tokenHash, now) {
      return plain(
        await OAuthToken.findOneAndUpdate(
          { tokenHash, kind: "refresh", usedAt: null },
          { $set: { usedAt: now } },
          { new: true },
        ).lean(),
      );
    },
    async deleteFamily(familyId) {
      await OAuthToken.deleteMany({ familyId });
    },
    async deleteUserTokens(userId) {
      await OAuthToken.deleteMany({ userId });
    },
  };
}
