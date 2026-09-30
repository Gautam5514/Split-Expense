// token -> { user, expiresAt }. Every request used to run an upsert (a DB
// write) plus referral bookkeeping just to resolve the caller; a page load
// fires 5-15 requests, so that cost was paid 5-15 times. A verified token maps
// to the same user until it expires, so remember it briefly. The Map keeps
// insertion order, which gives O(1) LRU eviction (delete + re-set on hit).
export const AUTH_CACHE_TTL_MS = 60_000;
export const AUTH_CACHE_MAX = 5_000;
export const authCache = new Map();

// Call when something on req.user changes (name edit) or the user is gone.
export const invalidateAuthCache = (userId) => {
  const id = String(userId);
  for (const [token, entry] of authCache) {
    if (entry.user.id === id) authCache.delete(token);
  }
};
