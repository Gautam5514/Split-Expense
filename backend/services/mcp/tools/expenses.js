import Expense from "../../../models/expenseModel.js";
import { resolveGroup, resolveMember, resolveMembers } from "../resolve.js";
import { currencyOf, fail, money, ok, person, READ, round2, WRITE } from "../helpers.js";

const CATEGORIES = [
  "general", "food", "travel", "stay", "shopping", "bills", "rent", "groceries",
  "utilities", "household", "activities", "fuel", "client", "supplies",
];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "NPR", "LKR", "MYR", "IDR", "VND"];
const MAX_EXPENSES = 500;
const DEFAULT_EXPENSES = 200;
const FILTER_SCAN_CAP = 2000; // newest expenses scanned when filters are applied
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const SPLIT_KEY = { exact: ["exactSplits", "share"], percent: ["percentSplits", "percent"], shares: ["sharesSplits", "shares"] };
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const isSettlement = (e) => e.isSettlement === true || norm(e.description).startsWith("settlement");
const idOf = (v) => String(v?._id ?? v);

const parseDate = (s, endOfDay = false) => {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim())) d.setHours(23, 59, 59, 999);
  return d;
};

export function registerExpenseTools(ctx) {
  const { tool, uid, z, groupRef, memberRef, objectId } = ctx;

  // ── add ─────────────────────────────────────────────────────────────────
  tool(
    "add_expense",
    {
      title: "Add expense",
      description:
        "Add a bill the signed-in user paid to a group. With no split details it uses the group's default split across " +
        "everyone. splitWith = only some people, split equally. splitType exact/percent/shares + splitDetails = uneven split " +
        "(exact amounts must add up to the total, percents to 100). Foreign currency: pass currency + originalAmount + fxRate " +
        "(amount is then worked out). Members get notified and the apps update live.",
      inputSchema: {
        group: groupRef,
        description: z.string().trim().min(1).max(200).describe('What it was for, e.g. "Dinner at Thalassa".'),
        amount: z.number().positive().max(9999999).optional().describe("Total in the group's currency. Optional when originalAmount + fxRate are given."),
        category: z.enum(CATEGORIES).optional().describe("Default: general."),
        notes: z.string().max(500).optional(),
        splitWith: z.array(memberRef).min(1).max(100).optional().describe("Split equally between only these members (include \"me\" if you share it)."),
        splitType: z.enum(["equal", "exact", "percent", "shares"]).optional(),
        splitDetails: z
          .array(z.object({ member: memberRef, value: z.number().min(0) }))
          .min(1)
          .max(100)
          .optional()
          .describe("For exact (amount each), percent (% each) or shares (share units each)."),
        currency: z.enum(CURRENCIES).optional().describe("Currency the bill was paid in, if different from the group's."),
        originalAmount: z.number().positive().optional().describe("Bill total in that currency."),
        fxRate: z.number().positive().max(100000).optional().describe("1 unit of that currency = this many units of the group's currency."),
        allowDuplicate: z.boolean().optional().describe("Set true only if the user confirms a second identical bill is intended."),
      },
      annotations: WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      const groupCurrency = currencyOf(g);

      if (g.isCompleted) return fail(`"${g.name}" is marked completed, so new expenses can't be added to it.`);
      if (g.settings?.receiptRequired) {
        return fail(`"${g.name}" requires a receipt photo on every expense, so it can't be added from chat. Add it in the SplitEase app with the photo.`);
      }

      // Amount / currency
      const body = { groupId: String(g._id), description: args.description.trim(), category: args.category || "general" };
      let amount = args.amount;
      if (args.currency && args.currency !== groupCurrency) {
        if (!args.originalAmount || !args.fxRate) {
          return fail(`To add a ${args.currency} bill to a ${groupCurrency} group I need originalAmount and fxRate (1 ${args.currency} = ? ${groupCurrency}). Ask the user for the rate.`);
        }
        const converted = round2(args.originalAmount * args.fxRate);
        if (amount !== undefined && Math.abs(round2(amount) - converted) > 0.05) {
          return fail(`amount (${amount}) doesn't match originalAmount × fxRate (${converted}). Pass just originalAmount + fxRate.`);
        }
        amount = converted;
        Object.assign(body, { currency: args.currency, originalAmount: round2(args.originalAmount), fxRate: args.fxRate });
      }
      if (amount === undefined) return fail("How much was it? Pass amount.");
      body.amount = round2(amount);
      if (args.notes) body.notes = args.notes.trim();

      // Split
      const type = args.splitType;
      if (type && type !== "equal") {
        if (!args.splitDetails?.length) return fail(`A ${type} split needs splitDetails: one { member, value } per person.`);
        const rows = [];
        for (const d of args.splitDetails) {
          const m = resolveMember(g, d.member, uid);
          if (m.error) return fail(m.error);
          if (rows.some((x) => x.userId === m.member.id)) return fail(`${m.member.name} is listed twice in splitDetails.`);
          rows.push({ userId: m.member.id, value: d.value });
        }
        if (type === "exact") {
          const sum = round2(rows.reduce((a, x) => a + x.value, 0));
          if (Math.abs(sum - body.amount) > 0.01) return fail(`Exact amounts add up to ${money(sum, groupCurrency)}, but the bill is ${money(body.amount, groupCurrency)}.`);
        }
        if (type === "percent") {
          const sum = round2(rows.reduce((a, x) => a + x.value, 0));
          if (Math.abs(sum - 100) > 0.01) return fail(`Percentages add up to ${sum}%, they must make 100%.`);
        }
        const [key, field] = SPLIT_KEY[type];
        body.splitType = type;
        body.participants = rows.map((x) => x.userId);
        body[key] = rows.map((x) => ({ userId: x.userId, [field]: x.value }));
      } else if (args.splitWith?.length) {
        const m = resolveMembers(g, args.splitWith, uid);
        if (m.error) return fail(m.error);
        body.splitType = "equal";
        body.participants = m.members.map((x) => x.id);
      } else if (type === "equal") {
        body.splitType = "equal";
      }

      // AI clients retry; never record the same bill twice by accident.
      if (!args.allowDuplicate) {
        const recent = await Expense.find({ groupId: g._id, paidBy: uid }).sort({ createdAt: -1 }).limit(20).lean();
        const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
        const dup = recent.find(
          (e) =>
            norm(e.description) === norm(body.description) &&
            Math.abs(Number(e.amount) - body.amount) < 0.01 &&
            new Date(e.createdAt || e.date || 0).getTime() >= cutoff,
        );
        if (dup) {
          return fail(
            `You already added "${dup.description}" (${money(dup.amount, groupCurrency)}) to "${g.name}" a few minutes ago, so I didn't add it again. ` +
              "If this really is a second bill, confirm with the user and call add_expense again with allowDuplicate: true.",
          );
        }
      }

      const res = await ctx.call("addExpense", { body });
      if (res.error) return res.error;
      const e = res.data;

      const splits = (e.splits || [])
        .filter((s) => Number(s.share) > 0)
        .map((s) => ({ member: s.userId?.name || "Member", memberId: idOf(s.userId), share: round2(s.share) }));
      const yourShare = round2(splits.find((s) => s.memberId === uid)?.share || 0);
      const shares = new Set(splits.map((s) => s.share));
      const splitText =
        e.splitType === "equal" && shares.size <= 2
          ? `split equally between ${splits.length} ${splits.length === 1 ? "person" : "people"} (${money(splits[0]?.share, groupCurrency)} each)`
          : `split ${splits.map((s) => `${s.member} ${money(s.share, groupCurrency)}`).join(", ")}`;
      const fxText = body.currency ? ` (${body.currency} ${body.originalAmount} at ${body.fxRate})` : "";

      return ok({
        id: e._id,
        group: g.name,
        groupId: g._id,
        description: e.description,
        amount: e.amount,
        currency: groupCurrency,
        category: e.category,
        splitType: e.splitType,
        paidBy: "you",
        splits,
        yourShare,
        othersOweYou: round2(e.amount - yourShare),
        summary: `Added "${e.description}" for ${money(e.amount, groupCurrency)}${fxText} to "${g.name}", paid by you, ${splitText}.`,
      });
    },
  );

  // ── read ────────────────────────────────────────────────────────────────
  tool(
    "list_expenses",
    {
      title: "List group expenses",
      description:
        "List a group's expenses, newest first, with your share of each. Filter by text, category, who paid, or date range.",
      inputSchema: {
        group: groupRef,
        search: z.string().trim().max(100).optional().describe("Text to look for in the description or notes."),
        category: z.enum(CATEGORIES).optional(),
        paidBy: memberRef.optional(),
        since: z.string().trim().max(40).optional().describe("From this date (e.g. 2026-11-01)."),
        until: z.string().trim().max(40).optional().describe("Up to this date."),
        includeSettlements: z.boolean().optional().describe("Include settle-up payments. Default true."),
        limit: z.number().int().min(1).max(MAX_EXPENSES).optional().describe("Max results (default 200, max 500)."),
      },
      annotations: READ,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      const limit = args.limit ?? DEFAULT_EXPENSES;

      let payerId = null;
      if (args.paidBy) {
        const m = resolveMember(g, args.paidBy, uid);
        if (m.error) return fail(m.error);
        payerId = m.member.id;
      }
      const since = parseDate(args.since);
      const until = parseDate(args.until, true);
      if (since === undefined || until === undefined) return fail("since/until must be dates like 2026-11-01.");

      const filtering = !!(args.search || args.category || payerId || since || until || args.includeSettlements === false);
      let expenses = await Expense.find({ groupId: g._id })
        .populate("paidBy", "name email")
        .sort({ date: -1 })
        .limit(filtering ? FILTER_SCAN_CAP : limit)
        .lean();

      if (filtering) {
        const q = norm(args.search);
        expenses = expenses.filter((x) => {
          if (q && !norm(x.description).includes(q) && !norm(x.notes).includes(q)) return false;
          if (args.category && x.category !== args.category) return false;
          if (payerId && idOf(x.paidBy) !== payerId) return false;
          const d = new Date(x.date || x.createdAt);
          if (since && d < since) return false;
          if (until && d > until) return false;
          if (args.includeSettlements === false && isSettlement(x)) return false;
          return true;
        }).slice(0, limit);
      }

      const currency = currencyOf(g);
      return ok(
        expenses.map((x) => ({
          id: x._id,
          description: x.description,
          amount: x.amount,
          currency,
          category: x.category,
          splitType: x.splitType,
          paidBy: x.paidBy ? { id: x.paidBy._id ?? x.paidBy, name: x.paidBy.name } : null,
          yourShare: round2((x.splits || []).find((s) => idOf(s.userId) === uid)?.share || 0),
          date: x.date,
          isSettlement: x.isSettlement,
          ...(x.notes ? { notes: x.notes } : {}),
          hasReceipt: !!x.imageUrl,
        })),
      );
    },
  );

  tool(
    "get_expense",
    {
      title: "Get expense details",
      description: "Full details of one expense: who paid, everyone's share, items, notes, currency conversion and receipt.",
      inputSchema: { expenseId: objectId },
      annotations: READ,
    },
    async ({ expenseId }) => {
      const e = await Expense.findById(expenseId)
        .populate("paidBy", "name email")
        .populate("splits.userId", "name email")
        .lean();
      if (!e) return fail("Expense not found.");
      // Membership check through the group - same message either way, no leak.
      const r = await resolveGroup(String(e.groupId), uid);
      if (r.error) return fail("Expense not found.");
      const g = r.group;
      const nameOf = (v) => v?.name || (g.members || []).find((m) => idOf(m) === idOf(v))?.name || "Former member";
      return ok({
        id: e._id,
        group: g.name,
        groupId: g._id,
        description: e.description,
        amount: e.amount,
        currency: currencyOf(g),
        category: e.category,
        splitType: e.splitType,
        isSettlement: isSettlement(e),
        paidBy: person(e.paidBy),
        splits: (e.splits || []).map((s) => ({ member: nameOf(s.userId), memberId: idOf(s.userId), share: round2(s.share) })),
        items: (e.items || []).map((it) => ({ name: it.name, amount: it.amount, sharedBy: (it.userIds || []).map(nameOf) })),
        notes: e.notes || null,
        foreignCurrency: e.currency ? { currency: e.currency, originalAmount: e.originalAmount, fxRate: e.fxRate } : null,
        receiptUrl: e.imageUrl || null,
        date: e.date,
      });
    },
  );

  tool(
    "get_group_summary",
    {
      title: "Get group spending summary",
      description:
        "A group's spending overview: total, this vs last month, your share and what you paid, spend by category, " +
        "trip progress vs budget, who should pay next, and upcoming monthly bills.",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("getGroupSummary", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      return ok({ group: r.group.name, ...res.data });
    },
  );
}
