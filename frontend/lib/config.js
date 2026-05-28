const rawApiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");

export const API_URL = rawApiUrl.replace(/\/api$/, "");

export const API_BASE_URL = `${API_URL}/api`;
