"use client";

import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }) {
  const { token } = useAuth();
  const isLoggedIn = !!token;

  return (
    <main className={`pt-[96px] md:pt-[108px] ${isLoggedIn ? "md:pl-24 lg:pl-72" : ""} min-h-screen transition-all duration-300`}>
      {children}
    </main>
  );
}
