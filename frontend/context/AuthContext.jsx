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
    // Safety net: if Firebase never fires onIdTokenChanged (bad/missing config,
    // or it can't reach Google's servers to restore a session), `loading` would
    // stay true forever and `if (loading) return null` below would blank the
    // ENTIRE site with only a network error in the console. This guarantees the
    // app renders as logged-out after a few seconds instead of hanging. (A
    // synchronous Firebase-init throw is separately caught by <ErrorBoundary>.)
    const failSafe = setTimeout(() => setLoading(false), 6000);

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
      clearTimeout(failSafe);
      setLoading(false);
    });

    return () => {
      clearTimeout(failSafe);
      unsubscribe();
    };
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
