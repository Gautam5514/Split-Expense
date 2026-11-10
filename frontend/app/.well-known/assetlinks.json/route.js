// Android App Links: lets Android open https://<this site>/join/... straight in
// the SplitEase app (no browser hop, no "Open with" chooser) once the app's
// signing certificate is listed here.
//
// Set ANDROID_SHA256_CERT_FINGERPRINTS on the web server to the app's SHA-256
// signing fingerprint(s), comma separated - from `eas credentials` (Android >
// Keystore) and, for Play Store installs, Play Console > App integrity > App
// signing key. Without it the file is valid but empty, and links still work
// through the web page's "Open in app" hand-off.
const PACKAGE = process.env.ANDROID_APP_PACKAGE || "com.kunal.splitapp";

export function GET() {
  const fingerprints = String(process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));

  const body = fingerprints.length
    ? [{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: PACKAGE, sha256_cert_fingerprints: fingerprints },
      }]
    : [];

  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
