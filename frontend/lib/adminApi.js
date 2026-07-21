import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

// Separate from lib/api.js on purpose: the admin session is a plain JWT in
// localStorage, not a Firebase user, so it must never go through the
// Firebase-token interceptor on the regular `api` client.
const ADMIN_TOKEN_KEY = "splitease_admin_token";

export const getAdminToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(ADMIN_TOKEN_KEY);

export const setAdminToken = (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token);

export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

export const adminApi = axios.create({ baseURL: API_BASE_URL });

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearAdminToken();
      // Admin signs in through the same /login page as regular users - there
      // is no separate admin login route.
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
