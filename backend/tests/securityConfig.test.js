import crypto from "crypto";
import fc from "fast-check";
import {
  MIN_HMAC_SECRET_BYTES,
  assertSecurityConfiguration,
  validateJwtSecret,
} from "../utils/securityConfig.js";

describe("security configuration", () => {
  test("rejects missing and short production JWT secrets", () => {
    expect(validateJwtSecret(undefined, { production: true })).toMatch(/required/);
    expect(validateJwtSecret("short", { production: true })).toMatch(/at least 32 bytes/);
    expect(() => assertSecurityConfiguration({ NODE_ENV: "production" })).toThrow();
  });

  test("accepts a cryptographically random 256-bit secret", () => {
    const secret = crypto.randomBytes(MIN_HMAC_SECRET_BYTES).toString("base64url");
    expect(validateJwtSecret(secret, { production: true })).toBeNull();
    expect(() =>
      assertSecurityConfiguration({ NODE_ENV: "production", JWT_SECRET: secret })
    ).not.toThrow();
  });

  test("OTP randomInt range always produces six decimal digits", () => {
    for (let sample = 0; sample < 1000; sample += 1) {
      expect(crypto.randomInt(100000, 1000000).toString()).toMatch(/^\d{6}$/);
    }
  });

  test("property: no UTF-8 secret shorter than 32 bytes is accepted", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 31 }), (secret) => {
        if (Buffer.byteLength(secret, "utf8") < MIN_HMAC_SECRET_BYTES) {
          expect(validateJwtSecret(secret, { production: true })).not.toBeNull();
        }
      }),
      { numRuns: 1000 }
    );
  });

  test("property: every 32-byte random secret is accepted", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 128 }), (bytes) => {
        const secret = Buffer.from(bytes).toString("base64url");
        expect(validateJwtSecret(secret, { production: true })).toBeNull();
      }),
      { numRuns: 1000 }
    );
  });
});
