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

// balanceController is mocked so we control computeGroupBalances/buildSettlement
const fakeComputeGroupBalances = jest.fn();
const fakeBuildSettlement = jest.fn(() => []);

// ── capture tools as the factory registers them on McpServer ─────────────────
const registered = new Map();
class StubMcpServer {
  constructor(info) { this.info = info; }
  registerTool(name, def, handler) { registered.set(name, { def, handler }); }
  connect() {}
  close() {}
}

jest.unstable_mockModule("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: StubMcpServer,
}));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: fakeUserModel }));
jest.unstable_mockModule("../models/groupModel.js", () => ({ default: fakeGroupModel }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: fakeExpenseModel }));
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
  [fakeUserModel, fakeGroupModel, fakeExpenseModel].forEach((m) => { m._docs.length = 0; });
  fakeComputeGroupBalances.mockReset();
  fakeBuildSettlement.mockReset().mockReturnValue([]);
});

describe("tool registration", () => {
  test("registers exactly the expected 7 tools", () => {
    registered.clear();
    buildSplitEaseMcpServer({ id: String(oid()), email: "u@e.com", name: "U" });
    expect([...registered.keys()].sort()).toEqual(
      [
        "create_group",
        "get_balances",
        "get_group",
        "get_me",
        "get_overall_summary",
        "list_expenses",
        "list_groups",
      ].sort(),
    );
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
    const res = await callTool(uid, "get_group", { groupId: gid.toString() });
    expect(res.isError).toBeFalsy();
    expect(payload(res).name).toBe("Trip");
  });

  test("rejects a non-member with a clean error (no data leak)", async () => {
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Secret", members: [oid()] });
    const res = await callTool(oid(), "get_group", { groupId: gid.toString() });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/not a member|not found/i);
  });

  test("errors on an unknown group id", async () => {
    const res = await callTool(oid(), "get_group", { groupId: oid().toString() });
    expect(res.isError).toBe(true);
  });
});

describe("create_group", () => {
  test("creates a group owned by the current user", async () => {
    const uid = oid();
    const res = await callTool(uid, "create_group", { name: "New Trip", groupType: "trip" });
    expect(res.isError).toBeFalsy();
    expect(payload(res).name).toBe("New Trip");
    // stored with the user as creator + member
    expect(fakeGroupModel._docs).toHaveLength(1);
    expect(String(fakeGroupModel._docs[0].createdBy)).toBe(String(uid));
    expect(fakeGroupModel._docs[0].members.map(String)).toContain(String(uid));
  });

  test("surfaces a friendly duplicate-name error", async () => {
    const uid = oid();
    fakeGroupModel.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: 11000 }));
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
    const res = await callTool(uid, "list_expenses", { groupId: gid.toString() });
    const list = payload(res);
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe("Dinner");
    expect(list[0].amount).toBe(900);
  });

  test("rejects a non-member", async () => {
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [oid()] });
    const res = await callTool(oid(), "list_expenses", { groupId: gid.toString() });
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
    const res = await callTool(uid, "get_balances", { groupId: gid.toString() });
    const out = payload(res);
    expect(out.balances).toHaveLength(2);
    expect(out.suggestions[0].amount).toBe(450);
    expect(out.suggestions[0].to.name).toBe("Alice");
  });

  test("rejects a non-member before computing", async () => {
    const gid = oid();
    fakeGroupModel.__addDoc({ _id: gid, name: "Trip", members: [oid()] });
    const res = await callTool(oid(), "get_balances", { groupId: gid.toString() });
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
