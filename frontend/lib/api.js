import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Lazily import auth to avoid a module-initialization cycle and to guarantee
// we always use the same Firebase Auth instance as AuthContext.
let _auth = null;
const getFirebaseAuth = async () => {
  if (!_auth) {
    const { auth } = await import("@/lib/firebaseClient");
    _auth = auth;
  }
  return _auth;
};

// Attach a fresh Firebase ID token to every request.
// getIdToken() returns the cached token when still valid and silently
// refreshes it when it is close to its 1-hour expiry.
api.interceptors.request.use(async (config) => {
  // Skip if the caller already set an Authorization header explicitly.
  if (config.headers.Authorization) return config;

  try {
    const auth = await getFirebaseAuth();
    // On a hard refresh, Firebase restores the session from IndexedDB
    // asynchronously - auth.currentUser is null until that finishes.
    // authStateReady() resolves once the SDK has settled its first real
    // state, so requests fired immediately on page load wait instead of
    // going out unauthenticated and silently 401ing.
    await auth.authStateReady();
    const user = auth.currentUser;
    if (user) {
      const idToken = await user.getIdToken();
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  } catch {
    // Firebase not ready - send request without auth (will 401 if endpoint requires it)
  }

  return config;
});

// If a request still comes back 401 (token expired mid-session, clock skew,
// revoked session, etc.), force one silent token refresh and retry once
// before giving up - avoids surfacing a stale-token failure to the user.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config?._retried) {
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      const auth = await getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) return Promise.reject(error);

      const freshToken = await user.getIdToken(true);
      config.headers.Authorization = `Bearer ${freshToken}`;
      return api(config);
    } catch {
      return Promise.reject(error);
    }
  }
);

// Kept for backward compatibility with components that call setAuthToken().
// The interceptor above is the authoritative auth source.
export const setAuthToken = (token) => {
  if (token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else
    delete api.defaults.headers.common["Authorization"];
};
