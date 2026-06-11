"use client";

// Client-side helpers for capturing & retrieving a referral code before login.
// localStorage is the primary store; a cookie is kept as a fallback in case
// localStorage is cleared/blocked across the OAuth redirect.

const STORAGE_KEY = "se_referral_code";
const COOKIE_KEY = "se_ref";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days - "last click wins" attribution window

const CODE_REGEX = /^[A-Za-z0-9]{4,12}$/;

/**
 * Validates and persists a referral code (last-click wins: overwrites any
 * previously stored code). No-ops on malformed input.
 */
export const captureReferralCode = (rawCode) => {
  if (typeof window === "undefined") return;
  if (!rawCode || typeof rawCode !== "string") return;

  const code = rawCode.trim().toUpperCase();
  if (!CODE_REGEX.test(code)) return;

  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // localStorage unavailable - cookie fallback below still applies.
  }

  document.cookie = `${COOKIE_KEY}=${code};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
};

export const getStoredReferralCode = () => {
  if (typeof window === "undefined") return null;

  try {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const clearStoredReferralCode = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${COOKIE_KEY}=;path=/;max-age=0`;
};

/**
 * Reads `?ref=CODE` from the current URL (if present) and stores it.
 * Call this on any page that might be a referral landing page
 * (home, /register, /login, /invite/[code]).
 */
export const captureReferralFromLocation = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) captureReferralCode(ref);
};
