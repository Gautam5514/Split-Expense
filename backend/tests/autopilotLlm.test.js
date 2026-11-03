// Pure provider-selection tests: no network or SDK call is made.
import { configuredProviders, describeProviders } from "../modules/autopilot/llm.js";
import { extractIntent } from "../modules/autopilot/planner.js";

describe("Autopilot provider selection", () => {
  test("auto mode orders providers that have keys, Groq first", () => {
    const env = { GOOGLE_API_KEY: "g", GROQ_API_KEY: "q" };
    expect(configuredProviders(env).map(p => p.name)).toEqual(["groq", "gemini"]);
    expect(describeProviders(env)).toMatchObject({ mode: "ai", provider: "groq", model: "openai/gpt-oss-120b", fallbacks: ["Gemini"] });
  });
  test("explicit list is honoured and keyless providers are skipped", () => {
    expect(configuredProviders({ AUTOPILOT_PROVIDER: "cerebras, groq", GROQ_API_KEY: "q" }).map(p => p.name)).toEqual(["groq"]);
  });
  test("model override goes first", () => {
    expect(configuredProviders({ GROQ_API_KEY: "q", AUTOPILOT_GROQ_MODEL: "custom" })[0].models[0]).toBe("custom");
  });
  test("local mode and missing keys use no model", () => {
    expect(configuredProviders({ AUTOPILOT_PROVIDER: "local", GROQ_API_KEY: "q" })).toEqual([]);
    expect(describeProviders({}).mode).toBe("local");
  });
  test("offline planner is used when no provider is configured", async () => {
    const saved = process.env.AUTOPILOT_PROVIDER;
    process.env.AUTOPILOT_PROVIDER = "local";
    const meta = {};
    const intent = await extractIntent("show balances", [], meta);
    if (saved === undefined) delete process.env.AUTOPILOT_PROVIDER; else process.env.AUTOPILOT_PROVIDER = saved;
    expect(intent.actions).toEqual([{ type: "read_summary" }]);
    expect(meta.provider).toBe("local");
  });
});

describe("Autopilot offline grammar and normalisation", () => {
  test("widget examples parse into the right actions offline", async () => {
    const { parseLocal } = await import("../modules/autopilot/planner.js");
    expect(parseLocal("Create group Goa Trip with Aman and Priya, budget 40k").actions).toEqual([
      { type: "create_group", name: "Goa Trip", members: ["Aman", "Priya"] },
      { type: "set_group_budget", amount: "40000" },
    ]);
    expect(parseLocal("Dinner 3600 paid by me, split equally, leave out Rahul").actions[0]).toMatchObject({ title: "Dinner", amount: "3600", excluded: ["Rahul"] });
    expect(parseLocal("Set the budget to 25000 and alert me at 75 and 90").actions).toEqual([
      { type: "set_group_budget", amount: "25000" }, { type: "monitor_budget", thresholds: [75, 90] },
    ]);
  });
  test("near-miss model output is repaired before strict validation", async () => {
    const { normalizeIntent } = await import("../modules/autopilot/planner.js");
    const { intentSchema } = await import("../modules/autopilot/contracts.js");
    const fixed = normalizeIntent({ currency: "₹", actions: [{ type: "create_expense", title: "Hotel", amount: 8000, payer: "me" }, { type: "monitor_budget", thresholds: ["75%", 90] }, { type: "send_money" }], note: "x" });
    expect(() => intentSchema.parse(fixed)).not.toThrow();
    expect(fixed.currency).toBe("INR");
    expect(fixed.actions.map(a => a.type)).toEqual(["create_expense", "monitor_budget"]);
    expect(fixed.clarification).toMatch(/send money/);
    expect(fixed.actions[0]).toMatchObject({ amount: "8000", payer: "me", splitType: "equal", participants: [] });
  });
});

describe("Autopilot member matching", () => {
  test("a unique first name resolves to the full member name", async () => {
    const { buildPlan } = await import("../modules/autopilot/planner.js");
    const actorId = "000000000000000000000001", aman = "000000000000000000000002";
    const group = { _id: "000000000000000000000009", createdBy: actorId, settings: { currency: "INR" } };
    const plan = buildPlan({ groupName: null, currency: null, clarification: null, actions: [{ type: "create_expense", title: "Taxi", amount: "900", payer: "me", participants: ["me", "aman"], excluded: [], splitType: "equal", shares: [] }] },
      { actorId, group, members: [{ _id: actorId, name: "Me Myself" }, { _id: aman, name: "Aman Gupta" }] });
    expect(plan.clarifications).toEqual([]);
    expect(plan.steps[0].payload.splits.map(s => s.memberId).sort()).toEqual([actorId, aman]);
  });
});

describe("Autopilot normalisation never changes meaning", () => {
  const exp = (extra) => ({ actions: [{ type: "create_expense", title: "x", amount: "1000", payer: "me", ...extra }] });
  test.each([
    ["unknown currency", { currency: "JPY", ...exp() }],
    ["foreign symbol in amount", exp({ amount: "$100" })],
    ["percentage split", exp({ splitType: "percentage" })],
  ])("%s stays invalid so it is re-asked", async (_name, raw) => {
    const { normalizeIntent } = await import("../modules/autopilot/planner.js");
    const { intentSchema } = await import("../modules/autopilot/contracts.js");
    expect(intentSchema.safeParse(normalizeIntent(raw)).success).toBe(false);
  });
  test("a name prefix is not guessed (Aman is not Amanda)", async () => {
    const { buildPlan } = await import("../modules/autopilot/planner.js");
    const actorId = "000000000000000000000001";
    const plan = buildPlan({ groupName: null, currency: null, clarification: null, actions: [{ type: "create_expense", title: "T", amount: "900", payer: "me", participants: ["me", "Aman"], excluded: [], splitType: "equal", shares: [] }] },
      { actorId, group: { _id: "000000000000000000000009", createdBy: actorId, settings: { currency: "INR" } }, members: [{ _id: actorId, name: "Me" }, { _id: "000000000000000000000002", name: "Amanda Roy" }] });
    expect(plan.clarifications.join(" ")).toMatch(/Aman/);
  });
  test("offline thresholds outside 1-100 ask instead of vanishing", async () => {
    const { parseLocal } = await import("../modules/autopilot/planner.js");
    expect(parseLocal("alert at 1000").clarification).toMatch(/percentages/);
  });
});
