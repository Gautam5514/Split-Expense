/**
 * NoSQL Injection Protection Middleware
 * Recursively cleans request body, query, and params to strip or sanitize
 * object keys that start with '$' or contain '.' which are used in MongoDB operator injection attacks.
 */

const clean = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => clean(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Drop keys starting with '$' or containing '.'
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    sanitized[key] = clean(value);
  }
  return sanitized;
};

export const mongoSanitize = (req, res, next) => {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = clean(req.body);
    }
    if (req.query && typeof req.query === "object") {
      req.query = clean(req.query);
    }
    if (req.params && typeof req.params === "object") {
      req.params = clean(req.params);
    }
  } catch (err) {
    console.error("Sanitize middleware error:", err.message);
  }
  next();
};

export default mongoSanitize;
