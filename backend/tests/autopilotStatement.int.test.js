// Autopilot's complete_group / send_statement steps against a REAL MongoDB
// (applyStep without a transaction session). Skipped unless MONGO_TEST_URI is set:
//   MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_ap_test npm test -- autopilotStatement.int
import { jest } from "@jest/globals";

const URI = process.env.MONGO_TEST_URI;
const d = URI ? describe : describe.skip;

jest.unstable_mockModule("../index.js", () => ({ io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() }, onlineUsers: new Map() }));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => ({}), messaging: () => ({}) } }));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr: jest.fn(async () => null) }));
jest.unstable_mockModule("../utils/referralService.js", () => ({ incrementExpenseCount: jest.fn(async () => {}) }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail: jest.fn(async () => {}), sendEmailsSafely: jest.fn(async () => {}) }));
const notify = jest.fn(async () => {});
jest.unstable_mockModule("../controllers/notificationController.js", () => ({ createNotification: notify, sendPushToUsers: jest.fn(async () => {}) }));
const queue = jest.fn(async () => ({ queued: true }));
const recent = jest.fn(async () => null);
jest.unstable_mockModule("../services/statementOutbox.js", () => ({
  queueGroupStatement: queue, recentManualStatement: recent,
  getGroupStatementStatus: jest.fn(), retryFailedStatement: jest.fn(), cancelGroupStatements: jest.fn(),
}));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const Expense = (await import("../models/expenseModel.js")).default;
const { applyStep } = await import("../modules/autopilot/domain.js");

d("Autopilot complete_group / send_statement", () => {
  let owner, other, group;
  const run = () => ({ actorId: owner._id, groupId: group._id });
  const step = (type) => ({ id: "s1", type, payload: { groupId: String(group._id), name: "Flat", currency: "INR" } });

  beforeAll(async () => { await mongoose.connect(URI); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User, Group, Expense].map((M) => M.deleteMany({})));
    owner = await User.create({ name: "Meera", email: "meera@test.io", firebaseUid: "m1" });
    other = await User.create({ name: "Farah", email: "farah@test.io", firebaseUid: "f1" });
    group = await Group.create({ name: "Flat", createdBy: owner._id, members: [owner._id, other._id], settings: { currency: "INR" } });
    queue.mockClear(); notify.mockClear(); recent.mockReset().mockResolvedValue(null);
  });

  test("complete_group marks the group completed and queues the statement + notification afterwards", async () => {
    const after = [];
    const r = await applyStep(step("complete_group"), run(), null, after);
    expect(r).toMatchObject({ verified: true, completed: true });
    expect((await Group.findById(group._id)).isCompleted).toBe(true);
    expect(queue).not.toHaveBeenCalled(); // only after commit
    for (const fx of after) await fx();
    expect(queue).toHaveBeenCalledWith(String(group._id), expect.objectContaining({ reason: "completed" }));
    expect(notify).toHaveBeenCalled();
  });

  test("only the creator can complete; an already-completed group is refused", async () => {
    const asOther = { actorId: other._id, groupId: group._id };
    await expect(applyStep(step("complete_group"), asOther, null, [])).rejects.toMatchObject({ code: "FORBIDDEN" });
    await Group.updateOne({ _id: group._id }, { isCompleted: true });
    await expect(applyStep(step("complete_group"), run(), null, [])).rejects.toMatchObject({ code: "GROUP_COMPLETED" });
  });

  test("send_statement needs expenses and a completed/settled group, then queues a manual send", async () => {
    await expect(applyStep(step("send_statement"), run(), null, [])).rejects.toMatchObject({ code: "NO_EXPENSES" });
    await Expense.create({ groupId: group._id, description: "Rent", amount: 1000, paidBy: owner._id, splitType: "equal", participants: [owner._id, other._id], splits: [{ userId: owner._id, share: 500 }, { userId: other._id, share: 500 }], payers: [{ userId: owner._id, amount: 1000 }] });
    await expect(applyStep(step("send_statement"), run(), null, [])).rejects.toMatchObject({ code: "NOT_SETTLED" });

    await Group.updateOne({ _id: group._id }, { isCompleted: true }); // completed groups may send it
    const after = [];
    const r = await applyStep(step("send_statement"), run(), null, after);
    expect(r).toMatchObject({ verified: true, statementQueued: true, recipients: 2 });
    for (const fx of after) await fx();
    expect(queue).toHaveBeenCalledWith(String(group._id), expect.objectContaining({ reason: "manual" }));

    recent.mockResolvedValue({ _id: "x" });
    await expect(applyStep(step("send_statement"), run(), null, [])).rejects.toMatchObject({ code: "TOO_SOON" });
  });
});
