// "Smart" tools: things an assistant can do in one call that would otherwise
// take several (what needs my attention, who should I pay), plus the group
// statement email and ready-made prompts for the common chat workflows.
import Expense from "../../../models/expenseModel.js";
import Group from "../../../models/groupModel.js";
import SettlementRequest from "../../../models/settlementRequestModel.js";
import { computeGroupBalances, buildSettlement } from "../../../controllers/balanceController.js";
import { currencyOf, money, ok, READ, round2, WRITE } from "../helpers.js";

const idOf = (v) => String(v?._id ?? v);
const CONCURRENCY = 5;
const MAX_GROUPS = 60;

export function registerSmartTools(ctx) {
  const { tool, uid, z, groupRef } = ctx;

  // ── what needs my attention ─────────────────────────────────────────────
  tool(
    "get_action_items",
    {
      title: "What needs my attention",
      description:
        "One call that answers \"what should I do in SplitEase?\": payments waiting for the user to confirm, group invites, " +
        "who the user should pay (the simplest payments per group), who should pay the user, and groups the user created that are " +
        "fully settled and can be completed. Each item says which tool to use next. Start here for open-ended questions like " +
        "\"anything I need to pay?\" or \"catch me up\".",
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const groups = await Group.find({ members: uid, isCompleted: { $ne: true } })
        .select("name settings createdBy")
        .sort({ updatedAt: -1 })
        .limit(MAX_GROUPS)
        .lean();

      const items = [];
      const youShouldPay = [];
      const owedToYou = [];
      const readyToComplete = [];

      for (let i = 0; i < groups.length; i += CONCURRENCY) {
        const batch = groups.slice(i, i + CONCURRENCY);
        const computed = await Promise.all(batch.map((g) => computeGroupBalances(g._id)));
        for (let k = 0; k < batch.length; k++) {
          const g = batch[k];
          const data = computed[k];
          if (!data) continue;
          const names = Object.fromEntries(data.uniqueMembers.map((m) => [idOf(m), m.name]));
          const currency = currencyOf(g);
          const transfers = buildSettlement(data.balances);
          for (const t of transfers) {
            if (t.from === uid) youShouldPay.push({ group: g.name, to: names[t.to] || "Member", amount: t.amount, currency });
            else if (t.to === uid) owedToYou.push({ group: g.name, from: names[t.from] || "Member", amount: t.amount, currency });
          }
          if (!transfers.length && idOf(g.createdBy) === uid) {
            if (await Expense.exists({ groupId: g._id, isSettlement: { $ne: true } })) readyToComplete.push(g.name);
          }
        }
      }

      const pending = await SettlementRequest.find({ status: "pending", $or: [{ fromUserId: uid }, { toUserId: uid }] })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("fromUserId", "name")
        .populate("toUserId", "name")
        .populate("groupId", "name settings")
        .lean();
      const toConfirm = pending.filter((p) => idOf(p.initiatedBy) !== uid);
      const waiting = pending.filter((p) => idOf(p.initiatedBy) === uid);

      for (const p of toConfirm) {
        items.push({
          priority: 1,
          what: `${p.fromUserId?.name || "Someone"} says they paid you ${money(p.amount, p.groupId?.settings?.currency)} in "${p.groupId?.name}". Confirm if you received it.`,
          next: { tool: "respond_to_settlement", args: { requestId: String(p._id), action: "confirm | reject" } },
        });
      }
      const invites = await ctx.call("getMyInvites");
      if (!invites.error) {
        for (const inv of invites.data || []) {
          items.push({
            priority: 2,
            what: `${inv.invitedBy?.name || "Someone"} invited you to "${inv.group?.name}".`,
            next: { tool: "respond_to_invite", args: { inviteId: String(inv._id), action: "accept | decline" } },
          });
        }
      }
      for (const p of youShouldPay) {
        items.push({
          priority: 3,
          what: `You owe ${p.to} ${money(p.amount, p.currency)} in "${p.group}".`,
          next: { tool: "settle_up", args: { group: p.group, with: p.to, direction: "i_paid_them", amount: p.amount } },
        });
      }
      for (const p of owedToYou) {
        items.push({ priority: 4, what: `${p.from} owes you ${money(p.amount, p.currency)} in "${p.group}".`, next: null });
      }
      for (const name of readyToComplete) {
        items.push({
          priority: 5,
          what: `"${name}" is fully settled. You can mark it completed (this also emails everyone the final statement).`,
          next: { tool: "complete_group", args: { group: name } },
        });
      }
      items.sort((a, b) => a.priority - b.priority);

      return ok({
        needsAttention: items.length,
        items: items.map(({ priority, ...rest }) => rest),
        waitingOnOthers: waiting.map((p) => ({
          group: p.groupId?.name,
          to: p.toUserId?.name,
          amount: round2(p.amount),
          note: "You marked this as paid; they have not confirmed yet.",
        })),
        summary: items.length
          ? `${items.length} thing${items.length === 1 ? "" : "s"} need${items.length === 1 ? "s" : ""} your attention.`
          : "You're all caught up - nothing to pay, confirm or answer.",
      });
    },
  );

  // ── settlement statement email ──────────────────────────────────────────
  tool(
    "send_group_statement",
    {
      title: "Email the group statement",
      description:
        "Creator only. Emails every member a PDF settlement statement (who paid what, who owes whom). Works once the group is " +
        "completed or fully settled. The statement is also sent automatically when a group is completed or settled, so only use " +
        "this to send it again. Ask the user before sending.",
      inputSchema: { group: groupRef },
      annotations: WRITE,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("resendGroupReport", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      return ok({ group: r.group.name, recipients: res.data?.recipients, summary: res.data?.message || "Statement is being emailed." });
    },
  );

  tool(
    "get_statement_status",
    {
      title: "Statement email status",
      description:
        "Who has received the group's settlement statement email, who is still queued, and who failed. Any member can check; " +
        "only the creator sees email addresses and error details.",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("getGroupReportStatus", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      const latest = res.data?.latest;
      if (!latest) return ok({ group: r.group.name, sent: false, summary: "No statement has been sent for this group yet." });
      const failed = (latest.recipients || []).filter((x) => x.status === "failed").length;
      return ok({
        group: r.group.name,
        status: latest.status,
        reason: latest.reason,
        recipients: latest.recipients,
        summary: failed
          ? `${failed} member${failed === 1 ? "" : "s"} did not receive the statement. The creator can use retry_failed_statements.`
          : `Statement status: ${latest.status}.`,
      });
    },
  );

  tool(
    "retry_failed_statements",
    {
      title: "Retry failed statement emails",
      description: "Creator only. Re-tries the members the latest statement email could not reach.",
      inputSchema: { group: groupRef },
      annotations: WRITE,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("retryGroupReport", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      return ok({ group: r.group.name, retried: res.data?.retried, summary: res.data?.message || "Retrying." });
    },
  );
}

// Prompts show up as one-click starters in clients that support them (Claude,
// some IDEs). Each one just tells the assistant which tools to chain.
export function registerSmartPrompts(ctx) {
  const { server, z } = ctx;
  const user = (text) => ({ messages: [{ role: "user", content: { type: "text", text } }] });

  server.registerPrompt(
    "catch_me_up",
    { title: "Catch me up", description: "What do I owe, what am I owed, and what needs my action?" },
    () => user("Use get_action_items and tell me, briefly and in plain language, what I need to pay, confirm or answer in SplitEase. Lead with the most urgent item."),
  );
  server.registerPrompt(
    "split_a_bill",
    {
      title: "Split a bill",
      description: "Add a bill I paid to a group and split it.",
      argsSchema: { details: z.string().describe('For example "Dinner 1800 in Goa trip, split with Aman and Riya"') },
    },
    ({ details }) =>
      user(`Add this bill to SplitEase: ${details}\nResolve the group and people by name, use add_expense, and if anything is unclear (amount, group, who shares it) ask me one short question first. Then tell me each person's share.`),
  );
  server.registerPrompt(
    "settle_up",
    {
      title: "Settle up a group",
      description: "Show the simplest payments to clear a group.",
      argsSchema: { group: z.string().describe("Group name") },
    },
    ({ group }) =>
      user(`Use get_balances for "${group}" and explain who should pay whom, with the fewest payments. Do not record any payment unless I say I paid or was paid.`),
  );
  server.registerPrompt(
    "wrap_up_trip",
    {
      title: "Wrap up a trip",
      description: "Check a group is settled, then complete it and email everyone the statement.",
      argsSchema: { group: z.string().describe("Group name") },
    },
    ({ group }) =>
      user(`Wrap up "${group}": check get_balances. If people still owe money, list the payments and stop. If it is fully settled, ask me to confirm, then use complete_group (it emails everyone the final statement automatically) and tell me when it is done.`),
  );
  server.registerPrompt(
    "monthly_review",
    { title: "Monthly spending review", description: "Where did my money go?" },
    () => user("Use get_spending_insights and get_overall_summary. Give me a short review: my top categories, anything unusual, and my net position across groups."),
  );
}
