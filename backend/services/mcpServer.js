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
import { createWriteLimiter, fail, internalFail, withTimeout } from "./mcp/helpers.js";
import { registerAccountTools } from "./mcp/tools/account.js";
import { registerGroupTools } from "./mcp/tools/groups.js";
import { registerExpenseTools } from "./mcp/tools/expenses.js";
import { registerSettlementTools } from "./mcp/tools/settlements.js";
import { registerInviteTools } from "./mcp/tools/invites.js";
import { registerRecurringTools } from "./mcp/tools/recurring.js";
import { registerSmartTools, registerSmartPrompts } from "./mcp/tools/smart.js";
import { registerPeopleTools } from "./mcp/tools/people.js";
import { registerQuickSplitTools } from "./mcp/tools/quickSplit.js";
import { registerCollabTools } from "./mcp/tools/collab.js";

export const SERVER_VERSION = "3.0.0";

const envInt = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
// A tool that hangs would stall the assistant's whole turn; cut it off instead.
const TOOL_TIMEOUT_MS = envInt("MCP_TOOL_TIMEOUT_MS", 25_000);
const SLOW_TOOL_MS = 5_000;
// Shared across requests (the server itself is rebuilt per request).
export const writeLimiter = createWriteLimiter({ limit: envInt("MCP_WRITES_PER_MIN", 60) });

export const SERVER_INSTRUCTIONS = `SplitEase tracks shared expenses in groups (trips, flatmates, teams) and works out who owes whom.

How to use these tools well:
- Refer to groups and people the way the user does. Every "group" argument takes a group name or id, and member arguments take a name, an email or "me". Small typos are forgiven. If a tool says a name is ambiguous, ask the user which one they meant. Don't guess.
- For open-ended questions ("catch me up", "anything I need to pay?") call get_action_items first: it lists what to pay, confirm or answer, with the tool to use next.
- If you're unsure which group the user means, call list_groups first. To find a bill, person or group by a word, use search.
- add_expense always records the signed-in user as the payer. Nobody can log a bill in someone else's name. If someone else paid, they add it from their own account. To record money changing hands, use settle_up.
- Several bills at once (a list, a trip recap): use add_expenses, one call for up to 20 bills in the same group.
- Splits: no split details = the group's default split across all members. splitWith = a subset, split equally. splitType + splitDetails = exact amounts, percentages or shares. items = an itemised bill where each item is shared by the people who had it.
- Other currencies: pass currency and originalAmount. SplitEase looks up today's exchange rate by itself; pass fxRate only if the user gives their own rate. get_exchange_rate shows a rate without adding anything.
- Fixing mistakes: update_expense changes a bill's description, category or notes. To change an amount or split, delete_expense and add it again. Only the person who added a bill can change or delete it, and settle-up payments can't be deleted.
- People join with consent. add_members takes emails or the names of people the user already shares a group with; known contacts join directly, other SplitEase users get an invite they must accept, and unknown addresses get a join link by email. Report exactly what the tool says happened.
- settle_up: if the user says they paid someone, that person must confirm, so the payment stays pending until they do. If the user says someone paid them, it is recorded straight away.
- A one-off bill with people who are not in a group (dinner with colleagues): use create_quick_split, then mark_quick_split_paid as people pay.
- Confirm with the user before destructive tools: delete_group, delete_expense, remove_member, leave_group, delete_recurring_bill, delete_quick_split. Also ask before send_group_message, since it posts in the group chat under the user's name.
- When a group is completed or fully settled, SplitEase emails every member a PDF statement automatically. send_group_statement only re-sends it; get_statement_status shows who received it.
- Write tools return a "summary" sentence you can relay as-is. Changes show up live in the SplitEase web and mobile apps.
- If a tool says there were too many changes or that it timed out, don't retry in a loop. For a timeout, check whether the change went through first.`;

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
      const isWrite = def?.annotations?.readOnlyHint !== true;
      server.registerTool(name, def, async (args, extra) => {
        if (isWrite) {
          const slot = writeLimiter.take(uid);
          if (!slot.ok) {
            return fail(`Too many changes in a short time. Wait about ${slot.retryInSec} seconds, then continue. Nothing was changed by this call.`);
          }
        }
        const started = Date.now();
        try {
          return await withTimeout(
            Promise.resolve().then(() => handler(args || {}, extra)),
            TOOL_TIMEOUT_MS,
            () => {
              console.error(`❌ MCP tool ${name} timed out after ${TOOL_TIMEOUT_MS}ms`);
              return fail(
                isWrite
                  ? "This is taking longer than expected. It may still have gone through, so check (for example with list_expenses or get_group) before trying again."
                  : "This is taking longer than expected. Please try again in a moment.",
              );
            },
          );
        } catch (e) {
          return internalFail(name, e);
        } finally {
          const ms = Date.now() - started;
          if (ms >= SLOW_TOOL_MS) console.warn(`⏱️ MCP tool ${name} took ${ms}ms`);
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
  registerSmartTools(ctx);
  registerPeopleTools(ctx);
  registerQuickSplitTools(ctx);
  registerCollabTools(ctx);
  registerSmartPrompts(ctx);

  return server;
}
