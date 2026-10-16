/**
 * Production singleton: config from env, Mongo storage, Firebase-backed auth.
 * `oauth.enabled === false` means OAuth is switched off (misconfigured env) and
 * only the legacy token-paste flow works - the rest of the API is unaffected.
 */
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { loadOAuthConfig } from "../../config/oauthConfig.js";
import { createOAuthStack } from "./setup.js";
import { createMongoOAuthStore } from "./mongoStore.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import User from "../../models/userModel.js";

// index.js calls dotenv.config() only AFTER its imports are evaluated, so load
// the env here too or API_PUBLIC_URL would always look unset at build time.
dotenv.config();

function build() {
  const config = loadOAuthConfig();
  if (!config.enabled) {
    console.warn(`⚠️  MCP OAuth is DISABLED: ${config.reason}. Set API_PUBLIC_URL (e.g. https://api.splitease.tech).`);
    return { enabled: false, reason: config.reason, authRouter: express.Router(), apiRouter: express.Router() };
  }
  try {
    const stack = createOAuthStack({
      config,
      store: createMongoOAuthStore(),
      userExists: async (id) => mongoose.isValidObjectId(id) && !!(await User.exists({ _id: id })),
      authMiddleware,
    });
    console.log(`🔐 MCP OAuth enabled. Issuer: ${config.issuerUrl.origin}  Login page: ${config.loginUrl}`);
    return stack;
  } catch (err) {
    console.error("⚠️  MCP OAuth failed to initialise and is DISABLED:", err?.message || err);
    return { enabled: false, reason: "init failed", authRouter: express.Router(), apiRouter: express.Router() };
  }
}

export const oauth = build();
