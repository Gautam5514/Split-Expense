import SettlementRequest from "../../../models/settlementRequestModel.js";
import { computeGroupBalances, buildSettlement } from "../../../controllers/balanceController.js";
import { resolveMember } from "../resolve.js";
import { currencyOf, fail, money, ok, READ, round2, WRITE } from "../helpers.js";

const idOf = (v) => String(v?._id ?? v);

export function registerSettlementTools(ctx) {
  const { tool, uid, z, groupRef, memberRef, objectId } = ctx;

  tool(
    "get_balances",
    {
      title: "Get group balances",
      description:
        "Who owes whom in a group: each member's net balance (positive = is owed, negative = owes), the fewest payments " +
        "that settle everyone up, and what you specifically owe or are owed.",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const g = r.group;
      const computed = await computeGroupBalances(g._id);
      if (!computed) return fail("Group not found.");
      const { uniqueMembers, balances } = computed;
      const currency = currencyOf(g);
      const find = (id) => uniqueMembers.find((m) => m._id.toString() === String(id));

      const readable = uniqueMembers.map((m) => ({
        userId: m._id.toString(),
        name: m.name,
        email: m.email,
        balance: round2(balances[m._id.toString()] || 0),
      }));
      const suggestions = (buildSettlement(balances) || []).map((t) => {
        const from = find(t.from);
        const to = find(t.to);
        return {
          from: { id: String(t.from), name: from?.name, email: from?.email },
          to: { id: String(t.to), name: to?.name, email: to?.email },
          amount: t.amount,
        };
      });

      const youOwe = suggestions.filter((s) => s.from.id === uid).map((s) => ({ to: s.to.name, amount: s.amount }));
      const owedToYou = suggestions.filter((s) => s.to.id === uid).map((s) => ({ from: s.from.name, amount: s.amount }));
      const yourBalance = round2(balances[uid] || 0);
      const parts = [
        ...youOwe.map((x) => `you pay ${x.to} ${money(x.amount, currency)}`),
        ...owedToYou.map((x) => `${x.from} pays you ${money(x.amount, currency)}`),
      ];

      return ok({
        group: g.name,
        currency,
        yourBalance,
        youOwe,
        owedToYou,
        balances: readable,
        suggestions,
        summary: suggestions.length
          ? parts.length
            ? `In "${g.name}": ${parts.join("; ")}.`
            : `You're settled up in "${g.name}"; others still have balances between them.`
          : `Everyone is settled up in "${g.name}".`,
      });
    },
  );

  tool(
    "settle_up",
    {
      title: "Record a settle-up payment",
      description:
        "Record money paid between the user and another member. direction i_paid_them: the user paid them, and they must " +
        "confirm it (stays pending until they do). direction they_paid_me: they paid the user, recorded immediately. " +
        "Leave amount out to settle the full outstanding balance between the two.",
      inputSchema: {
        group: groupRef,
        with: memberRef.describe("The other person."),
        direction: z.enum(["i_paid_them", "they_paid_me"]),
        amount: z.number().positive().max(9999999).optional().describe("Default: the full outstanding amount."),
        method: z.enum(["cash", "online"]).optional().describe("Default: cash."),
        note: z.string().max(200).optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      const currency = currencyOf(g);
      const m = resolveMember(g, args.with, uid);
      if (m.error) return fail(m.error);
      const other = m.member;
      if (other.id === uid) return fail("Pick the other person - you can't settle with yourself.");

      const [fromUserId, toUserId] = args.direction === "i_paid_them" ? [uid, other.id] : [other.id, uid];
      const computed = await computeGroupBalances(g._id);
      if (!computed) return fail("Group not found.");
      const { maxSettleableBetween } = await ctx.controllers();
      const max = maxSettleableBetween(computed.balances, fromUserId, toUserId) || 0;
      if (!max) {
        const reverse = maxSettleableBetween(computed.balances, toUserId, fromUserId) || 0;
        const hint = reverse
          ? ` It's the other way round: ${args.direction === "i_paid_them" ? `${other.name} owes you` : `you owe ${other.name}`} up to ${money(reverse, currency)}.`
          : "";
        return fail(`There's nothing outstanding for ${args.direction === "i_paid_them" ? `you to pay ${other.name}` : `${other.name} to pay you`} in "${g.name}".${hint}`);
      }
      const amount = round2(args.amount ?? max);
      if (amount > max + 0.01) return fail(`At most ${money(max, currency)} can be settled between you and ${other.name} right now.`);

      const res = await ctx.call("requestSettlement", {
        body: { groupId: String(g._id), fromUserId, toUserId, amount, method: args.method || "cash", note: args.note || "" },
      });
      if (res.error) return res.error;
      const d = res.data;

      if (d.status === "confirmed") {
        return ok({ requestId: d._id, status: "confirmed", amount, summary: `Recorded: ${other.name} paid you ${money(amount, currency)} in "${g.name}". Balances are updated.` });
      }
      const already = res.status === 200;
      return ok({
        requestId: d._id,
        status: "pending",
        amount: d.amount,
        summary: already
          ? `A ${money(d.amount, currency)} payment to ${other.name} is already waiting for their confirmation; I reminded them.`
          : `Sent: you paid ${other.name} ${money(amount, currency)} in "${g.name}". It counts once ${other.name} confirms it.`,
      });
    },
  );

  tool(
    "list_pending_settlements",
    {
      title: "List pending settle-ups",
      description: "Settle-up payments waiting for a confirmation that involve the user, across all groups or in one group.",
      inputSchema: { group: groupRef.optional().describe("Limit to one group (name or id). Default: all groups.") },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const filter = { status: "pending", $or: [{ fromUserId: uid }, { toUserId: uid }] };
      let currency = null;
      if (ref) {
        const r = await ctx.group(ref);
        if (r.error) return r.error;
        filter.groupId = r.group._id;
        currency = currencyOf(r.group);
      }
      const rows = await SettlementRequest.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("fromUserId", "name email")
        .populate("toUserId", "name email")
        .populate("groupId", "name settings")
        .lean();
      return ok(
        rows.map((p) => {
          const mine = idOf(p.initiatedBy) === uid;
          return {
            requestId: p._id,
            group: p.groupId?.name,
            from: p.fromUserId?.name,
            to: p.toUserId?.name,
            amount: p.amount,
            currency: currency || p.groupId?.settings?.currency || "INR",
            method: p.method,
            note: p.note || null,
            createdAt: p.createdAt,
            startedByYou: mine,
            youCan: mine ? ["cancel"] : ["confirm", "reject"],
          };
        }),
      );
    },
  );

  tool(
    "respond_to_settlement",
    {
      title: "Confirm / reject / cancel a settle-up",
      description:
        "Act on a pending settle-up (ids from list_pending_settlements). confirm or reject one someone else started; cancel one you started.",
      inputSchema: { requestId: objectId, action: z.enum(["confirm", "reject", "cancel"]) },
      annotations: WRITE,
    },
    async ({ requestId, action }) => {
      const handler = { confirm: "confirmSettlementRequest", reject: "rejectSettlementRequest", cancel: "cancelSettlementRequest" }[action];
      const res = await ctx.call(handler, { params: { requestId } });
      if (res.error) return res.error;
      const done = { confirm: "Confirmed - balances are updated.", reject: "Rejected - nothing changed in the balances.", cancel: "Cancelled." }[action];
      return ok({ requestId, action, summary: done });
    },
  );
}
