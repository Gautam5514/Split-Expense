import OpenAI from "openai";

// Free-tier, OpenAI-compatible providers. Hosted model names churn; override the first
// model per provider with AUTOPILOT_<PROVIDER>_MODEL (e.g. AUTOPILOT_GROQ_MODEL) without a deploy. Autopilot only needs "JSON in, JSON out",
// so any of these can be added with just an API key. The first one that answers
// with output that passes validation wins; the rest are automatic fallbacks.
const CATALOG = {
  groq: { label: "Groq", baseURL: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] },
  cerebras: { label: "Cerebras", baseURL: "https://api.cerebras.ai/v1", keyEnv: "CEREBRAS_API_KEY", models: ["llama-3.3-70b", "llama3.1-8b"] },
  gemini: { label: "Gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", keyEnv: "GOOGLE_API_KEY", models: ["gemini-flash-latest", "gemini-2.5-flash"] },
  openrouter: { label: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", models: ["meta-llama/llama-3.3-70b-instruct:free"] },
};
const AUTO_ORDER = ["groq", "cerebras", "gemini", "openrouter"];
const RETRYABLE = new Set([400, 404, 408, 409, 413, 422, 429, 500, 502, 503, 504]);
const TIMEOUT_MS = Number(process.env.AUTOPILOT_LLM_TIMEOUT_MS) || 20_000;

const clients = new Map();
const clientFor = (name) => {
  const def = CATALOG[name];
  if (!clients.has(name)) clients.set(name, new OpenAI({ apiKey: process.env[def.keyEnv], baseURL: def.baseURL, maxRetries: 0 }));
  return clients.get(name);
};

// AUTOPILOT_PROVIDER: "local" (no model), "auto" (default: every provider that has a key),
// or an ordered list such as "groq,gemini".
export function configuredProviders(env = process.env) {
  const setting = String(env.AUTOPILOT_PROVIDER || "auto").trim().toLowerCase();
  if (setting === "local" || setting === "off") return [];
  const wanted = setting === "auto" ? AUTO_ORDER : setting.split(/[,\s]+/).filter(Boolean);
  return wanted.filter(name => CATALOG[name] && env[CATALOG[name].keyEnv]).map(name => {
    const override = env[`AUTOPILOT_${name.toUpperCase()}_MODEL`];
    return { name, label: CATALOG[name].label, models: override ? [override, ...CATALOG[name].models.filter(m => m !== override)] : CATALOG[name].models };
  });
}

export function describeProviders(env = process.env) {
  const providers = configuredProviders(env);
  const primary = providers[0];
  return {
    mode: primary ? "ai" : "local",
    provider: primary ? primary.name : "local",
    label: primary ? primary.label : "Offline planner",
    model: primary ? primary.models[0] : null,
    fallbacks: providers.slice(1).map(p => p.label),
  };
}

const stripFences = (text) => text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

// Calls providers in order until one returns content that `parse` accepts.
// `parse` throws on invalid JSON/schema, which moves on to the next model.
// Prompts and replies are never logged: they contain financial details.
export async function completeJson({ system, user, parse }) {
  const providers = configuredProviders();
  if (!providers.length) throw Object.assign(new Error("No AI provider configured."), { code: "NO_PROVIDER" });
  const attempts = [];
  for (const provider of providers) {
    for (const model of provider.models) {
      const started = Date.now();
      try {
        const completion = await clientFor(provider.name).chat.completions.create({
          model, temperature: 0, max_tokens: 1800,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }, { timeout: TIMEOUT_MS });
        const value = parse(stripFences(completion.choices?.[0]?.message?.content ?? ""));
        return { value, provider: provider.name, label: provider.label, model, ms: Date.now() - started, attempts };
      } catch (err) {
        const status = err?.status;
        attempts.push({ provider: provider.name, model, status: status || err?.name || "invalid_output" });
        // Authentication problems skip the provider's remaining models.
        if (status === 401 || status === 403) break;
        if (status && !RETRYABLE.has(status)) break;
      }
    }
  }
  throw Object.assign(new Error("All AI providers failed."), { code: "LLM_UNAVAILABLE", attempts });
}
