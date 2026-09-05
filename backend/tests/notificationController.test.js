// Exercises createNotification()'s full dispatch path end-to-end at the
// function level: DB write, socket emit-if-online, Expo push (rich, app-only
// content from task #10) and FCM push (plain, deliberately untouched).
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeFakeModel } from "./helpers/fakeModel.js";

const fakeNotificationModel = makeFakeModel([]);
const fakeUserModel = makeFakeModel([]);

const fakeIoEmit = jest.fn();
const fakeIoTo = jest.fn(() => ({ emit: fakeIoEmit }));
const onlineUsers = new Map();

const fakeSendEachForMulticast = jest.fn(async () => ({ successCount: 1, failureCount: 0, responses: [{ success: true }] }));

jest.unstable_mockModule("../index.js", () => ({
  io: { to: fakeIoTo },
  onlineUsers,
}));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({
  default: { messaging: () => ({ sendEachForMulticast: fakeSendEachForMulticast }) },
}));
jest.unstable_mockModule("../models/notification.model.js", () => ({ default: fakeNotificationModel }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: fakeUserModel }));

const { createNotification, sendPushToUsers } = await import("../controllers/notificationController.js");

const oid = () => new mongoose.Types.ObjectId();

beforeEach(() => {
  fakeNotificationModel._docs.length = 0;
  fakeUserModel._docs.length = 0;
  onlineUsers.clear();
  fakeIoTo.mockClear();
  fakeIoEmit.mockClear();
  fakeSendEachForMulticast.mockClear();
  fakeNotificationModel.aggregate.mockReset().mockResolvedValue([]);
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
});

describe("createNotification", () => {
  test("stores one Notification document per recipient", async () => {
    const u1 = oid();
    const u2 = oid();
    await createNotification([u1, u2], "hello", "/groups/1", "group", { groupName: "Trip" });

    expect(fakeNotificationModel._docs).toHaveLength(2);
    expect(fakeNotificationModel._docs.map((d) => String(d.userId)).sort()).toEqual(
      [String(u1), String(u2)].sort()
    );
    expect(fakeNotificationModel._docs.every((d) => d.message === "hello")).toBe(true);
  });

  test("emits over the socket only to recipients who are currently online", async () => {
    const online = oid();
    const offline = oid();
    onlineUsers.set(String(online), "socket-abc");

    await createNotification([online, offline], "hi", "/x", "group", {});

    expect(fakeIoTo).toHaveBeenCalledTimes(1);
    expect(fakeIoTo).toHaveBeenCalledWith("socket-abc");
    expect(fakeIoEmit).toHaveBeenCalledWith("notification", expect.objectContaining({ userId: online }));
  });

  test("Expo push (app) uses the rich, context-aware title/subtitle/channel from buildPushContent", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({
      _id: recipient,
      expoPushTokens: [{ token: "ExponentPushToken[abc123]", platform: "android" }],
    });

    await createNotification([recipient], "Someone added an expense", "/groups/9", "expense", {
      groupName: "Goa Trip",
      amount: 500,
      category: "travel",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = global.fetch.mock.calls[0];
    const sentMessages = JSON.parse(options.body);
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toMatchObject({
      to: "ExponentPushToken[abc123]",
      title: "✈️ New expense · Goa Trip",
      subtitle: "₹500",
      body: "Someone added an expense",
      channelId: "expenses", // Android per-type channel from task #10
      priority: "high",
    });
  });

  test("Expo push attaches the recipient's real-time unread badge count", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({
      _id: recipient,
      expoPushTokens: [{ token: "ExponentPushToken[badge1]", platform: "ios" }],
    });
    fakeNotificationModel.aggregate.mockResolvedValue([{ _id: recipient, count: 7 }]);

    await createNotification([recipient], "msg", "/x", "group", {});

    const [, options] = global.fetch.mock.calls[0];
    const [message] = JSON.parse(options.body);
    expect(message.badge).toBe(7);
  });

  test("skips Expo push entirely when no recipient has a registered token", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({ _id: recipient, expoPushTokens: [] });

    await createNotification([recipient], "msg", "/x", "group", {});

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("ignores malformed/invalid Expo tokens instead of sending garbage to the push API", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({
      _id: recipient,
      expoPushTokens: [{ token: "not-a-real-token", platform: "android" }],
    });

    await createNotification([recipient], "msg", "/x", "group", {});

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("FCM (web) push keeps the plain, generic title - untouched by the app-only redesign", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({ _id: recipient, webPushTokens: ["fcm-token-1"] });

    await createNotification([recipient], "Body text", "/groups/2", "settlement", {
      groupName: "Flat 304",
      amount: 200,
      kind: "confirmed",
    });

    expect(fakeSendEachForMulticast).toHaveBeenCalledTimes(1);
    const [message] = fakeSendEachForMulticast.mock.calls[0];
    // Plain "Settlement update" - NOT the rich "✅ Settlement confirmed · Flat 304"
    // that the Expo/app push gets. Web notifications were explicitly out of scope.
    expect(message.data.title).toBe("Settlement update");
    expect(message.tokens).toEqual(["fcm-token-1"]);
  });

  test("a failure in one dispatch path doesn't throw out of createNotification (never breaks the request)", async () => {
    global.fetch = jest.fn(async () => { throw new Error("network down"); });
    const recipient = oid();
    fakeUserModel.__addDoc({
      _id: recipient,
      expoPushTokens: [{ token: "ExponentPushToken[x]", platform: "android" }],
    });

    await expect(
      createNotification([recipient], "msg", "/x", "group", {})
    ).resolves.toBeUndefined();
  });
});

describe("sendPushToUsers (chat pushes - no DB record, no socket emit)", () => {
  test("infers the Android channel from data.type when no explicit channelId is given", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({
      _id: recipient,
      expoPushTokens: [{ token: "ExponentPushToken[chat1]", platform: "android" }],
    });

    await sendPushToUsers([recipient], {
      title: "New message",
      body: "hey!",
      data: { type: "chat", link: "/chat/1" },
    });

    const [, options] = global.fetch.mock.calls[0];
    const [message] = JSON.parse(options.body);
    expect(message.channelId).toBe("chat");
  });

  test("does not touch the Notification collection", async () => {
    const recipient = oid();
    fakeUserModel.__addDoc({ _id: recipient, expoPushTokens: [] });
    await sendPushToUsers([recipient], { title: "t", body: "b", data: {} });
    expect(fakeNotificationModel._docs).toHaveLength(0);
  });
});
