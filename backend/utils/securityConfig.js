const MIN_HMAC_SECRET_BYTES = 32;

export const validateJwtSecret = (secret, { production = false } = {}) => {
  if (!secret) return production ? "JWT_SECRET is required in production" : null;

  if (Buffer.byteLength(secret, "utf8") < MIN_HMAC_SECRET_BYTES) {
    return `JWT_SECRET must contain at least ${MIN_HMAC_SECRET_BYTES} bytes`;
  }

  return null;
};

export const assertSecurityConfiguration = (env = process.env) => {
  const error = validateJwtSecret(env.JWT_SECRET, {
    production: env.NODE_ENV === "production",
  });

  if (error && env.NODE_ENV === "production") throw new Error(error);
};

export { MIN_HMAC_SECRET_BYTES };
