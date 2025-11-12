import axios from "axios";
import { getAuth } from "firebase/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_URL || "http://localhost:8080/api",
});

api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const firebaseToken = await user.getIdToken();
    config.headers.Authorization = `Bearer ${firebaseToken}`;
  } else {
    const stored = localStorage.getItem("token");
    if (stored) config.headers.Authorization = `Bearer ${stored}`;
  }

  return config;
});

export const setAuthToken = (token) => {
  if (token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else
    delete api.defaults.headers.common["Authorization"];
};
