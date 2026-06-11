"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// Live coin balance for the logged-in user. null while loading / logged out.
export default function useCoins() {
  const { token } = useAuth();
  const [coins, setCoins] = useState(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.get("/referrals/me")
      .then((res) => alive && setCoins(res.data?.coins ?? 0))
      .catch(() => alive && setCoins(0));
    return () => { alive = false; };
  }, [token]);

  return coins;
}
