// Pure planner tests for the power/control upgrade: no database, server or provider.
import { buildPlan, parseLocal, normalizeIntent, guessCategory, guessGroupType, ungroundedAmounts, applyEdits, amountsIn, readCorrection } from "../modules/autopilot/planner.js";
import { intentSchema, runInput } from "../modules/autopilot/contracts.js";

const actorId = "000000000000000000000001", aman = "000000000000000000000002", rahul = "000000000000000000000003";
const members = [{ _id: actorId, name: "Me" }, { _id: aman, name: "Aman" }, { _id: rahul, name: "Rahul" }];
const groupOf = (extra = {}) => ({ _id: "000000000000000000000009", name: "Flat", createdBy: actorId, groupType: "roommate", members: [actorId, aman, rahul], ...extra, settings: { currency: "INR", ...(extra.settings || {}) } });
const expense = (extra = {}) => ({ type: "create_expense", title: "Dinner", amount: "3000", payer: "me", participants: [], excluded: [], splitType: "equal", shares: [], ...extra });
const intent = (...actions) => ({ groupName: null, currency: null, clarification: null, actions });

describe("expenses match the manual screen", () => {
  test("category is guessed from the title and limited to the group's categories", () => {
    expect(guessCategory("Dinner at Toit")).toBe("food");
    expect(guessCategory("Uber to airport")).toBe("travel");
    expect(guessCategory("Electricity bill")).toBe("utilities");
    expect(guessCategory("Hotel", ["rent", "general"])).toBe("general");
    const plan = buildPlan(intent(expense({ title: "Groceries from Blinkit" })), { actorId, group: groupOf({ settings: { categories: ["rent", "groceries", "general"] } }), members });
    expect(plan.steps[0].payload.category).toBe("groceries");
  });
  test("a category the model chose is kept when the group uses it, otherwise guessed", () => {
    expect(buildPlan(intent(expense({ category: "activities" })), { actorId, group: groupOf({ groupType: "trip" }), members }).steps[0].payload.category).toBe("activities");
    expect(buildPlan(intent(expense({ title: "Electricity", category: "bills" })), { actorId, group: groupOf(), members }).steps[0].payload.category).toBe("utilities");
  });
  test("“split it” with nobody named uses the group's default shares", () => {
    const group = groupOf({ settings: { defaultSplit: { type: "shares", weights: [{ userId: actorId, value: 2 }, { userId: aman, value: 1 }, { userId: rahul, value: 1 }] } } });
    const plan = buildPlan(intent(expense({ amount: "4000" })), { actorId, group, members });
    const p = plan.steps[0].payload;
    expect(p.splitType).toBe("shares");
    expect(Object.fromEntries(p.splits.map(s => [s.memberId, s.shareMinor]))).toEqual({ [actorId]: 200000, [aman]: 100000, [rahul]: 100000 });
    expect(plan.notes.join(" ")).toMatch(/usual shares split/);
  });
  test("saying “equally” overrides the group's default split", () => {
    const group = groupOf({ settings: { defaultSplit: { type: "shares", weights: [{ userId: actorId, value: 2 }] } } });
    expect(buildPlan(intent(expense()), { actorId, group, members, explicitEqual: true }).steps[0].payload.splitType).toBe("equal");
  });
  test("leaving someone out overrides the default split with an equal split", () => {
    const group = groupOf({ settings: { defaultSplit: { type: "shares", weights: [{ userId: actorId, value: 2 }] } } });
    const p = buildPlan(intent(expense({ excluded: ["Rahul"] })), { actorId, group, members }).steps[0].payload;
    expect(p.splitType).toBe("equal");
    expect(p.splits.map(s => s.memberId).sort()).toEqual([actorId, aman]);
  });
  test("the plan card gets the full roster so people can be added back", () => {
    const p = buildPlan(intent(expense({ excluded: ["Rahul"] })), { actorId, group: groupOf(), members }).steps[0].payload;
    expect(p.roster.map(r => r.memberId)).toEqual([actorId, aman, rahul]);
  });
});

describe("group types", () => {
  test("type is inferred from the name, and a budget makes it a trip", () => {
    expect(guessGroupType("Koramangala Flat")).toBe("roommate");
    expect(guessGroupType("Office lunch team")).toBe("business");
    expect(guessGroupType("Goa 2026")).toBe("trip");
    expect(guessGroupType("Friends")).toBe("general");
    expect(guessGroupType("Friends", { wantsBudget: true })).toBe("trip");
  });
  test("create_group carries the type and explains it", () => {
    const plan = buildPlan(intent({ type: "create_group", name: "Flat 302", members: [] }), { actorId, members: [] });
    expect(plan.steps[0].payload.groupType).toBe("roommate");
    expect(plan.notes.join(" ")).toMatch(/roommate group/);
  });
  test("a budget on a roommate group asks instead of saving an invisible budget", () => {
    const plan = buildPlan(intent({ type: "set_group_budget", amount: "20000" }), { actorId, group: groupOf(), members });
    expect(plan.steps).toEqual([]);
    expect(plan.clarifications.join(" ")).toMatch(/only available in trip groups/);
  });
  test("legacy groups without a type still accept budgets", () => {
    const plan = buildPlan(intent({ type: "set_group_budget", amount: "20000" }), { actorId, group: groupOf({ groupType: undefined }), members });
    expect(plan.steps[0].type).toBe("set_group_budget");
  });
});

describe("new read-only answers", () => {
  test("overall balance needs no group and no approval", () => {
    const plan = buildPlan(intent({ type: "read_overall" }), { actorId, members: [] });
    expect(plan.clarifications).toEqual([]);
    expect(plan.steps[0]).toMatchObject({ type: "read_overall", requiresApproval: false });
  });
  test("expense listing is read-only and keeps the search word", () => {
    const plan = buildPlan(intent({ type: "list_expenses", query: "food" }), { actorId, group: groupOf(), members });
    expect(plan.steps[0]).toMatchObject({ type: "list_expenses", requiresApproval: false, payload: { query: "food" } });
  });
  test("offline grammar understands them", () => {
    expect(parseLocal("What's my total balance?").actions).toEqual([{ type: "read_overall" }]);
    expect(parseLocal("mera hisaab").actions).toEqual([{ type: "read_overall" }]);
    expect(parseLocal("Show recent expenses").actions).toEqual([{ type: "list_expenses", query: null }]);
    expect(parseLocal("show balances").actions).toEqual([{ type: "read_summary" }]);
  });
  test("model output for them is normalised", () => {
    expect(intentSchema.parse(normalizeIntent({ actions: [{ type: "read_overall" }, { type: "list_expenses", query: " taxi " }] })).actions)
      .toEqual([{ type: "read_overall" }, { type: "list_expenses", query: "taxi" }]);
  });
});

describe("amounts must come from the user's own words", () => {
  test("Indian formats are recognised", () => {
    expect(amountsIn("budget 1.5 lakh, hotel 8k, taxi ₹1,200")).toEqual(expect.arrayContaining([15000000, 800000, 120000]));
    expect(amountsIn("2 cr")).toContain(2000000000);
  });
  test("a misread amount is flagged; correct ones and share totals pass", () => {
    expect(ungroundedAmounts(intent(expense({ amount: "36000" })), "dinner 3600 paid by me")).toHaveLength(1);
    expect(ungroundedAmounts(intent(expense({ amount: "3600" })), "dinner 3600 paid by me")).toEqual([]);
    expect(ungroundedAmounts(intent({ type: "set_group_budget", amount: "150000" }), "budget 1.5 lakh")).toEqual([]);
    expect(ungroundedAmounts(intent(expense({ amount: "900", splitType: "exact", shares: [{ member: "me", amount: "300" }, { member: "Aman", amount: "600" }] })), "taxi: me 300, Aman 600")).toEqual([]);
  });
  test("a correction line counts", () => {
    expect(ungroundedAmounts(intent(expense({ amount: "4000" })), "dinner 3600 paid by me\nmake it 4000")).toEqual([]);
  });
});

describe("plan-card edits", () => {
  const base = intent(expense({ title: "Dinner", amount: "3000" }));
  test("edits are accepted by the request contract", () => {
    expect(runInput.safeParse({ message: "Edited", requestKey: "1b4e28ba-2fa1-41d2-883f-0016d3cca427", parentRunId: "0".repeat(24), reuse: true, edits: [{ action: 0, amount: "3500", excluded: [rahul] }] }).success).toBe(true);
    expect(runInput.safeParse({ message: "x", requestKey: "1b4e28ba-2fa1-41d2-883f-0016d3cca427", edits: [{ action: 0, amount: "-5" }] }).success).toBe(false);
  });
  test("amount, title and people are patched, then the plan is rebuilt and re-validated", () => {
    const edited = applyEdits(base, [{ action: 0, amount: "3500", title: "Team dinner", excluded: [rahul] }]);
    const plan = buildPlan(edited, { actorId, group: groupOf(), members });
    const p = plan.steps[0].payload;
    expect(p).toMatchObject({ name: "Team dinner", amountMinor: 350000 });
    expect(p.splits.map(s => s.memberId).sort()).toEqual([actorId, aman]);
    expect(p.splits.reduce((n, s) => n + s.shareMinor, 0)).toBe(350000);
  });
  test("only expenses and budgets can be edited; exact shares must be retyped", () => {
    expect(() => applyEdits(intent({ type: "read_summary" }), [{ action: 0, title: "x" }])).toThrow(/can't be edited/);
    expect(() => applyEdits(intent(expense({ amount: "900", splitType: "exact", shares: [{ member: "me", amount: "900" }] })), [{ action: 0, amount: "1000" }])).toThrow(/exact shares/);
  });
  test("steps record which action they came from", () => {
    const plan = buildPlan(intent({ type: "read_summary" }, expense()), { actorId, group: groupOf(), members });
    expect(plan.steps.map(s => s.action)).toEqual([0, 1]);
  });
});

describe("deletes are approval-gated and scoped to what the user owns", () => {
  const own = [
    { _id: "0000000000000000000000e1", description: "Dinner", amount: 3000, date: "2026-11-02" },
    { _id: "0000000000000000000000e2", description: "Taxi", amount: 900, date: "2026-11-01" },
    { _id: "0000000000000000000000e3", description: "Dinner", amount: 1200, date: "2026-10-28" },
  ];
  test("“last expense” deletes the most recent one you paid", () => {
    const plan = buildPlan(intent({ type: "delete_expense", title: null }), { actorId, group: groupOf(), members, ownExpenses: own });
    expect(plan.steps[0]).toMatchObject({ type: "delete_expense", requiresApproval: true, payload: { expenseId: own[0]._id, name: "Dinner", amountMinor: 300000 } });
    expect(plan.notes.join(" ")).toMatch(/can't be undone/);
  });
  test("an ambiguous title offers buttons, and the picked id resolves it", () => {
    const plan = buildPlan(intent({ type: "delete_expense", title: "dinner" }), { actorId, group: groupOf(), members, ownExpenses: own });
    expect(plan.steps).toEqual([]);
    expect(plan.questions[0]).toMatchObject({ id: "expense:0", kind: "expense" });
    expect(plan.questions[0].options.map(o => o.value)).toEqual([own[0]._id, own[2]._id]);
    const picked = applyEdits(intent({ type: "delete_expense", title: "dinner" }), [{ action: 0, expenseId: own[2]._id }]);
    expect(buildPlan(picked, { actorId, group: groupOf(), members, ownExpenses: own }).steps[0].payload.amountMinor).toBe(120000);
  });
  test("someone else's expense isn't found (only your own are offered)", () => {
    const plan = buildPlan(intent({ type: "delete_expense", title: "Hotel" }), { actorId, group: groupOf(), members, ownExpenses: own });
    expect(plan.clarifications.join(" ")).toMatch(/only delete expenses you added/);
  });
  test("only the creator can delete a group, and it shows what will be lost", () => {
    const stats = { expenses: 4, totalMinor: 500000 };
    const plan = buildPlan(intent({ type: "delete_group" }), { actorId, group: groupOf(), members, groupStats: stats });
    expect(plan.steps[0]).toMatchObject({ type: "delete_group", requiresApproval: true, payload: { impact: { expenses: 4, members: 3, totalMinor: 500000 } } });
    const notMine = buildPlan(intent({ type: "delete_group" }), { actorId: aman, group: groupOf(), members, groupStats: stats });
    expect(notMine.steps).toEqual([]);
    expect(notMine.clarifications.join(" ")).toMatch(/Only the person who created/);
  });
  test("a delete never rides along with other changes", () => {
    const plan = buildPlan(intent({ type: "delete_group" }, expense()), { actorId, group: groupOf(), members });
    expect(plan.steps.some(s => s.type === "delete_group")).toBe(false);
    expect(plan.clarifications.join(" ")).toMatch(/on its own/);
  });
  test("offline grammar and model output", () => {
    expect(parseLocal("delete last expense").actions).toEqual([{ type: "delete_expense", title: null, expenseId: null }]);
    expect(parseLocal("delete the dinner expense").actions).toEqual([{ type: "delete_expense", title: "dinner", expenseId: null }]);
    expect(parseLocal("delete this group").actions).toEqual([{ type: "delete_group" }]);
    // A model can't smuggle in an id: only the picker's edit sets it.
    expect(normalizeIntent({ actions: [{ type: "delete_expense", title: "last", expenseId: "0000000000000000000000e9" }] }).actions[0]).toEqual({ type: "delete_expense", title: null, expenseId: null });
  });
});

describe("vague deletes ask first", () => {
  test("“isko delete kar do” never deletes a whole group", () => {
    const plan = buildPlan(intent({ type: "delete_group" }), { actorId, group: groupOf(), members, groupStats: { expenses: 0, totalMinor: 0 }, message: "isko tum delete kr do abhi" });
    expect(plan.steps).toEqual([]);
    expect(plan.clarifications[0]).toMatch(/whole group “Flat”, or just one expense/);
    expect(buildPlan(intent({ type: "delete_group" }), { actorId, group: groupOf(), members, message: "Flat delete kar do" }).steps).toHaveLength(1);
  });
  test("filler words are stripped from the expense title", () => {
    expect(normalizeIntent({ actions: [{ type: "delete_expense", title: "dinner wala expense" }] }).actions[0].title).toBe("dinner");
    expect(normalizeIntent({ actions: [{ type: "delete_expense", title: "isko" }] }).actions[0].title).toBeNull();
  });
});

describe("understands casual requests", () => {
  const exp = (text) => parseLocal(text).actions[0];
  test.each([
    ["rent 20000", "Rent", "20000"],
    ["₹500 petrol", "Petrol", "500"],
    ["spent 1200 on dinner", "Dinner", "1200"],
    ["maine 900 diye taxi ke liye", "Taxi", "900"],
    ["petrol 1.5k", "Petrol", "1500"],
    ["Add groceries 2,450", "Groceries", "2450"],
    ["electricity bill 2300 split equally", "Electricity bill", "2300"],
    ["I paid 600 for movie tickets", "Movie tickets", "600"],
    ["chai 120rs", "Chai", "120"],
  ])("%s", (text, title, amount) => {
    expect(parseLocal(text).clarification).toBeNull();
    expect(exp(text)).toMatchObject({ type: "create_expense", title, amount, payer: "me", splitType: "equal" });
  });
  test("who is in or out", () => {
    expect(exp("pizza 600 with Aman and Priya")).toMatchObject({ title: "Pizza", participants: ["me", "Aman", "Priya"] });
    expect(exp("dinner 3000 Rahul ko chhod ke")).toMatchObject({ title: "Dinner", excluded: ["Rahul"] });
    expect(exp("dinner 3000 except Rahul and Aman")).toMatchObject({ excluded: ["Rahul", "Aman"] });
  });
  test("asks a short, specific question when something is missing", () => {
    expect(parseLocal("add dinner").clarification).toMatch(/How much was it for dinner/);
    expect(parseLocal("add 500").clarification).toMatch(/What was the 500 for/);
    expect(parseLocal("Rahul paid 500 for petrol").clarification).toMatch(/only record expenses you paid/);
  });
  test("a reply on its own line completes the request", () => {
    expect(parseLocal("add dinner\n1200").actions[0]).toMatchObject({ title: "Dinner", amount: "1200" });
  });
  test("a missing payer from the model means you", () => {
    expect(normalizeIntent({ actions: [{ type: "create_expense", title: "Rent", amount: "20000" }] }).actions[0].payer).toBe("me");
  });
});

describe("quick corrections to a waiting plan", () => {
  const roster = [{ memberId: actorId, name: "You" }, { memberId: aman, name: "Aman Gupta" }, { memberId: rahul, name: "Rahul" }];
  const plan = { steps: [{ id: "step_1", action: 0, type: "create_expense", payload: { splitType: "equal", roster, splits: roster.map(r => ({ memberId: r.memberId, name: r.name, shareMinor: 100 })) } }] };
  test.each([
    ["make it 4000", { amount: "4000" }],
    ["4.5k", { amount: "4500" }],
    ["nahi, 3500 tha", { amount: "3500" }],
    ["call it team dinner", { title: "Team dinner" }],
    ["Rahul ko hata do", { excluded: [rahul] }],
    ["remove aman", { excluded: [aman] }],
    ["Rahul nahi tha", { excluded: [rahul] }],
  ])("%s", (text, change) => {
    expect(readCorrection(text, plan)).toEqual({ edits: [{ action: 0, ...change }] });
  });
  test("adding someone back", () => {
    const without = { steps: [{ ...plan.steps[0], payload: { ...plan.steps[0].payload, splits: plan.steps[0].payload.splits.filter(x => x.memberId !== rahul) } }] };
    expect(readCorrection("Rahul bhi", without)).toEqual({ edits: [{ action: 0, excluded: [] }] });
  });
  test("anything unclear is left to the normal path", () => {
    expect(readCorrection("who owes whom", plan)).toBeNull();
    expect(readCorrection("add Priya", plan)).toBeNull(); // not in the group: may be an invite
    expect(readCorrection("remove everyone", plan)).toBeNull();
    expect(readCorrection("make it 4000", { steps: [] })).toBeNull();
  });
});
