// Integration tests for group membership security, against a REAL MongoDB.
// Skipped unless MONGO_TEST_URI is set (the default `npm test` has no DB):
//   mongod --dbpath /tmp/db --port 27099 &
//   MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_test npm run test:int
import { jest } from "@jest/globals";

const URI = process.env.MONGO_TEST_URI;
const d = URI ? describe : describe.skip;

jest.unstable_mockModule("../index.js", () => ({
  io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() },
  onlineUsers: new Map(),
}));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => ({}), messaging: () => ({}) } }));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr: jest.fn(async () => null) }));
jest.unstable_mockModule("../utils/referralService.js", () => ({ incrementExpenseCount: jest.fn(async () => {}) }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail: jest.fn(async () => {}), sendEmailsSafely: jest.fn(async () => {}) }));
const createNotification = jest.fn(async () => {});
jest.unstable_mockModule("../controllers/notificationController.js", () => ({ createNotification, sendPushToUsers: jest.fn(async () => {}) }));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const Conversation = (await import("../models/conversationModel.js")).default;
const GroupInvite = (await import("../models/groupInviteModel.js")).default;
const { createGroup, addMembersByEmail, listAvailableUsers, joinGroupByInvite, generateInviteLink, resetInviteLink } =
  await import("../controllers/groupController.js");
const { listUsers, getUserById } = await import("../controllers/userController.js");
const { lookupByEmail, getContacts, updatePrivacy, blockUser } = await import("../controllers/peopleController.js");
const { getMyInvites, acceptInvite, declineInvite, getGroupInvites, approveJoinRequest, leaveGroup } =
  await import("../controllers/inviteController.js");
const { addExpense } = await import("../controllers/expenseController.js");
const { updateGroupSettings } = await import("../controllers/groupExtrasController.js");
const { getOrCreateConversation, sendMessage } = await import("../controllers/chatController.js");

const call = async (fn, { user, params = {}, body = {}, query = {} } = {}) => {
  const res = {
    statusCode: 200, body: undefined, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
  await fn({ user, params, body, query }, res);
  return res;
};
const U = (u) => ({ id: String(u._id), name: u.name });

let n = 0;
const mkUser = async (name, extra = {}) =>
  (await User.create({ name, email: `${name.toLowerCase()}${++n}@test.io`, firebaseUid: `${name}${n}`, ...extra })).toObject();
const mkGroup = async (owner, body = {}) => {
  const r = await call(createGroup, { user: U(owner), body: { name: `G${++n}`, ...body } });
  return r.body;
};

d("group membership security (real MongoDB)", () => {
  beforeAll(async () => { await mongoose.connect(URI); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Group.deleteMany({}), Conversation.deleteMany({}), GroupInvite.deleteMany({})]);
    createNotification.mockClear();
  });

  test("name search only finds known contacts - strangers never show up", async () => {
    const me = await mkUser("Meera");
    const friend = await mkUser("Alok");
    const stranger = await mkUser("Alia");
    await Group.create({ name: "old", createdBy: me._id, members: [me._id, friend._id] });
    const g = await mkGroup(me);

    const r = await call(listAvailableUsers, { user: U(me), params: { groupId: g._id }, query: { q: "al" } });
    expect(r.body.map((u) => u.name)).toEqual(["Alok"]);
    expect(JSON.stringify(r.body)).not.toContain(stranger.email);

    const r2 = await call(listUsers, { user: U(me), query: { q: "al" } });
    expect(r2.body.items.map((u) => u.name)).toEqual(["Alok"]);

    const r3 = await call(getContacts, { user: U(me), query: { q: "" } });
    expect(r3.body.map((u) => u.name)).toEqual(["Alok"]);
  });

  test("a direct chat also makes someone a contact", async () => {
    const me = await mkUser("Meera");
    const chat = await mkUser("Chirag");
    await Conversation.create({ members: [me._id, chat._id] });
    const r = await call(getContacts, { user: U(me), query: { q: "chi" } });
    expect(r.body.map((u) => u.name)).toEqual(["Chirag"]);
  });

  test("exact email finds a stranger with a masked email; partial email finds nothing", async () => {
    const me = await mkUser("Meera");
    const stranger = await mkUser("Rahul");
    const r = await call(lookupByEmail, { user: U(me), query: { email: stranger.email.toUpperCase() } });
    expect(r.body.found).toBe(true);
    expect(r.body.user.email).not.toBe(stranger.email);
    expect(r.body.user.email).toMatch(/^ra\*\*\*\*@test\.io$/);
    expect(r.body.user.isContact).toBe(false);

    const partial = await call(lookupByEmail, { user: U(me), query: { email: "rahul@test" } });
    expect(partial.statusCode).toBe(400);
    const g = await mkGroup(me);
    const partial2 = await call(listAvailableUsers, { user: U(me), params: { groupId: g._id }, query: { q: stranger.email.slice(0, 6) } });
    expect(partial2.body).toEqual([]);
  });

  test("discoverableByEmail=false and blocks hide a person from lookup (same answer as not found)", async () => {
    const me = await mkUser("Meera");
    const hidden = await mkUser("Hidden", { privacy: { discoverableByEmail: false } });
    const blocker = await mkUser("Blocker");
    await call(blockUser, { user: U(blocker), params: { id: String(me._id) } });

    for (const u of [hidden, blocker]) {
      const r = await call(lookupByEmail, { user: U(me), query: { email: u.email } });
      expect(r.body).toEqual({ found: false });
    }
    const none = await call(lookupByEmail, { user: U(me), query: { email: "nobody@test.io" } });
    expect(none.body).toEqual({ found: false });
  });

  test("getUserById masks email for non-contacts only", async () => {
    const me = await mkUser("Meera");
    const friend = await mkUser("Farah");
    const stranger = await mkUser("Sid");
    await Group.create({ name: "old", createdBy: me._id, members: [me._id, friend._id] });
    expect((await call(getUserById, { user: U(me), params: { id: String(friend._id) } })).body.email).toBe(friend.email);
    expect((await call(getUserById, { user: U(me), params: { id: String(stranger._id) } })).body.email).not.toBe(stranger.email);
  });

  test("contacts are added directly; strangers get an invite and are NOT members until they accept", async () => {
    const me = await mkUser("Meera");
    const friend = await mkUser("Farah");
    const stranger = await mkUser("Sid");
    await Group.create({ name: "old", createdBy: me._id, members: [me._id, friend._id] });
    const g = await mkGroup(me, { groupType: "trip" });

    const r = await call(addMembersByEmail, {
      user: U(me), params: { groupId: g._id },
      body: { emails: [friend.email, "new.person@test.io"], userIds: [String(stranger._id)] },
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toMatchObject({ added: 1, pending: 1, invited: 1 });
    let group = await Group.findById(g._id).lean();
    expect(group.members.map(String)).toEqual(expect.arrayContaining([String(me._id), String(friend._id)]));
    expect(group.members.map(String)).not.toContain(String(stranger._id));

    const mine = await call(getMyInvites, { user: U(stranger) });
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].group.name).toBe(g.name);

    const forCreator = await call(getGroupInvites, { user: U(me), params: { groupId: g._id } });
    expect(forCreator.body.invites).toHaveLength(1);

    const acc = await call(acceptInvite, { user: U(stranger), params: { inviteId: String(mine.body[0]._id) } });
    expect(acc.statusCode).toBe(200);
    group = await Group.findById(g._id).lean();
    expect(group.members.map(String)).toContain(String(stranger._id));

    // Double accept is rejected
    const again = await call(acceptInvite, { user: U(stranger), params: { inviteId: String(mine.body[0]._id) } });
    expect(again.statusCode).toBe(404);
  });

  test("someone else can't accept my invite", async () => {
    const me = await mkUser("Meera");
    const stranger = await mkUser("Sid");
    const thief = await mkUser("Thief");
    const g = await mkGroup(me);
    await call(addMembersByEmail, { user: U(me), params: { groupId: g._id }, body: { userIds: [String(stranger._id)] } });
    const inv = await GroupInvite.findOne({ userId: stranger._id }).lean();
    const r = await call(acceptInvite, { user: U(thief), params: { inviteId: String(inv._id) } });
    expect(r.statusCode).toBe(404);
    expect((await Group.findById(g._id).lean()).members.map(String)).not.toContain(String(thief._id));
  });

  test("addPolicy=invite forces an invite even for contacts", async () => {
    const me = await mkUser("Meera");
    const friend = await mkUser("Farah");
    await Group.create({ name: "old", createdBy: me._id, members: [me._id, friend._id] });
    await call(updatePrivacy, { user: U(friend), body: { addPolicy: "invite" } });
    const g = await mkGroup(me);
    const r = await call(addMembersByEmail, { user: U(me), params: { groupId: g._id }, body: { emails: [friend.email] } });
    expect(r.body).toMatchObject({ added: 0, pending: 1 });
  });

  test("decline + block stops future invites from that person", async () => {
    const spammer = await mkUser("Spammer");
    const victim = await mkUser("Victim");
    const g1 = await mkGroup(spammer);
    await call(addMembersByEmail, { user: U(spammer), params: { groupId: g1._id }, body: { emails: [victim.email] } });
    const inv = await GroupInvite.findOne({ userId: victim._id }).lean();
    await call(declineInvite, { user: U(victim), params: { inviteId: String(inv._id) }, body: { block: true } });

    const g2 = await mkGroup(spammer);
    const r = await call(addMembersByEmail, { user: U(spammer), params: { groupId: g2._id }, body: { emails: [victim.email] } });
    // Looks like an invite went out, but nothing was created.
    expect(r.body.pending).toBe(1);
    expect(await GroupInvite.countDocuments({ groupId: g2._id })).toBe(0);
    expect((await call(getMyInvites, { user: U(victim) })).body).toHaveLength(0);
  });

  test("non-creator can't add members", async () => {
    const me = await mkUser("Meera");
    const other = await mkUser("Other");
    const g = await mkGroup(me);
    await Group.updateOne({ _id: g._id }, { $push: { members: other._id } });
    const r = await call(addMembersByEmail, { user: U(other), params: { groupId: g._id }, body: { emails: ["x@test.io"] } });
    expect(r.statusCode).toBe(403);
  });

  test("invite link expires, can be reset (old code dies), and join approval queues a request", async () => {
    const me = await mkUser("Meera");
    const joiner = await mkUser("Joiner");
    const g = await mkGroup(me, { groupType: "business" });

    const link = await call(generateInviteLink, { user: U(me), params: { groupId: g._id } });
    expect(new Date(link.body.expiresAt) > new Date()).toBe(true);
    const oldCode = link.body.inviteCode;

    const reset = await call(resetInviteLink, { user: U(me), params: { groupId: g._id } });
    expect(reset.body.inviteCode).not.toBe(oldCode);
    const dead = await call(joinGroupByInvite, { user: U(joiner), params: { inviteCode: oldCode } });
    expect(dead.statusCode).toBe(404);

    await Group.updateOne({ _id: g._id }, { $set: { inviteExpiresAt: new Date(Date.now() - 1000) } });
    const expired = await call(joinGroupByInvite, { user: U(joiner), params: { inviteCode: reset.body.inviteCode } });
    expect(expired.statusCode).toBe(410);

    await call(updateGroupSettings, { user: U(me), params: { groupId: g._id }, body: { settings: { joinApproval: true } } });
    const fresh = await call(generateInviteLink, { user: U(me), params: { groupId: g._id } });
    const req = await call(joinGroupByInvite, { user: U(joiner), params: { inviteCode: fresh.body.inviteCode } });
    expect(req.statusCode).toBe(202);
    expect((await Group.findById(g._id).lean()).members.map(String)).not.toContain(String(joiner._id));

    const list = await call(getGroupInvites, { user: U(me), params: { groupId: g._id } });
    expect(list.body.requests).toHaveLength(1);
    const ok = await call(approveJoinRequest, { user: U(me), params: { groupId: g._id, inviteId: String(list.body.requests[0]._id) } });
    expect(ok.statusCode).toBe(200);
    expect((await Group.findById(g._id).lean()).members.map(String)).toContain(String(joiner._id));
  });

  test("leaving: blocked while you owe, allowed once settled, creator can't leave", async () => {
    const me = await mkUser("Meera");
    const friend = await mkUser("Farah");
    const g = await mkGroup(me);
    await Group.updateOne({ _id: g._id }, { $push: { members: friend._id } });
    await call(addExpense, { user: U(me), body: { groupId: g._id, description: "Cab", amount: 200 } });

    const owes = await call(leaveGroup, { user: U(friend), params: { groupId: g._id } });
    expect(owes.statusCode).toBe(400);
    const creator = await call(leaveGroup, { user: U(me), params: { groupId: g._id } });
    expect(creator.statusCode).toBe(400);

    await call(addExpense, { user: U(friend), body: { groupId: g._id, description: "Settlement back", amount: 100, paidBy: String(friend._id), participants: [String(me._id)] } });
    const ok = await call(leaveGroup, { user: U(friend), params: { groupId: g._id } });
    expect(ok.statusCode).toBe(200);
    expect((await Group.findById(g._id).lean()).members.map(String)).not.toContain(String(friend._id));
  });

  test("invite codes are 6 characters, typeable in any case, and old long codes get upgraded", async () => {
    const me = await mkUser("Meera");
    const joiner = await mkUser("Joiner");
    const g = await mkGroup(me);
    await Group.updateOne({ _id: g._id }, { $set: { inviteCode: "7f39dc25c3109b3bc1446ae89ba181e1", inviteExpiresAt: null } });

    const link = await call(generateInviteLink, { user: U(me), params: { groupId: g._id } });
    expect(link.body.inviteCode).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
    expect(link.body.joinLink.endsWith(`/join/${link.body.inviteCode}`)).toBe(true);
    expect(link.body.groupName).toBe(g.name);

    const typed = `${link.body.inviteCode.slice(0, 3).toLowerCase()} ${link.body.inviteCode.slice(3).toLowerCase()}`;
    const r = await call(joinGroupByInvite, { user: U(joiner), params: { inviteCode: typed } });
    expect(r.statusCode).toBe(200);
    expect((await Group.findById(g._id).lean()).members.map(String)).toContain(String(joiner._id));

    const old = await call(joinGroupByInvite, { user: U(joiner), params: { inviteCode: "7f39dc25c3109b3bc1446ae89ba181e1" } });
    expect(old.statusCode).toBe(404);
  });

  test("expenses: only your own, split the group's way", async () => {
    const me = await mkUser("Meera");
    const friend = await mkUser("Farah");
    const g = await mkGroup(me, { settings: { defaultSplit: { type: "shares", weights: [] } } });
    await Group.updateOne({ _id: g._id }, { $push: { members: friend._id }, $set: { "settings.defaultSplit": { type: "shares", weights: [{ userId: me._id, value: 3 }] } } });

    const other = await call(addExpense, { user: U(me), body: { groupId: g._id, description: "Cab", amount: 100, paidBy: String(friend._id) } });
    expect(other.statusCode).toBe(403);
    const multi = await call(addExpense, { user: U(me), body: { groupId: g._id, description: "Cab", amount: 100, payers: [{ userId: String(me._id), amount: 100 }] } });
    expect(multi.statusCode).toBe(400);

    const ok = await call(addExpense, { user: U(me), body: { groupId: g._id, description: "Rent", amount: 400 } });
    expect(ok.statusCode).toBe(201);
    expect(String(ok.body.paidBy._id)).toBe(String(me._id));
    expect(ok.body.splitType).toBe("shares");
    const share = (id) => ok.body.splits.find((s) => String(s.userId._id || s.userId) === String(id)).share;
    expect(share(me._id)).toBe(300);
    expect(share(friend._id)).toBe(100);
  });

  test("chat: start by id; a block stops new chats and messages", async () => {
    const me = await mkUser("Meera");
    const other = await mkUser("Omar");
    const r = await call(getOrCreateConversation, { user: U(me), body: { otherUserId: String(other._id) } });
    expect(r.body._id).toBeDefined();

    await call(blockUser, { user: U(other), params: { id: String(me._id) } });
    const blocked = await call(getOrCreateConversation, { user: U(me), body: { otherUserId: String(other._id) } });
    expect(blocked.statusCode).toBe(404);
    const msg = await call(sendMessage, { user: U(me), body: { conversationId: String(r.body._id), text: "hi" } });
    expect(msg.statusCode).toBe(403);
  });
});
