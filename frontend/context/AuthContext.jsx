"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../lib/firebaseClient";
import { onIdTokenChanged } from "firebase/auth";
import { setAuthToken } from "@/lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // token = current Firebase ID token (truthy ↔ logged in).
  // onIdTokenChanged fires on login, logout, AND every automatic hourly refresh,
  // so this value is always fresh and the interceptor in api.js can rely on it.
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setAuthToken(idToken);
          setToken(idToken);
        } catch {
          setAuthToken(null);
          setToken(null);
        }
      } else {
        setAuthToken(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
