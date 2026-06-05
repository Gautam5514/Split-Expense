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

// Kept for backward compatibility with components that call setAuthToken().
// The interceptor above is the authoritative auth source.
export const setAuthToken = (token) => {
  if (token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else
    delete api.defaults.headers.common["Authorization"];
};
