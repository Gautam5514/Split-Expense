// The MCP tools end to end against a REAL MongoDB: a real MCP client talks to
// the real server over an in-memory transport, and every write goes through
// the real REST controllers. Skipped unless MONGO_TEST_URI is set:
//   mongod --dbpath /tmp/db --port 27099 &
//   MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_mcp_test npm test -- mcpTools.int
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
const SettlementRequest = (await import("../models/settlementRequestModel.js")).default;
const RecurringExpense = (await import("../models/recurringExpenseModel.js")).default;
const { buildSplitEaseMcpServer } = await import("../services/mcpServer.js");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");

let n = 0;
const mkUser = async (name) =>
  (await User.create({ name, email: `${name.toLowerCase()}${++n}@test.io`, firebaseUid: `${name}${n}` })).toObject();

/** A connected MCP client acting as `user`. */
const connect = async (user) => {
  const server = buildSplitEaseMcpServer({ id: String(user._id), email: user.email, name: user.name });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientT);
  const call = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const text = res.content?.[0]?.text ?? "";
    let data = null;
    try { data = JSON.parse(text); } catch { /* error results are plain text */ }
    return { isError: !!res.isError, text, data };
  };
  return { call, close: () => client.close() };
};

d("MCP tools against real controllers + MongoDB", () => {
  let meera, farah, omar, me, friend, outsider;

  beforeAll(async () => { await mongoose.connect(URI); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User, Group, Expense, SettlementRequest, RecurringExpense].map((M) => M.deleteMany({})));
    [meera, farah, omar] = [await mkUser("Meera"), await mkUser("Farah"), await mkUser("Omar")];
    [me, friend, outsider] = [await connect(meera), await connect(farah), await connect(omar)];
  });
  afterEach(async () => { await Promise.all([me, friend, outsider].map((c) => c.close())); });

  /** A trip group created over MCP, with Farah added as a member. */
  const tripWithFarah = async (name = "Goa Trip") => {
    const created = await me.call("create_group", { name, groupType: "trip", currency: "INR", budget: 20000 });
    expect(created.isError).toBe(false);
    await Group.updateOne({ _id: created.data.id }, { $addToSet: { members: farah._id } });
    return created.data;
  };

  test("create_group goes through the real controller (type presets, budget, creator-only membership)", async () => {
    const g = await tripWithFarah();
    const stored = await Group.findById(g.id).lean();
    expect(stored.groupType).toBe("trip");
    expect(stored.trip.budget).toBe(20000);
    expect(stored.icon).toBe("plane"); // preset applied by createGroup, not by the MCP layer
    expect(g.summary).toMatch(/Created trip group "Goa Trip"/);

    const dup = await me.call("create_group", { name: "Goa Trip" });
    expect(dup.isError).toBe(true);
    expect(dup.text).toMatch(/already have a group/i);

    const bad = await me.call("create_group", { name: "Flat", groupType: "roommate", budget: 100 });
    expect(bad.isError).toBe(true);
    expect(bad.text).toMatch(/only apply to trip groups/);
  });

  test("add_expense by group NAME, default split, then balances + who owes whom", async () => {
    await tripWithFarah();
    const added = await me.call("add_expense", { group: "goa", description: "Dinner", amount: 1200, category: "food" });
    expect(added.isError).toBe(false);
    expect(added.data.splits).toHaveLength(2);
    expect(added.data.yourShare).toBe(600);
    expect(added.data.summary).toMatch(/Added "Dinner" for ₹1,200 to "Goa Trip", paid by you, split equally between 2 people \(₹600 each\)/);

    const bal = await me.call("get_balances", { group: "Goa Trip" });
    expect(bal.data.yourBalance).toBe(600);
    expect(bal.data.owedToYou).toEqual([{ from: "Farah", amount: 600 }]);
    expect(bal.data.summary).toMatch(/Farah pays you ₹600/);
  });

  test("duplicate guard stops an accidental retry, allowDuplicate overrides it", async () => {
    await tripWithFarah();
    const args = { group: "Goa Trip", description: "Cab", amount: 300 };
    expect((await me.call("add_expense", args)).isError).toBe(false);
    const again = await me.call("add_expense", args);
    expect(again.isError).toBe(true);
    expect(again.text).toMatch(/already added "Cab"/);
    expect((await me.call("add_expense", { ...args, allowDuplicate: true })).isError).toBe(false);
    expect(await Expense.countDocuments({ description: "Cab" })).toBe(2);
  });

  test("exact / percent splits by member name; bad totals are explained", async () => {
    await tripWithFarah();
    const exact = await me.call("add_expense", {
      group: "Goa Trip", description: "Hotel", amount: 1000, splitType: "exact",
      splitDetails: [{ member: "farah", value: 700 }, { member: "me", value: 300 }],
    });
    expect(exact.isError).toBe(false);
    expect(exact.data.splits.find((s) => s.member === "Farah").share).toBe(700);

    const wrong = await me.call("add_expense", {
      group: "Goa Trip", description: "Snacks", amount: 100, splitType: "percent",
      splitDetails: [{ member: "Farah", value: 50 }, { member: "me", value: 40 }],
    });
    expect(wrong.isError).toBe(true);
    expect(wrong.text).toMatch(/add up to 90%/);

    const subset = await me.call("add_expense", { group: "Goa Trip", description: "Parasailing", amount: 500, splitWith: ["Farah"] });
    expect(subset.data.splits).toEqual([expect.objectContaining({ member: "Farah", share: 500 })]);
    expect(subset.data.othersOweYou).toBe(500);
  });

  test("foreign currency is converted from originalAmount × fxRate", async () => {
    await tripWithFarah();
    const fx = await me.call("add_expense", { group: "Goa Trip", description: "Visa", currency: "USD", originalAmount: 50, fxRate: 83.5 });
    expect(fx.isError).toBe(false);
    expect(fx.data.amount).toBe(4175);
    const stored = await Expense.findById(fx.data.id).lean();
    expect(stored).toMatchObject({ currency: "USD", originalAmount: 50, fxRate: 83.5 });

    const noRate = await me.call("add_expense", { group: "Goa Trip", description: "Visa 2", currency: "USD", originalAmount: 50 });
    expect(noRate.isError).toBe(true);
    expect(noRate.text).toMatch(/need originalAmount and fxRate/);
  });

  test("settle_up: creditor records instantly; debtor's payment waits for confirmation", async () => {
    await tripWithFarah();
    await me.call("add_expense", { group: "Goa Trip", description: "Dinner", amount: 1000 });

    // Wrong direction is explained instead of failing silently.
    const wrongWay = await me.call("settle_up", { group: "Goa Trip", with: "Farah", direction: "i_paid_them" });
    expect(wrongWay.isError).toBe(true);
    expect(wrongWay.text).toMatch(/other way round: Farah owes you up to ₹500/);

    // Farah says she paid -> pending until Meera confirms.
    const paid = await friend.call("settle_up", { group: "Goa Trip", with: "Meera", direction: "i_paid_them", amount: 200 });
    expect(paid.data.status).toBe("pending");
    const pending = await me.call("list_pending_settlements");
    expect(pending.data).toHaveLength(1);
    expect(pending.data[0].youCan).toEqual(["confirm", "reject"]);
    const confirmed = await me.call("respond_to_settlement", { requestId: String(pending.data[0].requestId), action: "confirm" });
    expect(confirmed.isError).toBe(false);

    // Meera records Farah paying the rest -> immediate, no amount needed.
    const rest = await me.call("settle_up", { group: "Goa Trip", with: "Farah", direction: "they_paid_me" });
    expect(rest.data.status).toBe("confirmed");
    expect(rest.data.amount).toBe(300);
    const bal = await me.call("get_balances", { group: "Goa Trip" });
    expect(bal.data.summary).toMatch(/Everyone is settled up/);
  });

  test("get_action_items: shows what to pay and confirm, and when a group can be completed", async () => {
    await tripWithFarah("Goa Trip");
    await me.call("add_expense", { group: "Goa Trip", description: "Dinner", amount: 1000 });

    // Farah owes Meera 500; Farah sees it as something to pay, Meera as money owed.
    const farahItems = await friend.call("get_action_items");
    expect(farahItems.data.items[0].what).toMatch(/You owe Meera/);
    expect(farahItems.data.items[0].next).toMatchObject({ tool: "settle_up", args: { with: "Meera", direction: "i_paid_them", amount: 500 } });
    const meeraItems = await me.call("get_action_items");
    expect(meeraItems.data.items.some((i) => /Farah owes you/.test(i.what))).toBe(true);

    // Farah pays: Meera now has a payment to confirm, listed first.
    await friend.call("settle_up", { group: "Goa Trip", with: "Meera", direction: "i_paid_them", amount: 500 });
    const afterPay = await me.call("get_action_items");
    expect(afterPay.data.items[0].next.tool).toBe("respond_to_settlement");
    expect((await friend.call("get_action_items")).data.waitingOnOthers).toHaveLength(1);

    // Once confirmed and settled, the creator is offered completing the group.
    await me.call("respond_to_settlement", { requestId: String((await me.call("list_pending_settlements")).data[0].requestId), action: "confirm" });
    const done = await me.call("get_action_items");
    expect(done.data.items.some((i) => i.next?.tool === "complete_group")).toBe(true);
    expect((await outsider.call("get_action_items")).data.summary).toMatch(/caught up/i);
  });

  test("statement tools: creator-only send, status for members", async () => {
    await tripWithFarah("Goa Trip");
    const none = await friend.call("get_statement_status", { group: "Goa Trip" });
    expect(none.data.sent).toBe(false);
    const early = await me.call("send_group_statement", { group: "Goa Trip" });
    expect(early.isError).toBe(true); // no expenses yet / not settled
    const notCreator = await friend.call("send_group_statement", { group: "Goa Trip" });
    expect(notCreator.isError).toBe(true);
    expect(notCreator.text).toMatch(/Only the creator/);
    const nothingToRetry = await me.call("retry_failed_statements", { group: "Goa Trip" });
    expect(nothingToRetry.isError).toBe(true);
  });

  test("names are scoped to the user's own groups; ambiguity becomes a question", async () => {
    await tripWithFarah("Goa Trip");
    await me.call("create_group", { name: "Goa Office", groupType: "business" });
    const ambiguous = await me.call("add_expense", { group: "goa", description: "x", amount: 10 });
    expect(ambiguous.isError).toBe(true);
    expect(ambiguous.text).toMatch(/matches more than one group/);

    // Omar is not a member: neither the name nor the id reaches the group.
    const byName = await outsider.call("get_group", { group: "Goa Trip" });
    expect(byName.isError).toBe(true);
    const id = String((await Group.findOne({ name: "Goa Trip" }).lean())._id);
    const byId = await outsider.call("add_expense", { group: id, description: "x", amount: 10 });
    expect(byId.isError).toBe(true);
    expect(await Expense.countDocuments({})).toBe(0);
  });

  test("controller rules still apply: settings lock after the first expense, creator-only actions", async () => {
    await tripWithFarah();
    await me.call("add_expense", { group: "Goa Trip", description: "Fuel", amount: 400, category: "fuel" });
    const locked = await me.call("update_group_settings", { group: "Goa Trip", currency: "USD" });
    expect(locked.isError).toBe(true);
    expect(locked.text).toMatch(/lock|can't|cannot/i);
    expect((await me.call("update_group_settings", { group: "Goa Trip", joinApproval: true })).isError).toBe(false);

    const notCreator = await friend.call("get_invite_link", { group: "Goa Trip" });
    expect(notCreator.isError).toBe(true);
    const link = await me.call("get_invite_link", { group: "Goa Trip" });
    expect(link.data.joinLink).toMatch(/http/);
  });

  test("list_expenses filters; get_expense shows splits", async () => {
    await tripWithFarah();
    await me.call("add_expense", { group: "Goa Trip", description: "Beach shack lunch", amount: 800, category: "food" });
    await me.call("add_expense", { group: "Goa Trip", description: "Scooter rent", amount: 600, category: "travel" });
    const food = await me.call("list_expenses", { group: "Goa Trip", category: "food" });
    expect(food.data.map((e) => e.description)).toEqual(["Beach shack lunch"]);
    const search = await me.call("list_expenses", { group: "Goa Trip", search: "scooter" });
    expect(search.data).toHaveLength(1);
    expect(search.data[0].yourShare).toBe(300);

    const detail = await friend.call("get_expense", { expenseId: String(search.data[0].id) });
    expect(detail.data.paidBy.name).toBe("Meera");
    expect(detail.data.splits).toHaveLength(2);
    expect((await outsider.call("get_expense", { expenseId: String(search.data[0].id) })).text).toBe("Expense not found.");
  });

  test("monthly bills: add, find by description, pause", async () => {
    await me.call("create_group", { name: "Flat 4B", groupType: "roommate" });
    const bill = await me.call("add_recurring_bill", { group: "Flat 4B", description: "Rent", amount: 30000, dayOfMonth: 1, category: "rent" });
    expect(bill.data.summary).toMatch(/Every month on the 1st, "Rent" \(₹30,000\)/);
    const paused = await me.call("update_recurring_bill", { group: "Flat 4B", bill: "rent", active: false });
    expect(paused.data.active).toBe(false);
    expect((await me.call("list_recurring_bills", { group: "Flat 4B" })).data.bills).toHaveLength(1);
    expect((await me.call("delete_recurring_bill", { group: "Flat 4B", bill: "Rent" })).isError).toBe(false);
    expect(await RecurringExpense.countDocuments({})).toBe(0);
  });

  test("delete_group needs the exact name as confirmation", async () => {
    await tripWithFarah();
    const refused = await me.call("delete_group", { group: "Goa Trip", confirmName: "yes" });
    expect(refused.isError).toBe(true);
    expect(await Group.countDocuments({})).toBe(1);
    const done = await me.call("delete_group", { group: "Goa Trip", confirmName: "goa trip" });
    expect(done.isError).toBe(false);
    expect(await Group.countDocuments({})).toBe(0);
  });
});
