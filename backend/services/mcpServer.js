/**
 * MCP server factory for the remote (HTTP) SplitEase MCP endpoint.
 *
 * Builds a per-request McpServer whose tools are scoped to one authenticated
 * user (`authedUser` — the same shape authMiddleware puts on req.user). Tools
 * read/write through the existing Mongoose models and the shared balance
 * computation, so behaviour matches the REST API exactly (including membership
 * checks). Nothing here trusts client-supplied identity — the user is fixed by
 * the verified Firebase token at the transport layer.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mongoose from "mongoose";
import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import User from "../models/userModel.js";
import { computeGroupBalances, buildSettlement } from "../controllers/balanceController.js";

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const sameId = (a, b) => String(a) === String(b);

/** Standard MCP text result. */
const ok = (data) => ({
  content: [
    { type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) },
  ],
});
const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

/** Load a group the user is a member of, or return null. */
async function memberGroup(groupId, userId) {
  if (!isObjectId(groupId)) return null;
  const group = await Group.findById(groupId).populate("members", "name email").lean();
  if (!group) return null;
  const member = (group.members || []).some((m) => sameId(m._id, userId));
  return member ? group : null;
}

/**
 * @param {{ id: string, email: string, name: string }} authedUser
 * @returns {McpServer}
 */
export function buildSplitEaseMcpServer(authedUser) {
  const server = new McpServer({ name: "splitease-mcp", version: "1.0.0" });
  const uid = authedUser.id;

  const objectId = z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Must be a 24-character MongoDB ObjectId.");

  // ── whoami ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_me",
    {
      title: "Get current user",
      description: "Get the authenticated SplitEase user's account (id, name, email).",
      inputSchema: {},
    },
    async () => {
      try {
        const user = await User.findById(uid).select("name email createdAt").lean();
        if (!user) return fail("User not found.");
        return ok({ id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });
      } catch (e) {
        return fail(e.message);
      }
    },
  );

  // ── groups ──────────────────────────────────────────────────────────────
  server.registerTool(
    "list_groups",
    {
      title: "List groups",
      description: "List all expense-sharing groups the current user belongs to.",
      inputSchema: {},
    },
    async () => {
      try {
        const groups = await Group.find({ members: uid })
          .populate("members", "name email")
          .sort({ updatedAt: -1 })
          .lean();
        return ok(
          groups.map((g) => ({
            id: g._id,
            name: g.name,
            groupType: g.groupType,
            isCompleted: g.isCompleted,
            memberCount: (g.members || []).length,
            members: (g.members || []).map((m) => ({ id: m._id, name: m.name, email: m.email })),
            updatedAt: g.updatedAt,
          })),
        );
      } catch (e) {
        return fail(e.message);
      }
    },
  );

  server.registerTool(
    "get_group",
    {
      title: "Get group details",
      description: "Get one group (members included) if you are a member.",
      inputSchema: { groupId: objectId },
    },
    async ({ groupId }) => {
      try {
        const group = await memberGroup(groupId, uid);
        if (!group) return fail("Group not found, or you are not a member.");
        return ok({
          id: group._id,
          name: group.name,
          groupType: group.groupType,
          isCompleted: group.isCompleted,
          members: (group.members || []).map((m) => ({ id: m._id, name: m.name, email: m.email })),
        });
      } catch (e) {
        return fail(e.message);
      }
    },
  );

  server.registerTool(
    "create_group",
    {
      title: "Create group",
      description: "Create a new group owned by the current user.",
      inputSchema: {
        name: z.string().min(2).max(100).describe("Group name."),
        groupType: z.enum(["trip", "roommate", "general"]).optional(),
      },
    },
    async ({ name, groupType }) => {
      try {
        const group = await Group.create({
          name: name.trim(),
          createdBy: uid,
          members: [uid],
          groupType: groupType || "general",
        });
        const populated = await Group.findById(group._id).populate("members", "name email").lean();
        return ok({ id: populated._id, name: populated.name, groupType: populated.groupType });
      } catch (e) {
        if (e?.code === 11000) return fail("You already have a group with this name.");
        return fail(e.message);
      }
    },
  );

  // ── expenses ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_expenses",
    {
      title: "List group expenses",
      description: "List all expenses in a group you belong to.",
      inputSchema: { groupId: objectId },
    },
    async ({ groupId }) => {
      try {
        const group = await memberGroup(groupId, uid);
        if (!group) return fail("Group not found, or you are not a member.");
        const expenses = await Expense.find({ groupId })
          .populate("paidBy", "name email")
          .sort({ date: -1 })
          .lean();
        return ok(
          expenses.map((x) => ({
            id: x._id,
            description: x.description,
            amount: x.amount,
            category: x.category,
            splitType: x.splitType,
            paidBy: x.paidBy ? { id: x.paidBy._id, name: x.paidBy.name } : null,
            date: x.date,
            isSettlement: x.isSettlement,
          })),
        );
      } catch (e) {
        return fail(e.message);
      }
    },
  );

  // ── balances ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_balances",
    {
      title: "Get group balances",
      description:
        "Get per-member net balances plus the minimal settle-up suggestions (who pays whom) for a group.",
      inputSchema: { groupId: objectId },
    },
    async ({ groupId }) => {
      try {
        const group = await memberGroup(groupId, uid);
        if (!group) return fail("Group not found, or you are not a member.");
        const computed = await computeGroupBalances(groupId);
        if (!computed) return fail("Group not found.");
        const { uniqueMembers, balances } = computed;
        const readable = uniqueMembers.map((m) => ({
          userId: m._id.toString(),
          name: m.name,
          email: m.email,
          balance: Number((balances[m._id.toString()] || 0).toFixed(2)),
        }));
        const suggestions = buildSettlement(balances).map((t) => {
          const from = uniqueMembers.find((m) => m._id.toString() === t.from);
          const to = uniqueMembers.find((m) => m._id.toString() === t.to);
          return {
            from: { name: from?.name, email: from?.email },
            to: { name: to?.name, email: to?.email },
            amount: t.amount,
          };
        });
        return ok({ balances: readable, suggestions });
      } catch (e) {
        return fail(e.message);
      }
    },
  );

  // ── overall summary across all groups ─────────────────────────────────────
  server.registerTool(
    "get_overall_summary",
    {
      title: "Get overall balance summary",
      description:
        "Summarise the current user's net balance across every group they belong to " +
        "(total you are owed, total you owe, and a per-group breakdown).",
      inputSchema: {},
    },
    async () => {
      try {
        const groups = await Group.find({ members: uid }).select("_id name").lean();
        let totalOwedToYou = 0;
        let totalYouOwe = 0;
        const perGroup = [];
        for (const g of groups) {
          const computed = await computeGroupBalances(g._id);
          if (!computed) continue;
          const bal = Number((computed.balances[uid] || 0).toFixed(2));
          if (bal > 0) totalOwedToYou += bal;
          else if (bal < 0) totalYouOwe += -bal;
          if (Math.abs(bal) >= 0.01) perGroup.push({ group: g.name, groupId: g._id, yourBalance: bal });
        }
        return ok({
          totalOwedToYou: Number(totalOwedToYou.toFixed(2)),
          totalYouOwe: Number(totalYouOwe.toFixed(2)),
          net: Number((totalOwedToYou - totalYouOwe).toFixed(2)),
          groups: perGroup,
        });
      } catch (e) {
        return fail(e.message);
      }
    },
  );

  return server;
}
