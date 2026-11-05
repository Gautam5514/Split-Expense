import Group from "../../../models/groupModel.js";
import User from "../../../models/userModel.js";
import { computeGroupBalances } from "../../../controllers/balanceController.js";
import { fail, ok, READ, round2 } from "../helpers.js";

const SUMMARY_CONCURRENCY = 5;

export function registerAccountTools(ctx) {
  const { tool, uid, z } = ctx;

  tool(
    "get_me",
    {
      title: "Get current user",
      description: "Get the signed-in SplitEase user's account (id, name, email).",
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const user = await User.findById(uid).select("name email createdAt").lean();
      if (!user) return fail("User not found.");
      return ok({ id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });
    },
  );

  tool(
    "get_overall_summary",
    {
      title: "Get overall balance summary",
      description:
        "The user's net position across every group: total they are owed, total they owe, " +
        "and which groups have an open balance. Use for questions like \"how much do I owe overall?\".",
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const groups = await Group.find({ members: uid }).select("_id name settings").lean();
      let totalOwedToYou = 0;
      let totalYouOwe = 0;
      const perGroup = [];
      // Bounded concurrency: fast for users with many groups without an
      // unbounded fan-out against MongoDB.
      for (let i = 0; i < groups.length; i += SUMMARY_CONCURRENCY) {
        const batch = groups.slice(i, i + SUMMARY_CONCURRENCY);
        const results = await Promise.all(batch.map((g) => computeGroupBalances(g._id)));
        batch.forEach((g, idx) => {
          const computed = results[idx];
          if (!computed) return;
          const bal = round2(computed.balances[uid] || 0);
          if (bal > 0) totalOwedToYou += bal;
          else if (bal < 0) totalYouOwe += -bal;
          if (Math.abs(bal) >= 0.01) {
            perGroup.push({ group: g.name, groupId: g._id, currency: g.settings?.currency || "INR", yourBalance: bal });
          }
        });
      }
      return ok({
        totalOwedToYou: round2(totalOwedToYou),
        totalYouOwe: round2(totalYouOwe),
        net: round2(totalOwedToYou - totalYouOwe),
        note: "Positive balance = others owe you; negative = you owe. Totals add groups together even if their currencies differ.",
        groups: perGroup,
      });
    },
  );

  tool(
    "get_spending_insights",
    {
      title: "Get spending insights",
      description:
        "The user's personal spending analytics across all groups: totals, a category breakdown and recent activity. " +
        "Use for questions like \"what did I spend most on?\".",
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const r = await ctx.call("getUserAnalytics");
      if (r.error) return r.error;
      return ok(r.data);
    },
  );

  // Kept tiny on purpose: lets an assistant check its connection.
  tool(
    "ping",
    {
      title: "Check connection",
      description: "Check that the SplitEase connection works and see who you're signed in as.",
      inputSchema: { echo: z.string().max(100).optional() },
      annotations: READ,
    },
    async ({ echo }) => ok({ ok: true, signedInAs: ctx.user.email, echo: echo ?? null }),
  );
}
