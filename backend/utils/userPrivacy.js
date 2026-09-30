// User fields that must never be serialized into an API response:
// credential material, OTP/reset state, and device push tokens.
// Shared by the User schema's toJSON transform and the auth controllers.
export const PRIVATE_USER_FIELDS = [
  "password",
  "resetPasswordToken",
  "resetPasswordExpires",
  "loginOtp",
  "loginOtpExpires",
  "loginOtpAttempts",
  "skipLoginOtp",
  "loginOtpBypassExpires",
  "expoPushTokens",
  "webPushTokens",
  "__v",
];

export const stripPrivateUserFields = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  for (const field of PRIVATE_USER_FIELDS) delete obj[field];
  return obj;
};
