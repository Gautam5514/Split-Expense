import { resolveMembers } from "../resolve.js";
import { currencyOf, DESTRUCTIVE, fail, IDEMPOTENT_WRITE, money, ok, person, READ, WRITE } from "../helpers.js";

const CATEGORIES = [
  "general", "food", "travel", "stay", "shopping", "bills", "rent", "groceries",
  "utilities", "household", "activities", "fuel", "client", "supplies",
];
const norm = (s) => String(s ?? "").trim().toLowerCase();
const ordinal = (n) => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
};

const shape = (b) => ({
  billId: b._id,
  description: b.description,
  amount: b.amount,
  category: b.category,
  dayOfMonth: b.dayOfMonth,
  active: b.active,
  nextRunAt: b.nextRunAt,
  paidBy: person(b.paidBy),
  participants: (b.participants || []).length ? b.participants.map(String) : "everyone",
});

export function registerRecurringTools(ctx) {
  const { tool, uid, z, groupRef, memberRef } = ctx;

  const billRef = z.string().trim().min(1).max(200).describe("The bill's id or its description (e.g. \"Rent\").");

  /** Find one bill in the group by id or description. */
  const findBill = async (g, ref) => {
    const res = await ctx.call("listRecurring", { params: { groupId: String(g._id) } });
    if (res.error) return { error: res.error };
    const bills = res.data || [];
    const q = norm(ref);
    let hits = bills.filter((b) => String(b._id) === ref);
    if (!hits.length) hits = bills.filter((b) => norm(b.description) === q);
    if (!hits.length) hits = bills.filter((b) => norm(b.description).includes(q));
    if (hits.length === 1) return { bill: hits[0] };
    if (!hits.length) {
      return { error: fail(`No monthly bill "${ref}" in "${g.name}". ${bills.length ? `Bills: ${bills.map((b) => `"${b.description}"`).join(", ")}.` : "It has none yet."}`) };
    }
    return { error: fail(`"${ref}" matches several bills: ${hits.map((b) => `"${b.description}" (id ${b._id})`).join(", ")}. Pass the id.`) };
  };

  tool(
    "list_recurring_bills",
    {
      title: "List monthly bills",
      description: "A group's recurring monthly bills (rent, WiFi...) that SplitEase adds automatically each month.",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("listRecurring", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      return ok({ group: r.group.name, currency: currencyOf(r.group), bills: (res.data || []).map(shape) });
    },
  );

  tool(
    "add_recurring_bill",
    {
      title: "Add monthly bill",
      description:
        "Set up a bill the user pays every month (e.g. rent on the 1st). SplitEase adds it as an expense automatically on " +
        "that day, split equally between splitWith (default: everyone at that time).",
      inputSchema: {
        group: groupRef,
        description: z.string().trim().min(1).max(200),
        amount: z.number().positive().max(9999999),
        dayOfMonth: z.number().int().min(1).max(28).describe("1-28, so it exists in every month."),
        category: z.enum(CATEGORIES).optional().describe("Default: bills."),
        splitWith: z.array(memberRef).min(1).max(100).optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      let participants = [];
      if (args.splitWith?.length) {
        const m = resolveMembers(g, args.splitWith, uid);
        if (m.error) return fail(m.error);
        participants = m.members.map((x) => x.id);
      }
      const res = await ctx.call("createRecurring", {
        params: { groupId: String(g._id) },
        body: { description: args.description, amount: args.amount, dayOfMonth: args.dayOfMonth, category: args.category, participants },
      });
      if (res.error) return res.error;
      return ok({
        ...shape(res.data),
        summary: `Every month on the ${ordinal(args.dayOfMonth)}, "${args.description}" (${money(args.amount, currencyOf(g))}) will be added to "${g.name}" as paid by you.`,
      });
    },
  );

  tool(
    "update_recurring_bill",
    {
      title: "Change / pause monthly bill",
      description: "Pause, resume or change a monthly bill's description, amount or day. Resuming doesn't back-fill paused months.",
      inputSchema: {
        group: groupRef,
        bill: billRef,
        active: z.boolean().optional().describe("false pauses, true resumes."),
        description: z.string().trim().min(1).max(200).optional(),
        amount: z.number().positive().max(9999999).optional(),
        dayOfMonth: z.number().int().min(1).max(28).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const found = await findBill(r.group, args.bill);
      if (found.error) return found.error;
      const body = {};
      for (const k of ["active", "description", "amount", "dayOfMonth"]) if (args[k] !== undefined) body[k] = args[k];
      if (!Object.keys(body).length) return fail("Nothing to change - pass active, description, amount or dayOfMonth.");
      const res = await ctx.call("updateRecurring", { params: { groupId: String(r.group._id), ruleId: String(found.bill._id) }, body });
      if (res.error) return res.error;
      const b = res.data;
      return ok({ ...shape(b), summary: `"${b.description}" is ${b.active ? `active: ${money(b.amount, currencyOf(r.group))} on the ${ordinal(b.dayOfMonth)} of each month` : "paused"}.` });
    },
  );

  tool(
    "delete_recurring_bill",
    {
      title: "Delete monthly bill",
      description: "Stop and delete a monthly bill (its creator or the group creator). Past expenses stay. Confirm first.",
      inputSchema: { group: groupRef, bill: billRef },
      annotations: DESTRUCTIVE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const found = await findBill(r.group, args.bill);
      if (found.error) return found.error;
      const res = await ctx.call("deleteRecurring", { params: { groupId: String(r.group._id), ruleId: String(found.bill._id) } });
      if (res.error) return res.error;
      return ok({ summary: `Deleted the monthly bill "${found.bill.description}". Expenses it already added stay.` });
    },
  );
}
