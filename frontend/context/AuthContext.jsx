"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { setAuthToken } from "@/lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Listen for Firebase login/logout changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken(); // 🔥 Firebase JWT
          localStorage.setItem("token", idToken);
          setAuthToken(idToken);
          setToken(idToken);
        } catch (err) {
          console.error("Error fetching Firebase ID token:", err);
        }
      } else {
        // 🔒 No user logged in
        localStorage.removeItem("token");
        setAuthToken();
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null; // ⏳ Wait until Firebase auth initializes

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
