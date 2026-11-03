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
