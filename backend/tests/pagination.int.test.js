// Opt-in pagination for group expenses + group chat, against a REAL MongoDB.
// Default (no ?limit) responses must stay identical to the legacy full-array shape.
// Skipped unless MONGO_TEST_URI is set:
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
jest.unstable_mockModule("../controllers/notificationController.js", () => ({ createNotification: jest.fn(async () => {}), sendPushToUsers: jest.fn(async () => {}) }));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const Expense = (await import("../models/expenseModel.js")).default;
const GroupMessage = (await import("../models/groupMessageModel.js")).default;
const { createGroup } = await import("../controllers/groupController.js");
const { addExpense, getExpenses } = await import("../controllers/expenseController.js");
const { getGroupMessages } = await import("../controllers/groupChatController.js");

const call = async (fn, { user, params = {}, body = {}, query = {} } = {}) => {
  const res = {
    statusCode: 200, body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.body = b; return this; },
    setHeader() {},
  };
  await fn({ user, params, body, query, app: { get: () => null } }, res);
  return res;
};
let n = 0;
const mkUser = async (name) => (await User.create({ name, email: `${name.toLowerCase()}${++n}@test.io`, firebaseUid: `${name}${n}` })).toObject();

d("opt-in pagination (real MongoDB)", () => {
  let me, outsider, group, U;

  beforeAll(async () => { await mongoose.connect(URI); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Group.deleteMany({}), Expense.deleteMany({}), GroupMessage.deleteMany({})]);
    me = await mkUser("Meera");
    outsider = await mkUser("Omar");
    U = { id: String(me._id), name: me.name };
    const created = (await call(createGroup, { user: U, body: { name: "Pagination group" } })).body;
    group = { ...created, _id: String(created._id) };
  });

  const seedExpenses = async (count) => {
    for (let i = 0; i < count; i++) {
      await call(addExpense, { user: U, body: { groupId: group._id, description: `E${i}`, amount: 10 + i } });
    }
    // Force ties on `date` for the first 4 so the _id tiebreaker is exercised.
    const all = await Expense.find({ groupId: group._id }).sort({ _id: 1 });
    const tied = new Date("2026-01-01T00:00:00Z");
    await Expense.updateMany({ _id: { $in: all.slice(0, 4).map((e) => e._id) } }, { date: tied });
  };

  test("expenses: no limit => legacy full array, unchanged", async () => {
    await seedExpenses(7);
    const r = await call(getExpenses, { user: U, params: { groupId: group._id } });
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body).toHaveLength(7);
  });

  test("expenses: paged walk returns every expense exactly once, in legacy order", async () => {
    await seedExpenses(7);
    const full = (await call(getExpenses, { user: U, params: { groupId: group._id } })).body;
    const seen = [];
    let cursor;
    for (let guard = 0; guard < 10; guard++) {
      const r = await call(getExpenses, { user: U, params: { groupId: group._id }, query: { limit: "3", ...(cursor ? { cursor } : {}) } });
      expect(r.statusCode).toBe(200);
      seen.push(...r.body.items.map((e) => String(e._id)));
      cursor = r.body.nextCursor;
      if (!cursor) break;
    }
    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
    // Same set as the unpaged list, and newest-first by date.
    expect([...seen].sort()).toEqual(full.map((e) => String(e._id)).sort());
    const dates = seen.map((id) => new Date(full.find((e) => String(e._id) === id).date).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  test("expenses: bad cursor => 400, non-member => 403", async () => {
    const bad = await call(getExpenses, { user: U, params: { groupId: group._id }, query: { limit: "2", cursor: "nope" } });
    expect(bad.statusCode).toBe(400);
    const out = await call(getExpenses, { user: { id: String(outsider._id) }, params: { groupId: group._id }, query: { limit: "2" } });
    expect(out.statusCode).toBe(403);
  });

  const seedMessages = async (count) => {
    for (let i = 0; i < count; i++) {
      await GroupMessage.create({ groupId: new mongoose.Types.ObjectId(group._id), sender: me._id, text: `m${i}` });
      await new Promise((r) => setTimeout(r, 3));
    }
  };

  test("chat: no limit => legacy full oldest-first array", async () => {
    await seedMessages(5);
    const r = await call(getGroupMessages, { user: U, params: { groupId: group._id } });
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.map((m) => m.text)).toEqual(["m0", "m1", "m2", "m3", "m4"]);
  });

  test("chat: paged returns newest page oldest-first, then older pages via cursor", async () => {
    await seedMessages(5);
    const p1 = await call(getGroupMessages, { user: U, params: { groupId: group._id }, query: { limit: "2" } });
    expect(p1.body.items.map((m) => m.text)).toEqual(["m3", "m4"]);
    expect(p1.body.nextCursor).toBeTruthy();
    const p2 = await call(getGroupMessages, { user: U, params: { groupId: group._id }, query: { limit: "2", before: p1.body.nextCursor } });
    expect(p2.body.items.map((m) => m.text)).toEqual(["m1", "m2"]);
    const p3 = await call(getGroupMessages, { user: U, params: { groupId: group._id }, query: { limit: "2", before: p2.body.nextCursor } });
    expect(p3.body.items.map((m) => m.text)).toEqual(["m0"]);
    expect(p3.body.nextCursor).toBeNull();
  });
});
