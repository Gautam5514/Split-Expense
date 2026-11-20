// Deciding what to do with browser push tokens after a send.
//
// A browser token stops working when the user clears site data, revokes the
// permission, or the browser rotates it. Firebase then answers "not
// registered", and the token is removed so we never try it again.
//
// One more case looks like an error on our side but is not: the browser's own
// push service (Apple, Mozilla) answering 403 "permission denied" for a single
// token. That token was created under a different web push key (an old key, or
// another environment such as a local build) and can never be delivered to with
// the current one. It is removed too, but ONLY when another token in the same
// send succeeded: that proves our own credentials are fine. If nothing
// succeeded, the problem may be our configuration, so nothing is deleted.

const GONE = new Set(["messaging/invalid-registration-token", "messaging/registration-token-not-registered"]);
const isRejectedByBrowser = (error) => /THIRD_PARTY_PERMISSION_DENIED|Permission denied by the third party webpush service/i.test(`${error?.message || ""}`);

/** How many tokens one user may hold: enough for their browsers, not an ever-growing list. */
export const MAX_WEB_PUSH_TOKENS = 10;

/**
 * @param {Array<{success:boolean,error?:{code?:string,message?:string}}>} responses  one per token, same order
 * @param {string[]} tokens
 * @returns {{ drop: string[], gone: number, rejected: number, kept: number, other: Record<string, number> }}
 */
export function reviewPushResults(responses = [], tokens = []) {
  const anySuccess = responses.some((r) => r?.success);
  const out = { drop: [], gone: 0, rejected: 0, kept: 0, other: {} };
  responses.forEach((r, i) => {
    if (!r || r.success) return;
    const code = r.error?.code || "unknown";
    if (GONE.has(code)) { out.gone++; out.drop.push(tokens[i]); return; }
    if (isRejectedByBrowser(r.error)) {
      if (anySuccess) { out.rejected++; out.drop.push(tokens[i]); } else out.kept++;
      return;
    }
    out.other[code] = (out.other[code] || 0) + 1;
  });
  out.drop = [...new Set(out.drop.filter(Boolean))];
  return out;
}

/** One readable line about what failed, or "" when nothing did. */
export function describePushReview(review) {
  const parts = [];
  if (review.gone) parts.push(`${review.gone} no longer registered (removed)`);
  if (review.rejected) parts.push(`${review.rejected} made under another push key (removed; that browser re-registers on its next visit)`);
  if (review.kept) parts.push(`${review.kept} refused by the browser push service and nothing else got through: check the web push (VAPID) key`);
  for (const [code, n] of Object.entries(review.other)) parts.push(`${n} × ${code}`);
  return parts.join(", ");
}
