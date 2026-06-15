"use client";

import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }) {
  const { token } = useAuth();
  const isLoggedIn = !!token;

  return (
    <main className={`min-h-screen ${isLoggedIn ? "pt-[72px] md:pt-[80px]" : ""}`}>
      {children}
    </main>
  );
}
