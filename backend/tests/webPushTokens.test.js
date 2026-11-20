// What happens to browser push tokens after a send.
import { reviewPushResults, describePushReview, MAX_WEB_PUSH_TOKENS } from "../utils/webPushTokens.js";

const ok = { success: true };
const gone = { success: false, error: { code: "messaging/registration-token-not-registered", message: "Device unregistered." } };
const denied = { success: false, error: { code: "messaging/unknown-error", message: 'Permission denied by the third party webpush service. Raw server response: "{"errorCode":"THIRD_PARTY_PERMISSION_DENIED"}"' } };
const quota = { success: false, error: { code: "messaging/message-rate-exceeded", message: "slow down" } };
const tokens = (n) => Array.from({ length: n }, (_, i) => `t${i}`);

test("the reported send: 2 delivered, 6 unregistered, 1 refused by the browser's push service", () => {
  const responses = [ok, gone, gone, ok, gone, gone, gone, gone, denied];
  const review = reviewPushResults(responses, tokens(9));
  expect(review).toMatchObject({ gone: 6, rejected: 1, kept: 0, other: {} });
  // All seven dead tokens go, so the next send is clean.
  expect(review.drop.sort()).toEqual(["t1", "t2", "t4", "t5", "t6", "t7", "t8"]);
  expect(describePushReview(review)).toBe("6 no longer registered (removed), 1 made under another push key (removed; that browser re-registers on its next visit)");
});

test("if nothing got through, a refusal may be our own key: nothing is deleted and it is called out", () => {
  const review = reviewPushResults([denied, denied], tokens(2));
  expect(review.drop).toEqual([]);
  expect(review.kept).toBe(2);
  expect(describePushReview(review)).toMatch(/check the web push \(VAPID\) key/);
});

test("temporary errors never delete a token", () => {
  const review = reviewPushResults([ok, quota, quota], tokens(3));
  expect(review.drop).toEqual([]);
  expect(review.other).toEqual({ "messaging/message-rate-exceeded": 2 });
});

test("a clean send has nothing to report", () => {
  const review = reviewPushResults([ok, ok], tokens(2));
  expect(review.drop).toEqual([]);
  expect(describePushReview(review)).toBe("");
  expect(MAX_WEB_PUSH_TOKENS).toBeGreaterThanOrEqual(5);
});
