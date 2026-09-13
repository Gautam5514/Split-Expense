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
    // stay true forever. This guarantees consumers see a resolved (logged-out)
    // state after a few seconds instead of hanging. (A synchronous
    // Firebase-init throw is separately caught by <ErrorBoundary>.)
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

  // IMPORTANT: never blank `children` while auth restores. Returning null here
  // wipes the server-rendered HTML of EVERY page (blog, landing, login…) —
  // crawlers see an empty <body>, defeating all the SEO work. Pages that need
  // auth read `loading`/`token` and handle the brief unresolved window locally.
  return (
    <AuthContext.Provider value={{ token, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
