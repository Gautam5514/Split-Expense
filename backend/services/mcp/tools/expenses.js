import Expense from "../../../models/expenseModel.js";
import { resolveGroup, resolveMember, resolveMembers } from "../resolve.js";
import { getRate } from "../../../utils/fxRates.js";
import { csvCell, currencyOf, DESTRUCTIVE, fail, IDEMPOTENT_WRITE, money, normText, ok, person, READ, round2, WRITE } from "../helpers.js";

const CATEGORIES = [
  "general", "food", "travel", "stay", "shopping", "bills", "rent", "groceries",
  "utilities", "household", "activities", "fuel", "client", "supplies",
];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "NPR", "LKR", "MYR", "IDR", "VND"];
const MAX_EXPENSES = 500;
const DEFAULT_EXPENSES = 200;
const FILTER_SCAN_CAP = 2000; // newest expenses scanned when filters are applied
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_BATCH = 20;
const EXPORT_CAP = 2000;

const SPLIT_KEY = { exact: ["exactSplits", "share"], percent: ["percentSplits", "percent"], shares: ["sharesSplits", "shares"] };
const norm = normText;
const isSettlement = (e) => e.isSettlement === true || norm(e.description).startsWith("settlement");
const idOf = (v) => String(v?._id ?? v);

const parseDate = (s, endOfDay = false) => {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim())) d.setHours(23, 59, 59, 999);
  return d;
};

/** Round a list of amounts so they add up to exactly `total` (drift goes on the largest). */
const fitTo = (values, total) => {
  const out = values.map(round2);
  const drift = round2(total - out.reduce((a, v) => a + v, 0));
  if (drift && out.length) {
    const k = out.indexOf(Math.max(...out));
    out[k] = round2(out[k] + drift);
  }
  return out;
};

/**
 * Validate one bill and add it through the REST controller.
 * Returns { error: "<message for the user>" } or { result }.
 */
async function addOne(ctx, g, args) {
  const { uid } = ctx;
  const groupCurrency = currencyOf(g);
  const description = String(args.description || "").trim();
  const body = { groupId: String(g._id), description, category: args.category || "general" };

  // ── amount / currency ───────────────────────────────────────────────────
  let amount = args.amount;
  let fx = null; // { currency, originalAmount, rate, live }
  if (args.currency && args.currency !== groupCurrency) {
    // "Dinner $50" arrives as amount 50 + currency USD: read it as the bill's own currency.
    const original = args.originalAmount ?? (args.fxRate || amount === undefined ? undefined : amount);
    const convertedGiven = args.originalAmount !== undefined ? amount : undefined;
    if (original === undefined) {
      return { error: `How much was the bill in ${args.currency}? Pass originalAmount.` };
    }
    let rate = args.fxRate;
    let live = null;
    if (!rate && convertedGiven !== undefined) rate = convertedGiven / original;
    if (!rate) {
      try {
        live = await getRate(args.currency, groupCurrency);
        rate = Number(live.rate.toFixed(6));
      } catch {
        return { error: `I couldn't get today's ${args.currency} to ${groupCurrency} rate. Ask the user for it and pass fxRate (1 ${args.currency} = ? ${groupCurrency}).` };
      }
    }
    if (!(rate > 0) || rate > 100000) return { error: "That exchange rate doesn't look right. Ask the user for the rate and pass fxRate." };
    const converted = round2(original * rate);
    if (convertedGiven !== undefined && args.fxRate && Math.abs(round2(convertedGiven) - converted) > 0.05) {
      return { error: `amount (${convertedGiven}) doesn't match originalAmount × fxRate (${converted}). Pass just originalAmount + fxRate.` };
    }
    amount = converted;
    fx = { currency: args.currency, originalAmount: round2(original), rate, live: !!live };
    Object.assign(body, { currency: fx.currency, originalAmount: fx.originalAmount, fxRate: rate });
  }
  if (amount === undefined) return { error: `How much was "${description}"? Pass amount.` };
  body.amount = round2(amount);
  if (!(body.amount > 0)) return { error: "The amount must be more than zero." };
  if (args.notes) body.notes = args.notes.trim();

  // Split values the user gives for a foreign bill are in the bill's currency.
  const billTotal = fx ? fx.originalAmount : body.amount;
  const billCurrency = fx ? fx.currency : groupCurrency;
  const toGroup = (values) => (fx ? fitTo(values.map((v) => v * fx.rate), body.amount) : values.map(round2));

  // ── split ───────────────────────────────────────────────────────────────
  const type = args.splitType;
  if (args.items?.length) {
    if (type && type !== "itemized") return { error: "items makes it an itemised bill; leave splitType out (or pass itemized)." };
    const rows = [];
    for (const it of args.items) {
      const who = it.sharedBy?.length ? it.sharedBy : (g.members || []).map((m) => idOf(m));
      const m = resolveMembers(g, who, uid);
      if (m.error) return { error: m.error };
      rows.push({ name: it.name, amount: it.amount, userIds: m.members.map((x) => x.id) });
    }
    const sum = round2(rows.reduce((a, x) => a + x.amount, 0));
    if (Math.abs(sum - billTotal) > 0.01) {
      return { error: `The items add up to ${money(sum, billCurrency)}, but the bill is ${money(billTotal, billCurrency)}. Add the missing item (tax, tip, service charge) or correct the total.` };
    }
    const amounts = toGroup(rows.map((x) => x.amount));
    body.splitType = "itemized";
    body.items = rows.map((x, k) => ({ name: x.name, amount: amounts[k], userIds: x.userIds }));
  } else if (type === "itemized") {
    return { error: "An itemised bill needs items: one { name, amount, sharedBy } per item." };
  } else if (type && type !== "equal") {
    if (!args.splitDetails?.length) return { error: `A ${type} split needs splitDetails: one { member, value } per person.` };
    const rows = [];
    for (const d of args.splitDetails) {
      const m = resolveMember(g, d.member, uid);
      if (m.error) return { error: m.error };
      if (rows.some((x) => x.userId === m.member.id)) return { error: `${m.member.name} is listed twice in splitDetails.` };
      rows.push({ userId: m.member.id, value: d.value });
    }
    const sum = round2(rows.reduce((a, x) => a + x.value, 0));
    if (type === "exact") {
      if (Math.abs(sum - billTotal) > 0.01) return { error: `Exact amounts add up to ${money(sum, billCurrency)}, but the bill is ${money(billTotal, billCurrency)}.` };
      const values = toGroup(rows.map((x) => x.value));
      rows.forEach((x, k) => { x.value = values[k]; });
    }
    if (type === "percent" && Math.abs(sum - 100) > 0.01) return { error: `Percentages add up to ${sum}%, they must make 100%.` };
    if (type === "shares" && !(sum > 0)) return { error: "Shares must add up to more than zero." };
    const [key, field] = SPLIT_KEY[type];
    body.splitType = type;
    body.participants = rows.map((x) => x.userId);
    body[key] = rows.map((x) => ({ userId: x.userId, [field]: x.value }));
  } else if (args.splitWith?.length) {
    const m = resolveMembers(g, args.splitWith, uid);
    if (m.error) return { error: m.error };
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
      return {
        duplicate: true,
        error:
          `You already added "${dup.description}" (${money(dup.amount, groupCurrency)}) to "${g.name}" a few minutes ago, so I didn't add it again. ` +
          "If this really is a second bill, confirm with the user and add it again with allowDuplicate: true.",
      };
    }
  }

  const res = await ctx.call("addExpense", { body });
  if (res.error) return { error: res.data?.message || "That bill was not accepted." };
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
  const fxText = fx ? ` (${fx.currency} ${fx.originalAmount} at ${fx.live ? "today's rate of " : ""}${fx.rate})` : "";

  return {
    result: {
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
      ...(fx ? { foreignCurrency: { currency: fx.currency, originalAmount: fx.originalAmount, fxRate: fx.rate, rateSource: fx.live ? "live rate" : "given" } } : {}),
      summary: `Added "${e.description}" for ${money(e.amount, groupCurrency)}${fxText} to "${g.name}", paid by you, ${splitText}.`,
    },
  };
}

/** Why a group can't take a new bill from chat, or null. */
const blockedReason = (g) => {
  if (g.isCompleted) return `"${g.name}" is marked completed, so new expenses can't be added to it.`;
  if (g.settings?.receiptRequired) {
    return `"${g.name}" requires a receipt photo on every expense, so it can't be added from chat. Add it in the SplitEase app with the photo.`;
  }
  return null;
};

export function registerExpenseTools(ctx) {
  const { tool, uid, z, groupRef, memberRef, objectId } = ctx;

  /** The fields of one bill (shared by add_expense and add_expenses). */
  const billShape = {
    description: z.string().trim().min(1).max(200).describe('What it was for, e.g. "Dinner at Thalassa".'),
    amount: z.number().positive().max(9999999).optional().describe("Total in the group's currency. With currency set and no originalAmount, it is read as being in that currency."),
    category: z.enum(CATEGORIES).optional().describe("Default: general."),
    notes: z.string().max(500).optional(),
    splitWith: z.array(memberRef).min(1).max(100).optional().describe("Split equally between only these members (include \"me\" if you share it)."),
    splitType: z.enum(["equal", "exact", "percent", "shares", "itemized"]).optional(),
    splitDetails: z
      .array(z.object({ member: memberRef, value: z.number().min(0) }))
      .min(1)
      .max(100)
      .optional()
      .describe("For exact (amount each, in the bill's currency), percent (% each) or shares (share units each)."),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          amount: z.number().min(0).max(9999999).describe("Price of this item, in the bill's currency."),
          sharedBy: z.array(memberRef).max(100).optional().describe("Who had it. Default: everyone."),
        }),
      )
      .min(1)
      .max(100)
      .optional()
      .describe("Itemised bill: each item is split between the people who had it. Items must add up to the total, so include tax and tip as items."),
    currency: z.enum(CURRENCIES).optional().describe("Currency the bill was paid in, if different from the group's."),
    originalAmount: z.number().positive().max(99999999).optional().describe("Bill total in that currency."),
    fxRate: z.number().positive().max(100000).optional().describe("Only if the user gives a rate: 1 unit of that currency = this many units of the group's currency. Otherwise today's rate is used."),
    allowDuplicate: z.boolean().optional().describe("Set true only if the user confirms a second identical bill is intended."),
  };

  /** One of the user's own bills, by id or by words from its description. */
  const ownExpense = async ({ expenseId, group: ref, description }) => {
    if (expenseId) {
      const e = await Expense.findById(expenseId).lean();
      const r = e ? await resolveGroup(String(e.groupId), uid) : { error: true };
      if (!e || r.error) return { error: fail("Expense not found.") };
      return { expense: e, group: r.group };
    }
    if (!ref || !description) return { error: fail("Say which expense: pass expenseId, or group plus words from its description.") };
    const r = await ctx.group(ref);
    if (r.error) return { error: r.error };
    const g = r.group;
    const mine = await Expense.find({ groupId: g._id, paidBy: uid }).sort({ date: -1 }).limit(FILTER_SCAN_CAP).lean();
    const real = mine.filter((e) => !isSettlement(e));
    const q = norm(description);
    let hits = real.filter((e) => norm(e.description) === q);
    if (!hits.length) hits = real.filter((e) => norm(e.description).includes(q));
    if (hits.length === 1) return { expense: hits[0], group: g };
    const currency = currencyOf(g);
    if (!hits.length) {
      return { error: fail(`You haven't added a bill matching "${description}" in "${g.name}". Only the person who added a bill can change or delete it (list_expenses shows who paid).`) };
    }
    const list = hits.slice(0, 8).map((e) => `"${e.description}" ${money(e.amount, currency)} on ${new Date(e.date).toISOString().slice(0, 10)} (id ${e._id})`);
    return { error: fail(`"${description}" matches ${hits.length} of your bills in "${g.name}": ${list.join("; ")}. Ask which one, then pass its expenseId.`) };
  };
  const expenseRef = {
    expenseId: objectId.optional().describe("The expense id (from list_expenses), if known."),
    group: groupRef.optional().describe("Group name or id; needed when there is no expenseId."),
    description: z.string().trim().min(1).max(200).optional().describe("Words from the bill's description, used to find it when there is no expenseId."),
  };

  // ── add ─────────────────────────────────────────────────────────────────
  tool(
    "add_expense",
    {
      title: "Add expense",
      description:
        "Add a bill the signed-in user paid to a group. With no split details it uses the group's default split across " +
        "everyone. splitWith = only some people, split equally. splitType exact/percent/shares + splitDetails = uneven split " +
        "(exact amounts must add up to the total, percents to 100). items = itemised bill. Foreign currency: pass currency + " +
        "originalAmount and today's rate is applied automatically. Members get notified and the apps update live.",
      inputSchema: { group: groupRef, ...billShape },
      annotations: WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const blocked = blockedReason(r.group);
      if (blocked) return fail(blocked);
      const out = await addOne(ctx, r.group, args);
      return out.error ? fail(out.error) : ok(out.result);
    },
  );

  tool(
    "add_expenses",
    {
      title: "Add several expenses",
      description:
        `Add up to ${MAX_BATCH} bills the signed-in user paid to ONE group in a single call (a trip recap, a pasted list). ` +
        "Each bill takes the same fields as add_expense. Bills are added in order; one that fails doesn't stop the rest, " +
        "and the result says exactly which were added and which were not, and why.",
      inputSchema: {
        group: groupRef,
        expenses: z.array(z.object(billShape)).min(1).max(MAX_BATCH),
      },
      annotations: WRITE,
    },
    async ({ group: ref, expenses }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const g = r.group;
      const blocked = blockedReason(g);
      if (blocked) return fail(blocked);
      const currency = currencyOf(g);

      const added = [];
      const failed = [];
      for (let k = 0; k < expenses.length; k++) {
        const bill = expenses[k];
        // Two identical lines in one list are deliberate only if the caller says so.
        const twin = expenses.findIndex((b, n) => n < k && norm(b.description) === norm(bill.description) && b.amount === bill.amount && b.originalAmount === bill.originalAmount);
        let out;
        try {
          out = twin >= 0 && !bill.allowDuplicate
            ? { error: `Same description and amount as bill ${twin + 1} in this list. If it really is a second bill, set allowDuplicate: true on it.` }
            : await addOne(ctx, g, bill);
        } catch (e) {
          console.error("❌ MCP add_expenses item failed:", e?.message || e);
          out = { error: "Something went wrong adding this one." };
        }
        if (out.error) failed.push({ position: k + 1, description: bill.description, reason: out.error });
        else added.push({ position: k + 1, id: out.result.id, description: out.result.description, amount: out.result.amount, yourShare: out.result.yourShare });
      }
      const total = round2(added.reduce((a, x) => a + x.amount, 0));
      const result = {
        group: g.name,
        groupId: g._id,
        currency,
        added,
        failed,
        totalAdded: total,
        yourShare: round2(added.reduce((a, x) => a + x.yourShare, 0)),
        summary:
          `Added ${added.length} of ${expenses.length} bill${expenses.length === 1 ? "" : "s"} to "${g.name}"` +
          (added.length ? ` (${money(total, currency)} in total)` : "") +
          (failed.length ? `. ${failed.length} not added: ${failed.map((f) => `"${f.description}"`).join(", ")}.` : "."),
      };
      return added.length ? ok(result) : fail(`None of the bills were added to "${g.name}". ${failed.map((f) => `"${f.description}": ${f.reason}`).join(" ")}`);
    },
  );

  // ── fix ─────────────────────────────────────────────────────────────────
  tool(
    "update_expense",
    {
      title: "Edit an expense",
      description:
        "Change the description, category or notes of a bill the user added. The amount and split can't be edited: to change " +
        "those, delete_expense and add it again. Find the bill by expenseId, or by group + words from its description.",
      inputSchema: {
        ...expenseRef,
        newDescription: z.string().trim().min(1).max(200).optional(),
        category: z.enum(CATEGORIES).optional(),
        notes: z.string().max(500).optional().describe("New notes; an empty string clears them."),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async (args) => {
      const body = {};
      if (args.newDescription !== undefined) body.description = args.newDescription;
      if (args.category !== undefined) body.category = args.category;
      if (args.notes !== undefined) body.notes = args.notes;
      if (!Object.keys(body).length) return fail("Nothing to change - pass newDescription, category or notes.");
      const found = await ownExpense(args);
      if (found.error) return found.error;
      const res = await ctx.call("updateExpense", { params: { expenseId: String(found.expense._id) }, body });
      if (res.error) return res.error;
      const e = res.data;
      return ok({
        id: e._id,
        group: found.group.name,
        description: e.description,
        category: e.category,
        notes: e.notes || null,
        amount: e.amount,
        summary: `Updated "${e.description}" in "${found.group.name}". The amount and split are unchanged.`,
      });
    },
  );

  tool(
    "delete_expense",
    {
      title: "Delete an expense",
      description:
        "Permanently delete a bill the user added (only the person who added it can; settle-up payments can't be deleted). " +
        "Balances are recalculated and members are told. Can't be undone, so confirm with the user first. Find the bill by " +
        "expenseId, or by group + words from its description.",
      inputSchema: expenseRef,
      annotations: DESTRUCTIVE,
    },
    async (args) => {
      const found = await ownExpense(args);
      if (found.error) return found.error;
      const { expense: e, group: g } = found;
      const res = await ctx.call("deleteExpense", { params: { expenseId: String(e._id) } });
      if (res.error) return res.error;
      return ok({
        deletedId: e._id,
        group: g.name,
        description: e.description,
        amount: e.amount,
        summary: `Deleted "${e.description}" (${money(e.amount, currencyOf(g))}) from "${g.name}". Balances are updated.`,
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

  tool(
    "export_expenses",
    {
      title: "Export expenses as CSV",
      description:
        "A group's expenses as CSV text (date, description, category, who paid, amount, your share, notes), ready to save " +
        "as a file or paste into a spreadsheet. Optional date range.",
      inputSchema: {
        group: groupRef,
        since: z.string().trim().max(40).optional().describe("From this date (e.g. 2026-11-01)."),
        until: z.string().trim().max(40).optional().describe("Up to this date."),
        includeSettlements: z.boolean().optional().describe("Include settle-up payments. Default false."),
      },
      annotations: READ,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      const since = parseDate(args.since);
      const until = parseDate(args.until, true);
      if (since === undefined || until === undefined) return fail("since/until must be dates like 2026-11-01.");
      const filter = { groupId: g._id };
      if (since || until) filter.date = { ...(since ? { $gte: since } : {}), ...(until ? { $lte: until } : {}) };

      const all = await Expense.find(filter).populate("paidBy", "name email").sort({ date: -1 }).limit(EXPORT_CAP + 1).lean();
      const truncated = all.length > EXPORT_CAP;
      const rows = all.slice(0, EXPORT_CAP).filter((x) => args.includeSettlements === true || !isSettlement(x));
      const currency = currencyOf(g);
      const nameOf = (v) => v?.name || (g.members || []).find((m) => idOf(m) === idOf(v))?.name || "Former member";
      const header = ["Date", "Description", "Category", "Type", "Paid by", "Amount", "Currency", "Your share", "Notes"];
      const lines = rows.map((x) =>
        [
          new Date(x.date || x.createdAt).toISOString().slice(0, 10),
          x.description,
          x.category || "general",
          isSettlement(x) ? "settle-up" : "expense",
          nameOf(x.paidBy),
          round2(x.amount),
          currency,
          round2((x.splits || []).find((s) => idOf(s.userId) === uid)?.share || 0),
          x.notes || "",
        ].map(csvCell).join(","),
      );
      const spend = rows.filter((x) => !isSettlement(x));
      return ok({
        group: g.name,
        currency,
        rowCount: rows.length,
        total: round2(spend.reduce((a, x) => a + Number(x.amount || 0), 0)),
        truncated,
        csv: [header.join(","), ...lines].join("\n"),
        summary: `${rows.length} row${rows.length === 1 ? "" : "s"} from "${g.name}"${truncated ? ` (newest ${EXPORT_CAP} only)` : ""}.`,
      });
    },
  );
}
