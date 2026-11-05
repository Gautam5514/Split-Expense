/**
 * MCP server factory for the remote (HTTP) SplitEase MCP endpoint.
 *
 * Builds a per-request McpServer whose tools are scoped to one authenticated
 * user (`authedUser` - the same shape authMiddleware puts on req.user). Lets
 * ChatGPT, Claude, Gemini and any other MCP client run SplitEase end to end:
 * create and manage groups, add bills, settle up, handle invites and monthly
 * bills.
 *
 * Design:
 *  - Write tools call the SAME controllers the web and app use
 *    (services/mcp/bridge.js), so every rule, notification and live update is
 *    identical - a bill added from a chat shows up instantly in the app.
 *  - Groups and people can be named the way a person talks ("Goa trip",
 *    "Rahul", "me"); ambiguity comes back as a question, never a guess.
 *  - Identity comes only from the verified credential at the transport layer.
 *    No tool accepts a user id to act as.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { invokeController, loadControllers } from "./mcp/bridge.js";
import { resolveGroup } from "./mcp/resolve.js";
import { fail, internalFail } from "./mcp/helpers.js";
import { registerAccountTools } from "./mcp/tools/account.js";
import { registerGroupTools } from "./mcp/tools/groups.js";
import { registerExpenseTools } from "./mcp/tools/expenses.js";
import { registerSettlementTools } from "./mcp/tools/settlements.js";
import { registerInviteTools } from "./mcp/tools/invites.js";
import { registerRecurringTools } from "./mcp/tools/recurring.js";

export const SERVER_VERSION = "2.0.0";

export const SERVER_INSTRUCTIONS = `SplitEase tracks shared expenses in groups (trips, flatmates, teams) and works out who owes whom.

How to use these tools well:
- Refer to groups and people the way the user does. Every "group" argument takes a group name or id, and member arguments take a name, an email or "me". If a tool says a name is ambiguous, ask the user which one they meant. Don't guess.
- If you're unsure which group the user means, call list_groups first.
- add_expense always records the signed-in user as the payer. Nobody can log a bill in someone else's name. If someone else paid, they add it from their own account. To record money changing hands, use settle_up.
- Amounts are in the group's currency (get_group shows it). For a bill in another currency, pass currency, originalAmount and fxRate. Don't invent an exchange rate; ask the user for it.
- With no split details, a bill uses the group's default split across all members. Use splitWith for a subset of people, and splitType + splitDetails for exact amounts, percentages or shares.
- People join with consent. add_members adds known contacts directly, sends other SplitEase users an invite they must accept, and emails a join link to unknown addresses. Report exactly what the tool says happened.
- settle_up: if the user says they paid someone, that person must confirm, so the payment stays pending until they do. If the user says someone paid them, it is recorded straight away.
- Confirm with the user before destructive tools: delete_group, remove_member, leave_group, delete_recurring_bill.
- Write tools return a "summary" sentence you can relay as-is. Changes show up live in the SplitEase web and mobile apps.`;

/**
 * @param {{ id: string, email: string, name: string, firebaseUid?: string }} authedUser
 * @returns {McpServer}
 */
export function buildSplitEaseMcpServer(authedUser) {
  const server = new McpServer(
    { name: "splitease-mcp", version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );
  const uid = String(authedUser.id);

  const ctx = {
    server,
    z,
    uid,
    user: authedUser,

    /** Accepts a group name or id. */
    groupRef: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe('Group name (e.g. "Goa trip") or its id.'),

    memberRef: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe('A member: their name, email, or "me".'),

    objectId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Must be a 24-character id."),

    /**
     * Register a tool with uniform error handling: an unexpected throw is
     * logged and reported generically, never leaked.
     */
    tool(name, def, handler) {
      server.registerTool(name, def, async (args, extra) => {
        try {
          return await handler(args || {}, extra);
        } catch (e) {
          return internalFail(name, e);
        }
      });
    },

    /** Resolve a group the user belongs to, or a ready-made error result. */
    async group(ref) {
      const r = await resolveGroup(ref, uid);
      return r.error ? { error: fail(r.error) } : r;
    },

    /**
     * Run a REST controller as this user. 4xx -> { error } carrying the
     * controller's own (user-safe) message; 5xx -> thrown (logged, generic).
     */
    async call(name, { params = {}, body = {}, query = {} } = {}) {
      const controllers = await loadControllers();
      const handler = controllers[name];
      if (typeof handler !== "function") throw new Error(`Unknown controller ${name}`);
      const { status, data } = await invokeController(handler, { user: authedUser, params, body, query });
      if (status >= 500) throw new Error(`${name} -> ${status}: ${data?.message || "server error"}`);
      if (status >= 400) {
        return { error: fail(data?.message || "That request was not accepted."), status, data };
      }
      return { status, data };
    },

    async controllers() {
      return loadControllers();
    },
  };

  registerAccountTools(ctx);
  registerGroupTools(ctx);
  registerExpenseTools(ctx);
  registerSettlementTools(ctx);
  registerInviteTools(ctx);
  registerRecurringTools(ctx);

  return server;
}
