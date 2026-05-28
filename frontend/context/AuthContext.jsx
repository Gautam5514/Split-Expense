"use client";
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { setAuthToken } from "@/lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken);
      setAuthToken(nextToken);
      setToken(nextToken);
    } else {
      localStorage.removeItem("token");
      setAuthToken(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    // Restore the backend JWT immediately on mount so API calls work before
    // onAuthStateChanged fires. This prevents a flash of "unauthenticated"
    // on page refresh.
    const stored = localStorage.getItem("token");
    if (stored) {
      setAuthToken(stored);
      setToken(stored);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Firebase session ended → clear backend JWT too (logout sync).
        updateToken(null);
      }
      // When Firebase reports a logged-in user, do NOT overwrite the token.
      // The backend JWT (set by the login/register page via setToken) is the
      // authoritative token. Overwriting it here with a Firebase ID token
      // causes 401s because admin.auth().verifyIdToken() makes a network call
      // to Google that can fail or be slow.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [updateToken]);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ token, setToken: updateToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
