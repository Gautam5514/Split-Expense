import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeReq, makeRes } from "./helpers/httpMocks.js";

const q = (v) => { const c = { select: () => c, lean: () => c, sort: () => c, limit: () => c, populate: () => c, then: (r, j) => Promise.resolve(v).then(r, j) }; return c; };
const Conversation = { findById: jest.fn() };
const Message = { countDocuments: jest.fn(), find: jest.fn() };
const Group = { find: jest.fn() };

jest.unstable_mockModule("../models/conversationModel.js", () => ({ default: Conversation }));
jest.unstable_mockModule("../models/messageModel.js", () => ({ default: Message }));
jest.unstable_mockModule("../models/groupModel.js", () => ({ default: Group }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../models/userProfileModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../config/cloudinary.js", () => ({ default: { uploader: {} } }));
jest.unstable_mockModule("../index.js", () => ({ onlineUsers: new Map() }));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({ sendPushToUsers: jest.fn() }));

const { getConversationSummary } = await import("../controllers/chatController.js");
const oid = () => String(new mongoose.Types.ObjectId());

describe("GET /api/chat/conversation/:id/summary", () => {
  const me = oid(), friend = oid(), convoId = oid();
  beforeEach(() => jest.clearAllMocks());

  test("non-participant gets 403 and no data is read", async () => {
    Conversation.findById.mockReturnValue(q({ members: [friend, oid()] }));
    const res = makeRes();
    await getConversationSummary(makeReq({ user: { id: me }, params: { id: convoId } }), res);
    expect(res.statusCode).toBe(403);
    expect(Message.find).not.toHaveBeenCalled();
    expect(Group.find).not.toHaveBeenCalled();
  });

  test("invalid id → 400", async () => {
    const res = makeRes();
    await getConversationSummary(makeReq({ user: { id: me }, params: { id: "nope" } }), res);
    expect(res.statusCode).toBe(400);
  });

  test("participant gets counts, shared media (no voice notes) and groups in common", async () => {
    Conversation.findById.mockReturnValue(q({ members: [me, friend] }));
    Message.countDocuments.mockImplementation(async (f) => (f.mediaUrl ? 3 : 120));
    Message.find.mockReturnValue(q([{ _id: "m1", mediaUrl: "https://res.cloudinary.com/x/a.jpg", mediaType: "image", sender: friend, createdAt: new Date() }]));
    Group.find.mockReturnValue(q([{ _id: "g1", name: "Goa", members: [me, friend, oid()], photo: { url: "https://p" } }]));
    const res = makeRes();
    await getConversationSummary(makeReq({ user: { id: me }, params: { id: convoId } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ messageCount: 120, mediaCount: 3 });
    expect(res.body.media[0]).toMatchObject({ url: "https://res.cloudinary.com/x/a.jpg", type: "image" });
    expect(res.body.commonGroups[0]).toMatchObject({ name: "Goa", memberCount: 3, photoUrl: "https://p" });
    // media query excludes voice notes and is scoped to this conversation
    expect(Message.find.mock.calls[0][0]).toMatchObject({ conversationId: convoId, text: { $ne: "[Voice Message]" } });
    // groups in common need BOTH members
    expect(Group.find.mock.calls[0][0]).toEqual({ members: { $all: [me, friend] } });
  });
});
