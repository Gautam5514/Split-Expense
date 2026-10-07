// Group settings lock after the first expense, against a REAL MongoDB.
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
const { createGroup, getGroupById } = await import("../controllers/groupController.js");
const { addExpense } = await import("../controllers/expenseController.js");
const { updateGroupSettings } = await import("../controllers/groupExtrasController.js");

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
const mkUser = async (name) => (await User.create({ name, email: `${name.toLowerCase()}${++n}@test.io`, firebaseUid: `${name}${n}` })).toObject();

d("settings lock after first expense (real MongoDB)", () => {
  let me, friend, outsider;
  const patch = (user, g, body) => call(updateGroupSettings, { user: U(user), params: { groupId: g._id }, body });
  const stored = (g) => Group.findById(g._id).lean();
  const newGroup = async (body = {}) => {
    const r = await call(createGroup, { user: U(me), body: { name: `G${++n}`, ...body } });
    await Group.updateOne({ _id: r.body._id }, { $push: { members: friend._id } });
    return r.body;
  };
  const addOne = (g, extra = {}) =>
    call(addExpense, { user: U(me), body: { groupId: g._id, description: "Cab", amount: 100, ...extra } });

  beforeAll(async () => { await mongoose.connect(URI); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Group.deleteMany({}), Expense.deleteMany({})]);
    [me, friend, outsider] = [await mkUser("Meera"), await mkUser("Farah"), await mkUser("Omar")];
  });

  test("BEFORE any expense: split, currency and toggles are all editable", async () => {
    const g = await newGroup();
    const w = [{ userId: String(me._id), value: 2 }, { userId: String(friend._id), value: 1 }];
    const r = await patch(me, g, { settings: { currency: "USD", receiptRequired: true, joinApproval: true, defaultSplit: { type: "shares", weights: w } } });
    expect(r.statusCode).toBe(200);
    expect(r.body.hasExpenses).toBe(false);
    const s = await stored(g);
    expect(s.settings.currency).toBe("USD");
    expect(s.settings.defaultSplit.type).toBe("shares");
    expect(s.settings.receiptRequired && s.settings.joinApproval).toBe(true);
  });

  test("the first expense locks split type, weights and currency (409, nothing written)", async () => {
    const g = await newGroup();
    expect((await addOne(g)).statusCode).toBe(201);

    const type = await patch(me, g, { settings: { defaultSplit: { type: "shares", weights: [{ userId: String(me._id), value: 2 }] } } });
    expect(type.statusCode).toBe(409);
    expect(type.body.code).toBe("SETTINGS_LOCKED");
    expect(type.body.field).toBe("defaultSplit");

    const cur = await patch(me, g, { settings: { currency: "EUR" } });
    expect(cur.statusCode).toBe(409);
    expect(cur.body.field).toBe("currency");

    const s = await stored(g);
    expect(s.settings.defaultSplit.type).toBe("equal");
    expect(s.settings.currency).toBe("INR");
  });

  test("after an expense, changing weights of the same type is also locked", async () => {
    const g = await newGroup({ settings: { defaultSplit: { type: "shares", weights: [] } } });
    await patch(me, g, { settings: { defaultSplit: { type: "shares", weights: [{ userId: String(me._id), value: 1 }, { userId: String(friend._id), value: 1 }] } } });
    await addOne(g);
    const r = await patch(me, g, { settings: { defaultSplit: { type: "shares", weights: [{ userId: String(me._id), value: 3 }, { userId: String(friend._id), value: 1 }] } } });
    expect(r.statusCode).toBe(409);
  });

  test("after an expense ONLY the receipt and join-approval switches change", async () => {
    const g = await newGroup();
    await addOne(g);
    const r = await patch(me, g, { settings: { receiptRequired: true, joinApproval: true } });
    expect(r.statusCode).toBe(200);
    expect(r.body.hasExpenses).toBe(true);
    let s = await stored(g);
    expect(s.settings.receiptRequired && s.settings.joinApproval).toBe(true);
    const off = await patch(me, g, { settings: { receiptRequired: false } });
    expect(off.statusCode).toBe(200);
    s = await stored(g);
    expect(s.settings.receiptRequired).toBe(false);
    expect(s.settings.joinApproval).toBe(true);
  });

  test("a stale client re-sending the unchanged locked values still saves the toggles", async () => {
    const g = await newGroup({ groupType: "trip", trip: { startDate: "2026-10-01", endDate: "2026-10-09", budget: 5000 } });
    await addOne(g);
    const r = await patch(me, g, {
      groupType: "trip",
      settings: { receiptRequired: true, currency: "INR", defaultSplit: { type: "equal", weights: [] } },
      trip: { startDate: "2026-10-01", endDate: "2026-10-09", budget: "5000" },
    });
    expect(r.statusCode).toBe(200);
    expect((await stored(g)).settings.receiptRequired).toBe(true);
  });

  test("re-sending ONLY unchanged locked values is a harmless no-op, not an error", async () => {
    const g = await newGroup();
    await addOne(g);
    const r = await patch(me, g, { settings: { currency: "INR" } });
    expect(r.statusCode).toBe(200);
  });

  test("trip dates, budget and bill day are locked too, but only when they actually change", async () => {
    const g = await newGroup({ groupType: "trip", trip: { startDate: "2026-10-01", endDate: "2026-10-09", budget: 5000 } });
    await addOne(g);
    expect((await patch(me, g, { trip: { endDate: "2026-10-20" } })).statusCode).toBe(409);
    expect((await patch(me, g, { trip: { budget: 9000 } })).statusCode).toBe(409);
    expect((await patch(me, g, { trip: { startDate: null } })).statusCode).toBe(409);
    expect((await patch(me, g, { roommate: { billDay: 5 } })).statusCode).toBe(409);
    const s = await stored(g);
    expect(s.trip.budget).toBe(5000);
    expect(new Date(s.trip.endDate).toISOString().slice(0, 10)).toBe("2026-10-09");
  });

  test("a mixed request (toggle + locked change) is rejected whole - nothing is half-saved", async () => {
    const g = await newGroup();
    await addOne(g);
    const r = await patch(me, g, { settings: { receiptRequired: true, currency: "USD" } });
    expect(r.statusCode).toBe(409);
    const s = await stored(g);
    expect(s.settings.receiptRequired).toBe(false);
    expect(s.settings.currency).toBe("INR");
  });

  test("a settlement counts as an expense too", async () => {
    const g = await newGroup();
    await Expense.create({
      groupId: g._id, description: "Settlement", amount: 50, paidBy: friend._id, isSettlement: true,
      splitType: "equal", splits: [{ userId: me._id, share: 50 }],
    });
    expect((await patch(me, g, { settings: { currency: "USD" } })).statusCode).toBe(409);
  });

  test("an expense in ANOTHER group does not lock this one", async () => {
    const a = await newGroup();
    const b = await newGroup();
    await addOne(b);
    expect((await patch(me, a, { settings: { currency: "USD" } })).statusCode).toBe(200);
  });

  test("if every expense is deleted the group unlocks again", async () => {
    const g = await newGroup();
    await addOne(g);
    expect((await patch(me, g, { settings: { currency: "USD" } })).statusCode).toBe(409);
    await Expense.deleteMany({ groupId: g._id });
    expect((await patch(me, g, { settings: { currency: "USD" } })).statusCode).toBe(200);
  });

  test("the client's claim is irrelevant: the server decides (no hasExpenses in body)", async () => {
    const g = await newGroup();
    await addOne(g);
    const r = await patch(me, g, { hasExpenses: false, settings: { currency: "USD" } });
    expect(r.statusCode).toBe(409);
  });

  test("validation still runs first, and only the creator can edit", async () => {
    const g = await newGroup();
    expect((await patch(me, g, { settings: { currency: "XYZ" } })).statusCode).toBe(400);
    expect((await patch(friend, g, { settings: { receiptRequired: true } })).statusCode).toBe(403);
    expect((await patch(outsider, g, { settings: { receiptRequired: true } })).statusCode).toBe(403);
  });

  test("GET group reports hasExpenses", async () => {
    const g = await newGroup();
    expect((await call(getGroupById, { user: U(me), params: { groupId: g._id } })).body.hasExpenses).toBe(false);
    await addOne(g);
    expect((await call(getGroupById, { user: U(me), params: { groupId: g._id } })).body.hasExpenses).toBe(true);
  });

  test("group type stays permanent either way", async () => {
    const g = await newGroup();
    await patch(me, g, { groupType: "trip", settings: { receiptRequired: true } });
    expect((await stored(g)).groupType).not.toBe("trip");
  });
});
