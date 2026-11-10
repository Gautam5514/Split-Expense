// The public web origin used in anything shared outside the server: invite
// links, QR codes, emails. FRONTEND_URL is a CORS allow-list and its first
// entry is often http://localhost:3000 - a link built from that works on the
// developer's laptop and nowhere else (phones scanning a QR, friends on
// WhatsApp). So: APP_PUBLIC_URL if set, else the first public https origin in
// FRONTEND_URL, else the live site. Same rule as the push-notification assets.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
export const DEFAULT_PUBLIC_WEB_URL = "https://split.elitecrew.online";

export function publicWebUrl(env = process.env) {
  const strip = (s) => String(s || "").trim().replace(/\/+$/, "");
  if (strip(env.APP_PUBLIC_URL)) return strip(env.APP_PUBLIC_URL);
  for (const c of String(env.FRONTEND_URL || "").split(",").map(strip)) {
    try {
      const u = new URL(c);
      if (u.protocol === "https:" && !LOCAL.test(u.hostname)) return `${u.protocol}//${u.host}`;
    } catch { /* skip junk */ }
  }
  return DEFAULT_PUBLIC_WEB_URL;
}

// Every way an invite gets shared. All are plain https links (WhatsApp, SMS
// and email only make https clickable); `via` tells the join page where the
// link came from:
//   app   - shared from the app: open the app on the recipient's phone
//   web   - shared from the website: join right there on the web
//   qr    - scanned with a phone camera: open the app if it's installed
//   email - invite email to someone without an account
export function inviteLinks(code, env = process.env) {
  const base = `${publicWebUrl(env)}/join/${encodeURIComponent(code)}`;
  return {
    url: base,
    app: `${base}?via=app`,
    web: `${base}?via=web`,
    qr: `${base}?via=qr`,
    email: `${base}?via=email`,
    scheme: `splitapp://join/${encodeURIComponent(code)}`,
  };
}
