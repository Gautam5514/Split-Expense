import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_PRIORITY = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];

const FALLBACK_STATUSES = new Set([404, 429, 500, 503]);

export const generateWithRetry = async (prompt) => {
  let lastError;

  for (const model of MODEL_PRIORITY) {
    try {
      console.log(`Trying OpenAI model: ${model}`);
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      return completion.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      lastError = err;
      const status = err?.status;
      if (FALLBACK_STATUSES.has(status)) {
        console.warn(`⚠️ OpenAI model ${model} failed (${status}) - trying next...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};
