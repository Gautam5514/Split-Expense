import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, googleLogin, forgotPassword, resetPassword, sendLoginOtp, verifyLoginOtp } from "../controllers/authController.js";

const router = express.Router();

// 20 attempts per 15 min — covers login, register, google sign-in
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

// 5 attempts per 15 min — password reset and OTP must be tighter
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

router.post("/register",         authLimiter,   register);
router.post("/login",            authLimiter,   login);
router.post("/google",           authLimiter,   googleLogin);
router.post("/forgot-password",  strictLimiter, forgotPassword);
router.post("/reset-password",   strictLimiter, resetPassword);
router.post("/send-login-otp",   strictLimiter, sendLoginOtp);
router.post("/verify-login-otp", strictLimiter, verifyLoginOtp);

export default router;
