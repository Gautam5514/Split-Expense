// Settlement-statement email workflow end to end, against a REAL MongoDB:
// real controllers trigger it, the outbox queues, waits, re-checks, sends,
// retries and finalizes. Only SMTP is faked.
// Skipped unless MONGO_TEST_URI is set:
//   mongod --dbpath /tmp/db --port 27099 &
//   MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_test npm run test:int
import { jest } from "@jest/globals";

const URI = process.env.MONGO_TEST_URI;
const d = URI ? describe : describe.skip;

const sendEmail = jest.fn(async () => ({ messageId: "<m@brevo>" }));
const createNotification = jest.fn(async () => {});

jest.unstable_mockModule("../index.js", () => ({
  io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() },
  onlineUsers: new Map(),
}));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => ({}), messaging: () => ({}) } }));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr: jest.fn(async () => null) }));
jest.unstable_mockModule("../utils/referralService.js", () => ({ incrementExpenseCount: jest.fn(async () => {}) }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail, sendEmailsSafely: jest.fn(async () => {}) }));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({ createNotification, sendPushToUsers: jest.fn(async () => {}) }));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const Expense = (await import("../models/expenseModel.js")).default;
const { StatementBatch, StatementDelivery } = await import("../models/statementEmailModel.js");
const { createGroup, markGroupCompleted, deleteGroup, resendGroupReport, getGroupReportStatus, retryGroupReport } =
  await import("../controllers/groupController.js");
const { addExpense, requestSettlement } = await import("../controllers/expenseController.js");
const outbox = await import("../services/statementOutbox.js");
const { runStatementOutbox, queueGroupStatement, QUIET_WINDOW_MS, RETRY_BACKOFF_MS } = outbox;

const call = async (fn, { user, params = {}, body = {}, query = {} } = {}) => {
  const res = {
    statusCode: 200, body: undefined, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.body = b; return this; },
    set() { return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
  await fn({ user, params, body, query }, res);
  return res;
};
const U = (u) => ({ id: String(u._id), name: u.name });
let n = 0;
const mkUser = async (name) => (await User.create({ name, email: `${name.toLowerCase()}${++n}@test.io`, firebaseUid: `${name}${n}` })).toObject();
const later = (ms) => new Date(Date.now() + ms);
// Fire-and-forget triggers write to Mongo on their own; give them a moment.
const settle = () => new Promise((r) => setTimeout(r, 150));

d("statement email outbox (real MongoDB)", () => {
  let asha, bala, chitra, g;

  beforeAll(async () => { await mongoose.connect(URI); await StatementBatch.init(); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User, Group, Expense, StatementBatch, StatementDelivery].map((M) => M.deleteMany({})));
    sendEmail.mockReset().mockResolvedValue({ messageId: "<m@brevo>" });
    createNotification.mockClear();
    [asha, bala, chitra] = [await mkUser("Asha"), await mkUser("Bala"), await mkUser("Chitra")];
    const r = await call(createGroup, { user: U(asha), body: { name: `Goa ${++n}` } });
    await Group.updateOne({ _id: r.body._id }, { $push: { members: { $each: [bala._id, chitra._id] } } });
    g = await Group.findById(r.body._id).lean();
    // Asha pays 900 for three: Bala and Chitra owe her 300 each.
    expect((await call(addExpense, { user: U(asha), body: { groupId: g._id, description: "Hotel", amount: 900 } })).statusCode).toBe(201);
  });

  const receive = (from) => call(requestSettlement, {
    user: U(asha), body: { groupId: String(g._id), fromUserId: String(from._id), toUserId: String(asha._id), amount: 300, method: "online" },
  });
  const batches = () => StatementBatch.find({ groupId: g._id }).sort({ createdAt: 1 }).lean();

  test("last settlement queues a statement; it waits out the quiet window, then every member gets a PDF", async () => {
    await receive(bala); await settle();
    expect(await batches()).toHaveLength(0); // Chitra still owes - nothing yet

    await receive(chitra); await settle();
    const [b] = await batches();
    expect(b).toMatchObject({ reason: "settled", status: "scheduled" });
    expect(await StatementDelivery.countDocuments({ batchId: b._id, status: "waiting" })).toBe(3);

    await runStatementOutbox(new Date()); // still inside the quiet window
    expect(sendEmail).not.toHaveBeenCalled();

    await runStatementOutbox(later(QUIET_WINDOW_MS.settled + 1000));
    expect(sendEmail).toHaveBeenCalledTimes(3);
    const msg = sendEmail.mock.calls[0][0];
    expect(msg.subject).toContain("fully settled");
    expect(msg.attachments[0].content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(msg.headers["X-Mailin-Tag"]).toBe("settlement-statement-settled");
    // Inline brand icons travel with the email (cid:), no emoji anywhere.
    expect(msg.attachments.filter((x) => x.cid).map((x) => x.cid)).toEqual(expect.arrayContaining(["se-logo", "se-status-settled", "se-file"]));
    expect(msg.html).toContain("cid:se-logo");
    expect(/\p{Extended_Pictographic}/u.test(msg.subject + msg.html + msg.text)).toBe(false);
    // Each member gets their own copy of the PDF ("Prepared for" them).
    const pdfs = sendEmail.mock.calls.map((c) => c[0].attachments.find((x) => x.contentType === "application/pdf"));
    expect(pdfs[0].filename).toMatch(/^SplitEase-Statement-.+\.pdf$/);
    expect(new Set(pdfs.map((p) => p.content.length)).size).toBeGreaterThan(1);
    expect(new Set(sendEmail.mock.calls.map((c) => c[0].to))).toEqual(new Set([asha.email, bala.email, chitra.email]));

    const done = await StatementBatch.findById(b._id).lean();
    expect(done.status).toBe("done");
    expect(done.stats).toMatchObject({ total: 3, sent: 3, failed: 0 });
    expect(createNotification).toHaveBeenCalledWith(expect.arrayContaining([String(asha._id)]), expect.stringContaining("emailed"), `/groups/${g._id}`, "group", expect.anything());

    // Marking it completed afterwards describes the same ledger: no second email.
    expect((await call(markGroupCompleted, { user: U(asha), params: { groupId: String(g._id) } })).statusCode).toBe(200);
    await settle();
    expect(await batches()).toHaveLength(1);
  });

  test("two triggers for the same ledger state at the same instant queue it once", async () => {
    await receive(bala); await receive(chitra); await settle();
    // Start from a clean slate so all five really race each other.
    await StatementBatch.deleteMany({}); await StatementDelivery.deleteMany({});
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => queueGroupStatement(g._id, { reason: "settled", onlyIfSettled: true })));
    expect(rs.filter((r) => r.queued)).toHaveLength(1);
    expect(rs.filter((r) => r.skipped === "already-queued")).toHaveLength(4);
    expect(await batches()).toHaveLength(1);
    expect(await StatementDelivery.countDocuments({})).toBe(3);
  });

  test("a new expense during the quiet window cancels the 'settled' statement before it goes out", async () => {
    await receive(bala); await receive(chitra); await settle();
    await call(addExpense, { user: U(bala), body: { groupId: g._id, description: "Late cab", amount: 300 } });

    await runStatementOutbox(later(QUIET_WINDOW_MS.settled + 1000));
    expect(sendEmail).not.toHaveBeenCalled();
    const [b] = await batches();
    expect(b.status).toBe("superseded");
    expect(b.dedupeKey).toBeUndefined();
    expect(await StatementDelivery.countDocuments({ batchId: b._id, status: "cancelled" })).toBe(3);
  });

  test("completed with balances open, then fully settled later: two statements, each correct", async () => {
    await call(markGroupCompleted, { user: U(asha), params: { groupId: String(g._id) } }); await settle();
    await runStatementOutbox(later(QUIET_WINDOW_MS.completed + 1000));
    expect(sendEmail).toHaveBeenCalledTimes(3);
    const toBala = sendEmail.mock.calls.find((c) => c[0].to === bala.email)[0];
    expect(toBala.subject).toContain("is complete");
    expect(toBala.text).toContain("You pay ₹300.");

    await receive(bala); await receive(chitra); await settle();
    await runStatementOutbox(later(QUIET_WINDOW_MS.settled + 1000));
    expect(sendEmail).toHaveBeenCalledTimes(6);
    expect(sendEmail.mock.calls[5][0].subject).toContain("fully settled");
  });

  test("a temporary SMTP failure is retried with backoff; only the failed member is re-sent", async () => {
    sendEmail.mockImplementation(async ({ to }) => {
      if (to === bala.email) throw Object.assign(new Error("421 Too many connections"), { responseCode: 421 });
      return { messageId: "<ok>" };
    });
    await receive(bala); await receive(chitra); await settle();
    const t1 = later(QUIET_WINDOW_MS.settled + 1000);
    await runStatementOutbox(t1);

    const balaRow = await StatementDelivery.findOne({ to: bala.email }).lean();
    expect(balaRow).toMatchObject({ status: "queued", attempts: 1 });
    expect(balaRow.nextAttemptAt.getTime()).toBe(t1.getTime() + RETRY_BACKOFF_MS[0]);
    expect((await batches())[0].status).toBe("sending");

    sendEmail.mockClear().mockResolvedValue({ messageId: "<ok>" });
    await runStatementOutbox(new Date(t1.getTime() + 10_000)); // too early for the retry
    expect(sendEmail).not.toHaveBeenCalled();
    await runStatementOutbox(new Date(t1.getTime() + RETRY_BACKOFF_MS[0] + 1000));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe(bala.email);
    expect((await batches())[0].status).toBe("done");
  });

  test("a rejected address fails at once, creator is told and can retry it", async () => {
    sendEmail.mockImplementation(async ({ to }) => {
      if (to === chitra.email) throw Object.assign(new Error("550 Mailbox unavailable"), { responseCode: 550 });
      return { messageId: "<ok>" };
    });
    await receive(bala); await receive(chitra); await settle();
    await runStatementOutbox(later(QUIET_WINDOW_MS.settled + 1000));
    const [b] = await batches();
    expect(b.status).toBe("partial");
    expect(createNotification).toHaveBeenCalledWith([String(asha._id)], expect.stringContaining("couldn't be emailed to 1"), expect.any(String), "group", expect.anything());

    const st = await call(getGroupReportStatus, { user: U(asha), params: { groupId: String(g._id) } });
    const row = st.body.latest.recipients.find((r) => r.name === "Chitra");
    expect(row).toMatchObject({ status: "failed", email: chitra.email });
    expect(row.lastError).toContain("550");
    // Members see who got it, but not addresses or errors.
    const asBala = await call(getGroupReportStatus, { user: U(bala), params: { groupId: String(g._id) } });
    expect(asBala.body.latest.recipients[0].email).toBeUndefined();
    expect((await call(retryGroupReport, { user: U(bala), params: { groupId: String(g._id) } })).statusCode).toBe(403);

    sendEmail.mockClear().mockResolvedValue({ messageId: "<ok>" });
    expect((await call(retryGroupReport, { user: U(asha), params: { groupId: String(g._id) } })).body.retried).toBe(1);
    await runStatementOutbox(new Date());
    expect(sendEmail.mock.calls.map((c) => c[0].to)).toEqual([chitra.email]);
    expect((await StatementBatch.findById(b._id).lean()).status).toBe("done");
  });

  test("a delivery left mid-send by a crashed server is picked up again once its lock expires", async () => {
    await receive(bala); await receive(chitra); await settle();
    const t1 = later(QUIET_WINDOW_MS.settled + 1000);
    await runStatementOutbox(t1);
    // Simulate a crash: one delivery stuck in "sending".
    await StatementDelivery.updateOne({ to: bala.email }, { $set: { status: "sending", lockedUntil: new Date(t1.getTime() + 60_000) } });
    await StatementBatch.updateOne({ groupId: g._id }, { $set: { status: "sending" } });
    sendEmail.mockClear();

    await runStatementOutbox(new Date(t1.getTime() + 30_000)); // lock still held
    expect(sendEmail).not.toHaveBeenCalled();
    await runStatementOutbox(new Date(t1.getTime() + 61_000));
    expect(sendEmail.mock.calls.map((c) => c[0].to)).toEqual([bala.email]);
  });

  test("manual resend: creator only, sends immediately, 5-minute cooldown", async () => {
    const p = { params: { groupId: String(g._id) } };
    expect((await call(resendGroupReport, { user: U(asha), ...p })).statusCode).toBe(400); // not completed, not settled
    await call(markGroupCompleted, { user: U(asha), ...p }); await settle();
    expect((await call(resendGroupReport, { user: U(bala), ...p })).statusCode).toBe(403);

    const r = await call(resendGroupReport, { user: U(asha), ...p });
    expect(r.statusCode).toBe(202);
    expect(r.body.recipients).toBe(3);
    await runStatementOutbox(new Date());
    expect(sendEmail.mock.calls.every((c) => c[0].subject.includes("settlement statement"))).toBe(true);
    // The manual send replaced the "completed" one still in its window.
    expect((await batches()).map((b) => b.status)).toEqual(["superseded", "done"]);

    expect((await call(resendGroupReport, { user: U(asha), ...p })).statusCode).toBe(429);
  });

  test("deleting the group drops statements that haven't gone out", async () => {
    await call(markGroupCompleted, { user: U(asha), params: { groupId: String(g._id) } }); await settle();
    await call(deleteGroup, { user: U(asha), params: { groupId: String(g._id) } }); await settle();
    await runStatementOutbox(later(QUIET_WINDOW_MS.completed + 1000));
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await batches())[0].status).toBe("cancelled");
  });
});
