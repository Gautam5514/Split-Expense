// In-memory implementation of the OAuth store interface (see
// services/oauth/mongoStore.js). There is no MongoDB in the sandbox, so the
// provider's security logic is exercised against this. Every take*/mark*
// method is synchronous inside, which makes it atomic under JS's single
// thread - same guarantee the Mongo store gets from findOneAndDelete/Update.
export function createMemoryOAuthStore() {
  const clients = new Map();
  const pending = new Map();
  const codes = new Map();
  const tokens = new Map();
  const clone = (v) => (v ? structuredClone(v) : null);
  const live = (rec, now) => rec && new Date(rec.expiresAt).getTime() > new Date(now).getTime();

  return {
    _dump: { clients, pending, codes, tokens },

    async getClient(id) {
      const rec = clients.get(id);
      return rec && live(rec, Date.now()) ? clone(rec.metadata) : null;
    },
    async createClient(id, metadata, expiresAt) {
      clients.set(id, { metadata: clone(metadata), expiresAt });
    },
    async touchClient(id, expiresAt) {
      const rec = clients.get(id);
      if (rec) rec.expiresAt = expiresAt;
    },

    async createPending(doc) {
      pending.set(doc.requestId, clone(doc));
    },
    async peekPending(id, now) {
      const rec = pending.get(id);
      return live(rec, now) ? clone(rec) : null;
    },
    async takePending(id, now) {
      const rec = pending.get(id);
      pending.delete(id);
      return live(rec, now) ? clone(rec) : null;
    },

    async createCode(doc) {
      codes.set(doc.codeHash, clone(doc));
    },
    async peekCode(hash) {
      return clone(codes.get(hash));
    },
    async takeCode(hash) {
      const rec = codes.get(hash);
      codes.delete(hash);
      return clone(rec);
    },

    async createTokens(docs) {
      docs.forEach((d) => tokens.set(d.tokenHash, clone(d)));
    },
    async findToken(hash) {
      return clone(tokens.get(hash));
    },
    async markRefreshUsed(hash, now) {
      const rec = tokens.get(hash);
      if (!rec || rec.kind !== "refresh" || rec.usedAt) return null;
      rec.usedAt = now;
      return clone(rec);
    },
    async deleteFamily(familyId) {
      for (const [k, v] of tokens) if (v.familyId === familyId) tokens.delete(k);
    },
    async deleteUserTokens(userId) {
      for (const [k, v] of tokens) if (v.userId === userId) tokens.delete(k);
    },
  };
}
