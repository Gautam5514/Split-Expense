import axios from "axios";
import { getAuth } from "firebase/auth";
import { API_BASE_URL } from "@/lib/config";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  // Skip if this request already has an Authorization header.
  if (config.headers.Authorization) return config;

  // Priority 1 — backend JWT stored in localStorage.
  // This is the authoritative token set by the login/register page after the
  // backend exchanges the Firebase ID token for its own signed JWT.
  const stored =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (stored) {
    config.headers.Authorization = `Bearer ${stored}`;
    return config;
  }

  // Priority 2 — Firebase ID token as a last resort (e.g. first load before
  // the backend JWT has been stored, or during Google sign-in flow).
  try {
    const firebaseAuth = getAuth();
    const user = firebaseAuth.currentUser;
    if (user) {
      const idToken = await user.getIdToken();
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  } catch {
    // Firebase not ready — proceed without auth header
  }

  return config;
});

// Add a response interceptor to handle expired JWTs gracefully.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register")
    ) {
      // Backend JWT expired or invalid — clear it so the user gets redirected
      // to login on the next protected route visit.
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else
    delete api.defaults.headers.common["Authorization"];
};
