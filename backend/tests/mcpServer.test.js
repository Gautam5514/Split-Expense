// Tests the remote MCP server factory (services/mcpServer.js): each tool's
// behaviour, membership enforcement, and error handling — against fake models
// (see tests/helpers/fakeModel.js; no real MongoDB in this sandbox).
//
// We call the registered tool handlers directly by capturing them as they are
// registered on a stub McpServer, so we exercise the exact tool logic without
// standing up a transport.
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeFakeModel } from "./helpers/fakeModel.js";

const oid = () => new mongoose.Types.ObjectId();

// ── fake models ────────────────────────────────────────────────────────────
const fakeUserModel = makeFakeModel([]);
const fakeGroupModel = makeFakeModel([], { members: fakeUserModel, paidBy: fakeUserModel });
const fakeExpenseModel = makeFakeModel([], { paidBy: fakeUserModel });
const fakeSettlementModel = makeFakeModel([], { fromUserId: fakeUserModel, toUserId: fakeUserModel, groupId: fakeGroupModel });

// balanceController is mocked so we control computeGroupBalances/buildSettlement
const fakeComputeGroupBalances = jest.fn();
const fakeBuildSettlement = jest.fn(() => []);

// ── capture tools as the factory registers them on McpServer ─────────────────
const registered = new Map();
const registeredPrompts = new Map();
class StubMcpServer {
  constructor(info) { this.info = info; }
  registerTool(name, def, handler) { registered.set(name, { def, handler }); }
  registerPrompt(name, def, handler) { registeredPrompts.set(name, { def, handler }); }
  connect() {}
  close() {}
}

jest.unstable_mockModule("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: StubMcpServer,
}));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: fakeUserModel }));
jest.unstable_mockModule("../models/groupModel.js", () => ({ default: fakeGroupModel }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: fakeExpenseModel }));
jest.unstable_mockModule("../models/settlementRequestModel.js", () => ({ default: fakeSettlementModel }));
// Write tools run the REST controllers through services/mcp/bridge.js; here a
// fake controller module stands in (tests/mcpTools.int.test.js covers the real
// controllers against MongoDB).
const fakeCreateGroup = jest.fn(async (req, res) => {
  const { name, groupType } = req.body;
  if (fakeGroupModel._docs.some((g) => g.name === name && String(g.createdBy) === req.user.id)) {
    return res.status(409).json({ message: "You already have a group with this name. Please choose another name." });
  }
  const group = await fakeGroupModel.create({ name, groupType, createdBy: req.user.id, members: [req.user.id], settings: {} });
  return res.status(201).json(group);
});
const fakeGetMyInvites = jest.fn(async (req, res) => res.json([]));
jest.unstable_mockModule("../services/mcp/controllers.js", () => ({ createGroup: fakeCreateGroup, getMyInvites: fakeGetMyInvites }));
jest.unstable_mockModule("../controllers/balanceController.js", () => ({
  computeGroupBalances: fakeComputeGroupBalances,
  buildSettlement: fakeBuildSettlement,
}));

const { buildSplitEaseMcpServer } = await import("../services/mcpServer.js");

// Helper: build a server for a user, then invoke a tool by name.
const callTool = async (userId, name, args = {}) => {
  registered.clear();
  buildSplitEaseMcpServer({ id: String(userId), email: "u@e.com", name: "U" });
  const tool = registered.get(name);
  if (!tool) throw new Error(`tool ${name} not registered`);
  return tool.handler(args);
};

// Parse a tool result's JSON text payload.
const payload = (res) => JSON.parse(res.content[0].text);

beforeEach(() => {
  [fakeUserModel, fakeGroupModel, fakeExpenseModel, fakeSettlementModel].forEach((m) => { m._docs.length = 0; });
  fakeComputeGroupBalances.mockReset();
  fakeBuildSettlement.mockReset().mockReturnValue([]);
});

describe("tool registration", () => {
  test("registers the full SplitEase tool set", () => {
    registered.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    expect([...registered.keys()].sort()).toEqual(
      [
        "get_me", "get_overall_summary", "get_spending_insights", "ping",
        "list_groups", "get_group", "create_group", "update_group_settings", "add_members", "remove_member",
        "get_invite_link", "join_group", "complete_group", "leave_group", "delete_group",
        "add_expense", "list_expenses", "get_expense", "get_group_summary",
        "get_balances", "settle_up", "list_pending_settlements", "respond_to_settlement",
        "list_my_invites", "respond_to_invite",
        "list_recurring_bills", "add_recurring_bill", "update_recurring_bill", "delete_recurring_bill",
        "get_action_items", "send_group_statement", "get_statement_status", "retry_failed_statements",
      ].sort(),
    );
  });

  test("registers ready-made prompts", () => {
    registeredPrompts.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    expect([...registeredPrompts.keys()].sort()).toEqual(["catch_me_up", "monthly_review", "settle_up", "split_a_bill", "wrap_up_trip"]);
    const text = registeredPrompts.get("split_a_bill").handler({ details: "Dinner 900 in Goa" }).messages[0].content.text;
    expect(text).toContain("Dinner 900 in Goa");
  });

  test("every tool declares annotations; destructive ones are flagged", () => {
    registered.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    for (const [name, { def }] of registered) {
      expect(def.annotations).toBeDefined();
      expect(typeof def.description).toBe("string");
      // get_invite_link creates (or resets) the link, so it is rightly a write.
      const readName = (name.startsWith("get_") || name.startsWith("list_")) && name !== "get_invite_link";
      if (readName) expect(def.annotations.readOnlyHint).toBe(true);
    }
    for (const name of ["delete_group", "remove_member", "leave_group", "delete_recurring_bill"]) {
      expect(registered.get(name).def.annotations.destructiveHint).toBe(true);
    }
  });
});

describe("get_me", () => {
  test("returns the current user's account", async () => {
    const uid = oid();
    fakeUserModel.__addDoc({ _id: uid, name: "Alice", email: "alice@e.com", createdAt: new Date("2020-01-01") });
    const res = await callTool(uid, "get_me");
    expect(res.isError).toBeFalsy();
    const me = payload(res);
    expect(me.name).toBe("Alice");
    expect(me.email).toBe("alice@e.com");
  });

  test("errors cleanly when the user does not exist", async () => {
    const res = await callTool(oid(), "get_me");
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/not found/i);
  });
});

describe("list_groups", () => {
  test("returns only the groups the user is a member of", async () => {
    const uid = oid();
    fakeUserModel.__addDoc({ _id: uid, name: "Alice", email: "alice@e.com" });
    fakeGroupModel.__addDoc({ _id: oid(), name: "Trip", members: [uid], groupType: "trip", isCompleted: false, updatedAt: new Date() });
    fakeGroupModel.__addDoc({ _id: oid(), name: "Other", members: [oid()], groupType: "general", isCompleted: false, updatedAt: new Date() });
    const res = await callTool(uid, "list_groups");
    const groups = payload(res);
    expect(Array.isArray(groups)).toBe(true);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Trip");
    expect(groups[0].memberCount).toBe(1);
  });

  test("returns an empty array when the user has no groups", async () => {
    const res = await callTool(oid(), "list_groups");
    expect(payload(res)).toEqual([]);
  });
});

describe("get_group", () => {
  test("returns the group when the user is a member", async () => {
    const uid = oid();
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [uid], groupType: "trip", isCompleted: false });
    const res = await callTool(uid, "get_group", { group: gid.toString() });
    expect(res.isError).toBeFalsy();
    expect(payload(res).name).toBe("Trip");
  });

  test("rejects a non-member with a clean error (no data leak)", async () => {
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Secret", members: [oid()] });
    const res = await callTool(oid(), "get_group", { group: gid.toString() });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/not a member|not found/i);
  });

  test("errors on an unknown group id", async () => {
    const res = await callTool(oid(), "get_group", { group: oid().toString() });
    expect(res.isError).toBe(true);
  });
});

describe("create_group", () => {
  test("creates a group owned by the current user (through the createGroup controller)", async () => {
    const uid = oid();
    const res = await callTool(uid, "create_group", { name: "New Trip", groupType: "trip" });
    expect(res.isError).toBeFalsy();
    expect(payload(res).name).toBe("New Trip");
    expect(payload(res).summary).toMatch(/Created trip group "New Trip"/);
    expect(fakeCreateGroup.mock.calls[0][0].user.id).toBe(String(uid));
    // stored with the user as creator + member
    expect(fakeGroupModel._docs).toHaveLength(1);
    expect(String(fakeGroupModel._docs[0].createdBy)).toBe(String(uid));
    expect(fakeGroupModel._docs[0].members.map(String)).toContain(String(uid));
  });

  test("surfaces a friendly duplicate-name error", async () => {
    const uid = oid();
    await callTool(uid, "create_group", { name: "Dup" });
    const res = await callTool(uid, "create_group", { name: "Dup" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/already have a group/i);
  });
});

describe("list_expenses", () => {
  test("returns expenses for a member's group", async () => {
    const uid = oid();
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [uid] });
    fakeExpenseModel.__addDoc({ _id: oid(), groupId: gid, description: "Dinner", amount: 900, category: "food", splitType: "equal", paidBy: uid, date: new Date(), isSettlement: false });
    const res = await callTool(uid, "list_expenses", { group: gid.toString() });
    const list = payload(res);
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe("Dinner");
    expect(list[0].amount).toBe(900);
  });

  test("rejects a non-member", async () => {
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [oid()] });
    const res = await callTool(oid(), "list_expenses", { group: gid.toString() });
    expect(res.isError).toBe(true);
  });
});

describe("get_balances", () => {
  test("returns readable balances + settle-up suggestions", async () => {
    const uid = oid();
    const other = oid();
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [uid, other] });
    fakeComputeGroupBalances.mockResolvedValue({
      uniqueMembers: [
        { _id: uid, name: "Alice", email: "a@e.com" },
        { _id: other, name: "Bob", email: "b@e.com" },
      ],
      balances: { [uid.toString()]: 450, [other.toString()]: -450 },
    });
    fakeBuildSettlement.mockReturnValue([{ from: other.toString(), to: uid.toString(), amount: 450 }]);
    const res = await callTool(uid, "get_balances", { group: gid.toString() });
    const out = payload(res);
    expect(out.balances).toHaveLength(2);
    expect(out.suggestions[0].amount).toBe(450);
    expect(out.suggestions[0].to.name).toBe("Alice");
  });

  test("rejects a non-member before computing", async () => {
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [oid()] });
    const res = await callTool(oid(), "get_balances", { group: gid.toString() });
    expect(res.isError).toBe(true);
    expect(fakeComputeGroupBalances).not.toHaveBeenCalled();
  });
});

describe("get_overall_summary", () => {
  test("aggregates the user's net across all their groups", async () => {
    const uid = oid();
    const g1 = oid();
    const g2 = oid();
    fakeGroupModel.__addDoc({ _id: g1, name: "Trip", members: [uid] });
    fakeGroupModel.__addDoc({ _id: g2, name: "Flat", members: [uid] });
    fakeComputeGroupBalances.mockImplementation(async (groupId) => {
      const bal = String(groupId) === String(g1) ? 300 : -120;
      return { uniqueMembers: [{ _id: uid, name: "A", email: "a@e.com" }], balances: { [uid.toString()]: bal } };
    });
    const res = await callTool(uid, "get_overall_summary");
    const out = payload(res);
    expect(out.totalOwedToYou).toBe(300);
    expect(out.totalYouOwe).toBe(120);
    expect(out.net).toBe(180);
    expect(out.groups).toHaveLength(2);
  });
});

// ── hardening added with the OAuth work ─────────────────────────────────────
describe("tool hardening", () => {
  test("create_group's schema trims the name before enforcing the 2-char minimum", () => {
    registered.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    const schema = registered.get("create_group").def.inputSchema.name;
    expect(schema.safeParse("   a   ").success).toBe(false);
    expect(schema.safeParse("  ab  ")).toMatchObject({ success: true, data: "ab" });
    expect(schema.safeParse("x".repeat(101)).success).toBe(false);
  });

  test("unexpected database errors are logged, not leaked to the client", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    fakeGroupModel.create.mockRejectedValueOnce(new Error("E11000 collection: prod.groups index: secret_idx_1 dup key"));
    const res = await callTool(oid(), "create_group", { name: "Boom" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).not.toMatch(/E11000|secret_idx|prod\.groups/);
    expect(res.content[0].text).toMatch(/something went wrong/i);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("list_expenses validates `limit` (1-500, integer)", () => {
    registered.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    const limit = registered.get("list_expenses").def.inputSchema.limit;
    expect(limit.safeParse(0).success).toBe(false);
    expect(limit.safeParse(501).success).toBe(false);
    expect(limit.safeParse(1.5).success).toBe(false);
    expect(limit.safeParse(500).success).toBe(true);
    expect(limit.safeParse(undefined).success).toBe(true);
  });

  test("group arguments accept a name or id but are bounded strings (no objects / operators)", () => {
    registered.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    const ref = registered.get("get_group").def.inputSchema.group;
    for (const bad of ["", "   ", { $ne: null }, ["a"], "a".repeat(201)]) {
      expect(ref.safeParse(bad).success).toBe(false);
    }
    expect(ref.safeParse("Goa Trip").success).toBe(true);
    expect(ref.safeParse("a".repeat(24)).success).toBe(true);
    const expenseId = registered.get("get_expense").def.inputSchema.expenseId;
    expect(expenseId.safeParse("123").success).toBe(false);
  });

  test("get_overall_summary handles many groups (batched) and skips groups with no data", async () => {
    const uid = oid();
    const ids = Array.from({ length: 12 }, () => oid());
    ids.forEach((id, i) => fakeGroupModel.__addDoc({ _id: id, name: `G${i}`, members: [uid] }));
    fakeComputeGroupBalances.mockImplementation(async (gid) => {
      if (String(gid) === String(ids[3])) return null; // vanished group
      return { uniqueMembers: [], balances: { [uid.toString()]: 10 } };
    });
    const out = payload(await callTool(uid, "get_overall_summary"));
    expect(fakeComputeGroupBalances).toHaveBeenCalledTimes(12);
    expect(out.totalOwedToYou).toBe(110);
    expect(out.groups).toHaveLength(11);
  });

  test("get_overall_summary tolerates sub-cent balances and a user with no groups", async () => {
    const uid = oid();
    expect(payload(await callTool(uid, "get_overall_summary"))).toMatchObject({ totalOwedToYou: 0, totalYouOwe: 0, net: 0, groups: [] });
    fakeGroupModel.__addDoc({ _id: oid(), name: "Tiny", members: [uid] });
    fakeComputeGroupBalances.mockResolvedValue({ uniqueMembers: [], balances: { [uid.toString()]: 0.004 } });
    expect(payload(await callTool(uid, "get_overall_summary")).groups).toEqual([]);
  });

  test("tools only ever act as the authenticated user (a spoofed userId argument has no effect)", async () => {
    const me = oid();
    const victim = oid();
    fakeGroupModel.__addDoc({ _id: oid(), name: "VictimGroup", members: [victim] });
    const res = await callTool(me, "list_groups", { userId: String(victim) });
    expect(payload(res)).toEqual([]);
  });
});

describe("get_action_items", () => {
  test("says what to pay, what is owed, and what to confirm, most urgent first", async () => {
    const uid = oid(); const bob = oid(); const cara = oid(); const gid = oid();
    fakeUserModel.__addDoc({ _id: uid, name: "Alice" });
    fakeUserModel.__addDoc({ _id: bob, name: "Bob" });
    fakeUserModel.__addDoc({ _id: cara, name: "Cara" });
    fakeGroupModel.__addDoc({ _id: gid, name: "Goa", members: [uid, bob, cara], createdBy: bob, settings: { currency: "INR" } });
    fakeComputeGroupBalances.mockResolvedValue({
      uniqueMembers: [{ _id: uid, name: "Alice" }, { _id: bob, name: "Bob" }, { _id: cara, name: "Cara" }],
      balances: { [uid]: -200, [bob]: 500, [cara]: -300 },
    });
    fakeBuildSettlement.mockReturnValue([
      { from: String(uid), to: String(bob), amount: 200 },
      { from: String(cara), to: String(bob), amount: 300 },
    ]);
    fakeSettlementModel.__addDoc({ _id: oid(), status: "pending", fromUserId: bob, toUserId: uid, groupId: gid, initiatedBy: bob, amount: 50 });
    const out = payload(await callTool(uid, "get_action_items"));
    expect(out.needsAttention).toBe(2);
    expect(out.items[0].next.tool).toBe("respond_to_settlement");
    expect(out.items[1].what).toContain("You owe Bob");
    expect(out.items[1].next.args).toMatchObject({ with: "Bob", direction: "i_paid_them", amount: 200 });
  });

  test("an empty account is all caught up", async () => {
    const out = payload(await callTool(oid(), "get_action_items"));
    expect(out.needsAttention).toBe(0);
    expect(out.summary).toMatch(/caught up/i);
  });
});
