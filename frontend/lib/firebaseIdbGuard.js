// Heals the "The requested version (1) is less than the existing version (2)"
// IndexedDB VersionError.
//
// Every Firebase SDK we load - modular v12 on the page, compat 10.14.1 in the
// service worker - opens these databases at the versions below. A database left
// on this origin at a HIGHER version (a stale store from an older build, or from
// another app sharing the localhost origin) can never be opened again: IndexedDB
// refuses to downgrade and throws VersionError instead. Firebase then fails to
// read its installation id / FCM token cache.
//
// All of these stores hold regenerable cache only, so deleting a stale one is
// safe - Firebase recreates it at the version it wants on the next open.

const FIREBASE_DB_VERSIONS = {
  "firebase-heartbeat-database": 1,
  "firebase-installations-database": 1,
  "firebase-messaging-database": 1,
  "firebaseLocalStorageDb": 1,
  "fcm_token_details_db": 5,
};

const getIdb = () =>
  typeof indexedDB !== "undefined" ? indexedDB : undefined;

const deleteDatabase = (name) =>
  new Promise((resolve) => {
    const idb = getIdb();
    if (!idb) {
      resolve(false);
      return;
    }
    const req = idb.deleteDatabase(name);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    // Another tab holds an open connection - it will be closed on reload.
    req.onblocked = () => resolve(false);
  });

let purgePromise = null;

/**
 * Delete every Firebase-owned database whose existing version is ahead of the
 * version our SDKs request. Memoized: only ever runs once per context.
 */
export function purgeStaleFirebaseDatabases() {
  if (purgePromise) return purgePromise;

  purgePromise = (async () => {
    const idb = getIdb();
    // indexedDB.databases() is unavailable in Firefox; there the open() patch
    // below is the only line of defence.
    if (!idb || typeof idb.databases !== "function") return [];

    let existing;
    try {
      existing = await idb.databases();
    } catch {
      return [];
    }

    const stale = existing.filter(
      ({ name, version }) =>
        name in FIREBASE_DB_VERSIONS && version > FIREBASE_DB_VERSIONS[name]
    );

    for (const { name, version } of stale) {
      const deleted = await deleteDatabase(name);
      console.warn(
        deleted
          ? `🧹 Removed stale IndexedDB "${name}" (v${version} > v${FIREBASE_DB_VERSIONS[name]})`
          : `⚠️ Could not remove stale IndexedDB "${name}" - close other tabs and reload`
      );
    }

    return stale.map(({ name }) => name);
  })();

  return purgePromise;
}

let guardInstalled = false;

/**
 * Patch indexedDB.open so a VersionError on a Firebase database deletes that
 * database instead of failing silently forever. The failing attempt still
 * rejects, but the store is gone by the next attempt, so the retry succeeds.
 *
 * Synchronous on purpose: it must be in place before any Firebase code runs.
 */
export function installFirebaseIdbVersionGuard() {
  const idb = getIdb();
  if (!idb || guardInstalled) return;
  guardInstalled = true;

  const originalOpen = idb.open.bind(idb);

  idb.open = function open(name, version) {
    const request =
      version === undefined ? originalOpen(name) : originalOpen(name, version);

    if (name in FIREBASE_DB_VERSIONS) {
      request.addEventListener("error", () => {
        if (request.error?.name !== "VersionError") return;
        console.warn(
          `⚠️ IndexedDB "${name}" exists at a newer version than v${version} - deleting it so Firebase can recreate it.`
        );
        purgePromise = null; // allow a fresh sweep after this heal
        deleteDatabase(name);
      });
    }

    return request;
  };
}
