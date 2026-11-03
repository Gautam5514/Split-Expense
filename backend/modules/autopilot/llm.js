import OpenAI from "openai";

// Free-tier, OpenAI-compatible providers. Hosted model names churn; override the first
// model per provider with AUTOPILOT_<PROVIDER>_MODEL (e.g. AUTOPILOT_GROQ_MODEL) without a deploy. Autopilot only needs "JSON in, JSON out",
// so any of these can be added with just an API key. The first one that answers
// with output that passes validation wins; the rest are automatic fallbacks.
const CATALOG = {
  groq: { label: "Groq", baseURL: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] },
  cerebras: { label: "Cerebras", baseURL: "https://api.cerebras.ai/v1", keyEnv: "CEREBRAS_API_KEY", models: ["gpt-oss-120b", "llama-3.3-70b"] },
  gemini: { label: "Gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", keyEnv: "GOOGLE_API_KEY", models: ["gemini-flash-lite-latest", "gemini-flash-latest"] },
  openrouter: { label: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", models: ["openai/gpt-oss-120b:free", "meta-llama/llama-3.3-70b-instruct:free"] },
};
const AUTO_ORDER = ["groq", "cerebras", "gemini", "openrouter"];
const RETRYABLE = new Set([400, 404, 408, 409, 413, 422, 429, 500, 502, 503, 504]);
// Groq answers in ~1-2s (p90 ~2.1s measured); a call slower than this is better spent elsewhere.
const TIMEOUT_MS = Number(process.env.AUTOPILOT_LLM_TIMEOUT_MS) || 8_000;
// The whole chain must answer within this budget, then the offline planner takes over.
const BUDGET_MS = Number(process.env.AUTOPILOT_LLM_BUDGET_MS) || 15_000;

const clients = new Map();
const clientFor = (name) => {
  const def = CATALOG[name];
  if (!clients.has(name)) clients.set(name, new OpenAI({ apiKey: process.env[def.keyEnv], baseURL: def.baseURL, maxRetries: 0 }));
  return clients.get(name);
};

// A provider that rate-limits or rejects our key is skipped until its cooldown ends,
// instead of burning the latency budget on every request.
const cooldowns = new Map();
export const coolingDown = (name, now = Date.now()) => (cooldowns.get(name) || 0) > now;
const coolDown = (name, ms) => cooldowns.set(name, Math.max(cooldowns.get(name) || 0, Date.now() + ms));
export const resetCooldowns = () => cooldowns.clear();

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
// Models sometimes wrap the object in prose; take the outermost {...}.
const extractObject = (text) => {
  const clean = stripFences(text);
  const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
  return start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
};
const retryAfterMs = (err) => {
  const raw = err?.headers?.get?.("retry-after") ?? err?.headers?.["retry-after"];
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 10 * 60_000) : 0;
};
// Reasoning models spend completion tokens thinking; keep it short for a parser.
const extraParams = (provider, model) => (["groq", "cerebras"].includes(provider) && /gpt-oss/.test(model) ? { reasoning_effort: "low" } : {});
const issueSummary = (err) => (err?.issues ? err.issues.slice(0, 4).map(i => `${i.path.join(".") || "root"}: ${i.message}`).join("; ") : "the reply was not valid JSON").slice(0, 400);
const log = (msg) => { if (process.env.NODE_ENV !== "test") console.warn(`[autopilot] ${msg}`); };

// Calls providers in order until one returns content that `parse` accepts.
// `parse` throws on invalid JSON/schema; the first such failure gets one repair
// retry on the same model, later ones move on. Prompts and replies are never
// logged: they contain financial details. Only provider, model, status and timing.
export async function completeJson({ system, user, parse, budgetMs = BUDGET_MS }) {
  const providers = configuredProviders();
  if (!providers.length) throw Object.assign(new Error("No AI provider configured."), { code: "NO_PROVIDER" });
  const deadline = Date.now() + budgetMs;
  const attempts = [];
  let repaired = false;
  for (const provider of providers) {
    if (coolingDown(provider.name)) { attempts.push({ provider: provider.name, status: "cooldown" }); continue; }
    models: for (const model of provider.models) {
      // A model that just timed out or 5xx'd is skipped briefly; its sibling model still gets a try.
      if (coolingDown(`${provider.name}:${model}`)) { attempts.push({ provider: provider.name, model, status: "cooldown" }); continue; }
      const remaining = deadline - Date.now();
      if (remaining < 1500) { attempts.push({ provider: provider.name, model, status: "budget" }); break models; }
      const messages = [{ role: "system", content: system }, { role: "user", content: user }];
      for (let pass = 0; pass < 2; pass++) {
        const started = Date.now();
        let content = "";
        try {
          const completion = await clientFor(provider.name).chat.completions.create({
            // Free tiers meter tokens per minute; a parser reply is small.
            model, temperature: 0, max_tokens: 1200,
            response_format: { type: "json_object" },
            messages, ...extraParams(provider.name, model),
          }, { timeout: Math.max(1000, Math.min(TIMEOUT_MS, deadline - Date.now())) });
          content = completion.choices?.[0]?.message?.content ?? "";
          const value = parse(extractObject(content));
          return { value, provider: provider.name, label: provider.label, model, ms: Date.now() - started, attempts, repaired: pass > 0 };
        } catch (err) {
          const status = err?.status;
          const ms = Date.now() - started;
          const timedOut = err instanceof OpenAI.APIConnectionTimeoutError;
          const label = status || (timedOut ? "timeout" : err instanceof OpenAI.APIConnectionError ? "connection" : "invalid_output");
          attempts.push({ provider: provider.name, model, status: label, ms });
          log(`attempt failed provider=${provider.name} model=${model} status=${label} ms=${ms}`);
          if (status === 401 || status === 403) { coolDown(provider.name, 10 * 60_000); log(`${provider.label} rejected the API key; check ${CATALOG[provider.name].keyEnv}.`); break models; }
          // Groq meters each model separately, so a 429 cools this model and tries its sibling.
          if (status === 429) { coolDown(`${provider.name}:${model}`, retryAfterMs(err) || 30_000); break; }
          if (status >= 500 || timedOut) coolDown(`${provider.name}:${model}`, 20_000);
          // A malformed answer gets exactly one chance to fix itself.
          if (label === "invalid_output" && content && !repaired && deadline - Date.now() > 4000) {
            repaired = true;
            messages.push({ role: "assistant", content: content.slice(0, 4000) }, { role: "user", content: `That JSON was rejected (${issueSummary(err)}). Reply with the corrected JSON object only.` });
            continue;
          }
          if (status && !RETRYABLE.has(status)) break models;
        }
        break;
      }
      if (coolingDown(provider.name)) break models;
    }
  }
  throw Object.assign(new Error("All AI providers failed."), { code: "LLM_UNAVAILABLE", attempts });
}
