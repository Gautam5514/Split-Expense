// Shared validation helpers used across controllers

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

// Returns an error string or null if valid
export const validatePassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter (A-Z).";
  if (!/[0-9]/.test(password))
    return "Password must include at least one number (0-9).";
  return null;
};

export const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

// Escapes special regex characters in user search inputs to prevent ReDoS and regex crashes
export const escapeRegExp = (string) =>
  String(string || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
