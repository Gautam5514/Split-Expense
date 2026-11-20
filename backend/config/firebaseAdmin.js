// firebase-admin v11+ dropped the old namespaced default export (admin.apps,
// admin.auth(), admin.credential.cert()) in favor of named exports from
// submodules. We still expose an `admin.auth()`-shaped object below so every
// existing call site (admin.auth()...., admin.messaging()....) keeps working unchanged.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import dotenv from "dotenv";

dotenv.config();

if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("FIREBASE_PRIVATE_KEY is not set in environment variables");
  }

  initializeApp({
    credential: cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    }),
  });

  console.log("✅ Firebase Admin SDK initialized successfully");
}

// Every service the app calls must be listed here. Leaving `messaging` out made
// every browser push fail with "admin.messaging is not a function".
const admin = { auth: getAuth, messaging: getMessaging };

export default admin;
