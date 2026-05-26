"use client";

import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }) {
  const { token } = useAuth();
  const isLoggedIn = !!token;

  return (
    <main className="pt-[96px] md:pt-[108px] min-h-screen">
      {children}
    </main>
  );
}
