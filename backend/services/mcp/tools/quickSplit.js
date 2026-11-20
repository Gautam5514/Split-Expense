// Quick Split: a one-off bill shared with people who aren't in a group (and
// needn't be on SplitEase). The user paid; everyone else pays them back, and
// the user ticks people off as the money arrives.
import { DESTRUCTIVE, fail, IDEMPOTENT_WRITE, money, normText, ok, READ, WRITE } from "../helpers.js";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "NPR", "LKR", "MYR", "IDR", "VND"];
const isId = (v) => /^[a-fA-F0-9]{24}$/.test(String(v));

const view = (q) => {
  const waiting = (q.participants || []).filter((p) => !p.paid);
  return {
    id: q.id,
    title: q.title,
    totalAmount: q.totalAmount,
    currency: q.currency,
    splitType: q.splitType,
    note: q.note || null,
    people: (q.participants || []).map((p) => ({ personId: p.id, name: p.name, share: p.share, paid: p.paid })),
    paidCount: q.paidCount,
    collected: q.collected,
    stillToCollect: Math.round(waiting.reduce((a, p) => a + p.share, 0) * 100) / 100,
    settled: q.settled,
    createdAt: q.createdAt,
    ...(q.payee?.upiId ? { payToUpiId: q.payee.upiId } : {}),
  };
};

export function registerQuickSplitTools(ctx) {
  const { tool, z } = ctx;
  const splitRef = z.string().trim().min(1).max(200).describe('The quick split\'s title (e.g. "Team lunch") or its id.');

  /** One of the user's quick splits, by id or title. */
  const find = async (ref) => {
    if (isId(ref)) {
      const one = await ctx.call("getQuickSplit", { params: { id: ref } });
      if (!one.error) return { split: one.data };
    }
    const res = await ctx.call("listQuickSplits", { query: { limit: "100" } });
    if (res.error) return { error: res.error };
    const all = res.data?.items || [];
    const q = normText(ref);
    let hits = all.filter((x) => normText(x.title) === q);
    if (!hits.length) hits = all.filter((x) => normText(x.title).includes(q));
    // Prefer the one still being collected over an old settled one with the same name.
    if (hits.length > 1) {
      const open = hits.filter((x) => !x.settled);
      if (open.length === 1) hits = open;
    }
    if (hits.length === 1) return { split: hits[0] };
    if (!hits.length) {
      return { error: fail(`No quick split called "${ref}". ${all.length ? `Yours: ${all.slice(0, 10).map((x) => `"${x.title}"`).join(", ")}.` : "You have none yet - create_quick_split makes one."}`) };
    }
    return { error: fail(`"${ref}" matches several quick splits: ${hits.slice(0, 8).map((x) => `"${x.title}" ${money(x.totalAmount, x.currency)} (id ${x.id})`).join(", ")}. Ask which one, then pass its id.`) };
  };

  tool(
    "create_quick_split",
    {
      title: "Create a quick split",
      description:
        "Split a one-off bill the user paid with people who aren't in a group (no account needed for them). Give people " +
        "by name for an equal split, add amount per person for a custom split, or just peopleCount for a headcount split. " +
        "Count the user themselves as one of the people if they share the bill.",
      inputSchema: {
        title: z.string().trim().min(1).max(120).optional().describe('e.g. "Team lunch". Default: Quick Split.'),
        totalAmount: z.number().positive().max(10000000),
        currency: z.enum(CURRENCIES).optional().describe("Default: INR."),
        people: z
          .array(z.object({ name: z.string().trim().min(1).max(60), amount: z.number().min(0).max(10000000).optional().describe("Their part, for a custom split.") }))
          .min(1)
          .max(50)
          .optional()
          .describe("Named people. Give amount on every person for a custom split, or on none for an equal one."),
        peopleCount: z.number().int().min(1).max(50).optional().describe("Equal split between this many unnamed people (instead of people)."),
        note: z.string().max(300).optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      const body = { title: args.title, totalAmount: args.totalAmount, currency: args.currency || "INR", note: args.note || "" };
      if (args.people?.length) {
        const withAmount = args.people.filter((p) => p.amount !== undefined).length;
        if (withAmount && withAmount !== args.people.length) {
          return fail("For a custom split every person needs an amount. Leave amount off everyone for an equal split.");
        }
        body.splitType = withAmount ? "custom" : "equal";
        body.participants = args.people.map((p) => ({ name: p.name, ...(withAmount ? { share: p.amount } : {}) }));
      } else if (args.peopleCount) {
        body.splitType = "equal";
        body.peopleCount = args.peopleCount;
      } else {
        return fail("Who is it split between? Pass people (names) or peopleCount.");
      }
      const res = await ctx.call("createQuickSplit", { body });
      if (res.error) return res.error;
      const v = view(res.data);
      const each = new Set(v.people.map((p) => p.share)).size <= 2 && body.splitType === "equal";
      return ok({
        ...v,
        summary:
          `Created quick split "${v.title}" for ${money(v.totalAmount, v.currency)} between ${v.people.length} ${v.people.length === 1 ? "person" : "people"}` +
          (each ? ` (${money(v.people[0].share, v.currency)} each).` : `: ${v.people.map((p) => `${p.name} ${money(p.share, v.currency)}`).join(", ")}.`),
      });
    },
  );

  tool(
    "list_quick_splits",
    {
      title: "List quick splits",
      description: "The user's quick splits, newest first: who has paid, who hasn't, and how much is still to collect.",
      inputSchema: {
        status: z.enum(["open", "settled", "all"]).optional().describe("open = someone still has to pay. Default: all."),
        limit: z.number().int().min(1).max(100).optional().describe("Default 30."),
      },
      annotations: READ,
    },
    async ({ status = "all", limit = 30 }) => {
      const res = await ctx.call("listQuickSplits", { query: { limit: String(status === "all" ? limit : 100) } });
      if (res.error) return res.error;
      let items = (res.data?.items || []).map(view);
      if (status === "open") items = items.filter((x) => !x.settled);
      if (status === "settled") items = items.filter((x) => x.settled);
      items = items.slice(0, limit);
      const open = items.filter((x) => !x.settled);
      return ok({
        quickSplits: items,
        summary: items.length
          ? `${items.length} quick split${items.length === 1 ? "" : "s"}, ${open.length} still being collected.`
          : "No quick splits yet.",
      });
    },
  );

  tool(
    "mark_quick_split_paid",
    {
      title: "Mark someone paid in a quick split",
      description:
        "Tick off the people who have paid the user back in a quick split (or untick with paid: false). Pass people by " +
        "name, or everyone: true once all the money is in.",
      inputSchema: {
        quickSplit: splitRef,
        people: z.array(z.string().trim().min(1).max(60)).min(1).max(50).optional().describe("Names (or person ids) to mark."),
        everyone: z.boolean().optional().describe("Mark every person instead of naming them."),
        paid: z.boolean().optional().describe("Default true. false = not paid after all."),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ quickSplit, people, everyone, paid = true }) => {
      const found = await find(quickSplit);
      if (found.error) return found.error;
      const qs = found.split;
      let targets = [];
      if (everyone) {
        targets = qs.participants;
      } else if (people?.length) {
        for (const ref of people) {
          const q = normText(ref);
          let hits = qs.participants.filter((p) => p.id === ref);
          if (!hits.length) hits = qs.participants.filter((p) => normText(p.name) === q);
          if (!hits.length) hits = qs.participants.filter((p) => normText(p.name).split(" ")[0] === q || normText(p.name).startsWith(q));
          if (!hits.length) return fail(`No "${ref}" in "${qs.title}". People: ${qs.participants.map((p) => p.name).join(", ")}.`);
          if (hits.length > 1) return fail(`"${ref}" matches several people in "${qs.title}": ${hits.map((p) => `${p.name} (personId ${p.id})`).join(", ")}. Pass the personId.`);
          if (!targets.some((t) => t.id === hits[0].id)) targets.push(hits[0]);
        }
      } else {
        return fail("Who paid? Pass people (names), or everyone: true.");
      }

      let latest = null;
      for (const t of targets.filter((p) => p.paid !== paid)) {
        const res = await ctx.call("setParticipantPaid", { params: { id: qs.id, pid: t.id }, body: { paid } });
        if (res.error) return res.error;
        latest = res.data;
      }
      const v = view(latest || qs);
      const names = targets.map((t) => t.name).join(", ");
      return ok({
        ...v,
        summary:
          `Marked ${names} as ${paid ? "paid" : "not paid"} in "${v.title}". ` +
          (v.settled ? "Everyone has paid - it's settled." : `${money(v.stillToCollect, v.currency)} still to collect.`),
      });
    },
  );

  tool(
    "delete_quick_split",
    {
      title: "Delete a quick split",
      description: "Permanently delete one of the user's quick splits. Can't be undone, so confirm with the user first.",
      inputSchema: { quickSplit: splitRef },
      annotations: DESTRUCTIVE,
    },
    async ({ quickSplit }) => {
      const found = await find(quickSplit);
      if (found.error) return found.error;
      const res = await ctx.call("deleteQuickSplit", { params: { id: found.split.id } });
      if (res.error) return res.error;
      return ok({ deletedId: found.split.id, summary: `Deleted the quick split "${found.split.title}".` });
    },
  );
}
