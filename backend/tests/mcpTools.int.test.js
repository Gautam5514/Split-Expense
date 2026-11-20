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

// Live exchange rates come from the network; the tests decide what "today's rate" is.
const fakeGetRate = jest.fn(async () => ({ rate: 84, source: "test", fetchedAt: new Date() }));
jest.unstable_mockModule("../utils/fxRates.js", () => ({ getRate: fakeGetRate }));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const Expense = (await import("../models/expenseModel.js")).default;
const SettlementRequest = (await import("../models/settlementRequestModel.js")).default;
const RecurringExpense = (await import("../models/recurringExpenseModel.js")).default;
const QuickSplit = (await import("../models/quickSplitModel.js")).default;
const Notepad = (await import("../models/notepadModel.js")).default;
const GroupMessage = (await import("../models/groupMessageModel.js")).default;
const Notification = (await import("../models/notification.model.js")).default;
const GroupInvite = (await import("../models/groupInviteModel.js")).default;
const { buildSplitEaseMcpServer, writeLimiter } = await import("../services/mcpServer.js");
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

  beforeAll(async () => {
    await mongoose.connect(URI);
    // Wait for the index builds: "you already have a group with this name"
    // relies on the unique index, which is otherwise still building in test 1.
    await Promise.all([User, Group, Expense, GroupInvite].map((M) => M.init()));
  });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all(
      [User, Group, Expense, SettlementRequest, RecurringExpense, QuickSplit, Notepad, GroupMessage, Notification, GroupInvite].map((M) => M.deleteMany({})),
    );
    writeLimiter.reset();
    fakeGetRate.mockReset().mockResolvedValue({ rate: 84, source: "test", fetchedAt: new Date() });
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

    expect(fakeGetRate).not.toHaveBeenCalled(); // the user's own rate wins
  });

  test("foreign currency without a rate uses today's rate; split values are in the bill's currency", async () => {
    await tripWithFarah();
    const auto = await me.call("add_expense", { group: "Goa Trip", description: "Museum", currency: "USD", originalAmount: 50 });
    expect(auto.isError).toBe(false);
    expect(auto.data.amount).toBe(4200);
    expect(auto.data.foreignCurrency).toMatchObject({ currency: "USD", originalAmount: 50, fxRate: 84, rateSource: "live rate" });
    expect(auto.data.summary).toMatch(/USD 50 at today's rate of 84/);

    // "$30 taxi" arrives as amount + currency: read as 30 USD, not 30 INR.
    const loose = await me.call("add_expense", { group: "Goa Trip", description: "Taxi", amount: 30, currency: "USD" });
    expect(loose.data.amount).toBe(2520);

    // Exact amounts given in USD are converted and still add up to the INR total.
    fakeGetRate.mockResolvedValue({ rate: 83.333333, source: "test", fetchedAt: new Date() });
    const exact = await me.call("add_expense", {
      group: "Goa Trip", description: "Show", currency: "USD", originalAmount: 10, splitType: "exact",
      splitDetails: [{ member: "Farah", value: 3.33 }, { member: "me", value: 6.67 }],
    });
    expect(exact.isError).toBe(false);
    expect(Math.round(exact.data.splits.reduce((a, x) => a + x.share, 0) * 100)).toBe(Math.round(exact.data.amount * 100));

    // Rates unavailable -> ask the user instead of inventing one.
    fakeGetRate.mockRejectedValue(Object.assign(new Error("down"), { status: 503 }));
    const down = await me.call("add_expense", { group: "Goa Trip", description: "Ferry", currency: "EUR", originalAmount: 20 });
    expect(down.isError).toBe(true);
    expect(down.text).toMatch(/Ask the user for it and pass fxRate/);
    expect(await Expense.countDocuments({ description: "Ferry" })).toBe(0);
  });

  test("itemised bill: each item is shared by the people who had it", async () => {
    await tripWithFarah();
    const bill = await me.call("add_expense", {
      group: "Goa Trip", description: "Brunch", amount: 1000,
      items: [
        { name: "Pizza", amount: 600, sharedBy: ["me", "Farah"] },
        { name: "Wine", amount: 300, sharedBy: ["Farah"] },
        { name: "Service charge", amount: 100 },
      ],
    });
    expect(bill.isError).toBe(false);
    expect(bill.data.splitType).toBe("itemized");
    expect(bill.data.splits.find((x) => x.member === "Farah").share).toBe(650);
    expect(bill.data.yourShare).toBe(350);
    const stored = await Expense.findById(bill.data.id).lean();
    expect(stored.items.map((i) => i.name)).toEqual(["Pizza", "Wine", "Service charge"]);

    const short = await me.call("add_expense", { group: "Goa Trip", description: "Cafe", amount: 500, items: [{ name: "Coffee", amount: 400, sharedBy: ["me"] }] });
    expect(short.isError).toBe(true);
    expect(short.text).toMatch(/items add up to ₹400, but the bill is ₹500/);
  });

  test("add_expenses adds a list in one call and reports each failure", async () => {
    await tripWithFarah();
    const res = await me.call("add_expenses", {
      group: "Goa Trip",
      expenses: [
        { description: "Cab", amount: 640, category: "travel" },
        { description: "Hotel", amount: 9500, category: "stay", splitWith: ["Farah"] },
        { description: "Scuba", amount: 3000, splitWith: ["Nobody"] },
        { description: "Cab", amount: 640 },
      ],
    });
    expect(res.isError).toBe(false);
    expect(res.data.added.map((a) => a.description)).toEqual(["Cab", "Hotel"]);
    expect(res.data.totalAdded).toBe(10140);
    expect(res.data.failed.map((f) => f.position)).toEqual([3, 4]);
    expect(res.data.failed[0].reason).toMatch(/No member "Nobody"/);
    expect(res.data.failed[1].reason).toMatch(/Same description and amount as bill 1/);
    expect(res.data.summary).toMatch(/Added 2 of 4 bills/);
    expect(await Expense.countDocuments({})).toBe(2);

    const none = await me.call("add_expenses", { group: "Goa Trip", expenses: [{ description: "Cab", amount: 640 }] });
    expect(none.isError).toBe(true); // already added a moment ago
  });

  test("update_expense and delete_expense: only your own bills, found by description", async () => {
    await tripWithFarah();
    await me.call("add_expense", { group: "Goa Trip", description: "Dinner at Thalassa", amount: 1800 });
    await friend.call("add_expense", { group: "Goa Trip", description: "Scooter", amount: 600 });

    const renamed = await me.call("update_expense", { group: "Goa Trip", description: "thalassa", newDescription: "Dinner", category: "food", notes: "sunset table" });
    expect(renamed.isError).toBe(false);
    expect(await Expense.findOne({ description: "Dinner" }).lean()).toMatchObject({ category: "food", notes: "sunset table", amount: 1800 });

    // Farah's bill is not Meera's to touch, by words or by id.
    const notMine = await me.call("delete_expense", { group: "Goa Trip", description: "scooter" });
    expect(notMine.isError).toBe(true);
    const scooter = await Expense.findOne({ description: "Scooter" }).lean();
    const byId = await me.call("delete_expense", { expenseId: String(scooter._id) });
    expect(byId.isError).toBe(true);
    expect(byId.text).toMatch(/Only the person who added/);
    expect((await outsider.call("delete_expense", { expenseId: String(scooter._id) })).text).toBe("Expense not found.");

    const before = (await friend.call("get_balances", { group: "Goa Trip" })).data.yourBalance;
    expect(before).toBe(-600);
    const gone = await me.call("delete_expense", { group: "Goa Trip", description: "Dinner" });
    expect(gone.isError).toBe(false);
    expect(gone.data.summary).toMatch(/Deleted "Dinner" \(₹1,800\)/);
    expect((await friend.call("get_balances", { group: "Goa Trip" })).data.yourBalance).toBe(300);

    // A settle-up record is never deletable.
    await friend.call("settle_up", { group: "Goa Trip", with: "Meera", direction: "they_paid_me", amount: 300 });
    const settlement = await Expense.findOne({ isSettlement: true }).lean();
    const payer = String(settlement.paidBy) === String(meera._id) ? me : friend;
    const refused = await payer.call("delete_expense", { expenseId: String(settlement._id) });
    expect(refused.isError).toBe(true);
    expect(refused.text).toMatch(/Settle-up payments can't be changed or deleted/);
  });

  test("export_expenses returns spreadsheet-safe CSV", async () => {
    await tripWithFarah();
    await me.call("add_expense", { group: "Goa Trip", description: 'Dinner, "the big one"', amount: 1000, category: "food" });
    await me.call("add_expense", { group: "Goa Trip", description: "=SUM(A1:A9)", amount: 200 });
    const out = await friend.call("export_expenses", { group: "Goa Trip" });
    expect(out.data.rowCount).toBe(2);
    expect(out.data.total).toBe(1200);
    const lines = out.data.csv.split("\n");
    expect(lines[0]).toBe("Date,Description,Category,Type,Paid by,Amount,Currency,Your share,Notes");
    expect(out.data.csv).toContain('"Dinner, ""the big one""",food,expense,Meera,1000,INR,500,');
    expect(out.data.csv).toContain("'=SUM(A1:A9)");
  });

  test("small typos in group and member names are forgiven; two near matches are not guessed", async () => {
    await tripWithFarah();
    const typo = await me.call("add_expense", { group: "goa trp", description: "Tea", amount: 100, splitWith: ["Farha"] });
    expect(typo.isError).toBe(false);
    expect(typo.data.group).toBe("Goa Trip");
    expect(typo.data.splits[0].member).toBe("Farah");
    expect((await me.call("get_group", { group: "trip goa" })).data.name).toBe("Goa Trip");

    await me.call("create_group", { name: "Goa Trap" });
    const two = await me.call("get_group", { group: "Goa Trop" });
    expect(two.isError).toBe(true);
    expect(two.text).toMatch(/matches more than one group/);
  });

  test("add_members by contact name; find_people; privacy settings", async () => {
    await tripWithFarah(); // makes Farah a contact of Meera
    await me.call("create_group", { name: "Flat 4B" });
    const byName = await me.call("add_members", { group: "Flat 4B", people: ["farah"] });
    expect(byName.isError).toBe(false);
    expect((await Group.findOne({ name: "Flat 4B" }).lean()).members.map(String)).toContain(String(farah._id));

    const unknown = await me.call("add_members", { group: "Flat 4B", people: ["Zubin"] });
    expect(unknown.isError).toBe(true);
    expect(unknown.text).toMatch(/Ask the user for their email/);
    const half = await me.call("create_group", { name: "Ghost Trip", members: ["Zubin"] });
    expect(half.isError).toBe(true);
    expect(await Group.countDocuments({ name: "Ghost Trip" })).toBe(0); // nothing half-made

    const found = await me.call("find_people", { query: "far" });
    expect(found.data.people).toEqual([expect.objectContaining({ name: "Farah", email: farah.email, isContact: true })]);
    // A stranger is only visible by exact email, and then masked.
    const stranger = await me.call("find_people", { query: omar.email });
    expect(stranger.data.people).toHaveLength(1);
    expect(stranger.data.people[0].email).not.toBe(omar.email);
    expect((await me.call("find_people", { query: "omar" })).data.people).toHaveLength(0);

    const privacy = await outsider.call("update_privacy_settings", { whoCanAddMe: "invite_only", findableByEmail: false });
    expect(privacy.data).toMatchObject({ whoCanAddMe: "invite_only", findableByEmail: false });
    expect((await outsider.call("get_privacy_settings")).data.findableByEmail).toBe(false);
    expect((await me.call("find_people", { query: omar.email })).data.people).toHaveLength(0);
  });

  test("join requests: list and approve as the creator", async () => {
    await me.call("create_group", { name: "Book Club", joinApproval: true });
    const link = await me.call("get_invite_link", { group: "Book Club" });
    const asked = await outsider.call("join_group", { invite: link.data.joinLink });
    expect(asked.data.pending).toBe(true);

    const waiting = await me.call("list_group_invites", { group: "Book Club" });
    expect(waiting.data.joinRequests).toHaveLength(1);
    expect(waiting.data.joinRequests[0].name).toBe("Omar");
    const ok = await me.call("manage_group_invite", { group: "Book Club", inviteId: String(waiting.data.joinRequests[0].inviteId), action: "approve" });
    expect(ok.isError).toBe(false);
    expect((await Group.findOne({ name: "Book Club" }).lean()).members.map(String)).toContain(String(omar._id));

    // Members who aren't the creator can't see or act on requests.
    const peek = await outsider.call("list_group_invites", { group: "Book Club" });
    expect(peek.isError).toBe(true);
    expect(peek.text).toMatch(/Only the creator/);
  });

  test("quick split: create, tick people off by name, delete", async () => {
    const made = await me.call("create_quick_split", { title: "Team lunch", totalAmount: 1000, people: [{ name: "Me" }, { name: "Aman" }, { name: "Riya" }] });
    expect(made.isError).toBe(false);
    expect(made.data.people.map((p) => p.share).reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 2);

    const mixed = await me.call("create_quick_split", { totalAmount: 500, people: [{ name: "A", amount: 200 }, { name: "B" }] });
    expect(mixed.isError).toBe(true);

    const one = await me.call("mark_quick_split_paid", { quickSplit: "team lunch", people: ["aman"] });
    expect(one.data.paidCount).toBe(1);
    expect(one.data.settled).toBe(false);
    const all = await me.call("mark_quick_split_paid", { quickSplit: "Team lunch", everyone: true });
    expect(all.data.settled).toBe(true);
    expect(all.data.stillToCollect).toBe(0);
    expect((await me.call("list_quick_splits", { status: "open" })).data.quickSplits).toHaveLength(0);

    // Someone else's quick split is invisible.
    expect((await friend.call("delete_quick_split", { quickSplit: String(made.data.id) })).isError).toBe(true);
    expect((await me.call("delete_quick_split", { quickSplit: "Team lunch" })).isError).toBe(false);
    expect(await QuickSplit.countDocuments({})).toBe(0);
  });

  test("notes, group chat, notifications and search", async () => {
    await tripWithFarah();
    const first = await me.call("add_note", { group: "Goa Trip", title: "Day 1: Baga beach", date: "2026-12-20" });
    expect(first.data).toMatchObject({ notepad: "Notes", notepadCreated: true, entryCount: 1 });
    const second = await friend.call("add_note", { group: "Goa Trip", title: "Day 2: Old Goa" });
    expect(second.data).toMatchObject({ notepadCreated: false, entryCount: 2 });
    const notes = await me.call("list_notes", { group: "Goa Trip" });
    expect(notes.data.notepads[0].entries.map((e) => e.title)).toEqual(["Day 1: Baga beach", "Day 2: Old Goa"]);
    expect((await outsider.call("list_notes", { group: "Goa Trip" })).isError).toBe(true);

    const sent = await me.call("send_group_message", { group: "Goa Trip", text: "Flights are booked" });
    expect(sent.isError).toBe(false);
    const chat = await friend.call("list_group_messages", { group: "Goa Trip" });
    expect(chat.data.messages).toEqual([expect.objectContaining({ from: "Meera", text: "Flights are booked" })]);
    expect(chat.data.unread).toBe(1);
    // Reading over MCP must not mark the message as seen.
    expect((await GroupMessage.findOne({}).lean()).seenBy.map(String)).toEqual([String(meera._id)]);
    expect((await outsider.call("send_group_message", { group: "Goa Trip", text: "hi" })).isError).toBe(true);

    await Notification.create([
      { userId: meera._id, message: "Farah added an expense", type: "expense" },
      { userId: meera._id, message: "Farah joined", type: "group" },
      { userId: farah._id, message: "not Meera's", type: "group" },
    ]);
    const unread = await me.call("list_notifications");
    expect(unread.data.unread).toBe(2);
    const one = await me.call("mark_notifications_read", { notificationId: String(unread.data.notifications[0].notificationId) });
    expect(one.data.marked).toBe(1);
    const theirs = await Notification.findOne({ userId: farah._id }).lean();
    expect((await me.call("mark_notifications_read", { notificationId: String(theirs._id) })).isError).toBe(true);
    expect((await me.call("mark_notifications_read")).data.marked).toBe(1);
    expect((await Notification.findOne({ userId: farah._id }).lean()).isRead).toBe(false);

    await me.call("add_expense", { group: "Goa Trip", description: "Parasailing", amount: 900 });
    const hit = await friend.call("search", { query: "parasail" });
    expect(hit.data.expenses).toEqual([expect.objectContaining({ description: "Parasailing", group: "Goa Trip" })]);
    expect((await outsider.call("search", { query: "parasail" })).data.expenses).toHaveLength(0);
  });

  test("a runaway loop of writes is stopped; reads are not", async () => {
    await tripWithFarah();
    let blocked = null;
    for (let k = 0; k < 70 && !blocked; k++) {
      const res = await me.call("add_note", { group: "Goa Trip", title: `Note ${k}` });
      if (res.isError) blocked = res;
    }
    expect(blocked.text).toMatch(/Too many changes in a short time/);
    expect((await me.call("list_groups")).isError).toBe(false);
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
