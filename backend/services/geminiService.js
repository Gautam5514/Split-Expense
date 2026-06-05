import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const MODEL_PRIORITY = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

const FALLBACK_STATUSES = new Set([403, 404, 429, 500, 503]);

export const generateWithRetry = async (prompt) => {
  let lastError;

  for (const modelName of MODEL_PRIORITY) {
    try {
      console.log(`Trying Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      if (FALLBACK_STATUSES.has(err?.status)) {
        console.warn(`⚠️ Gemini model ${modelName} failed (${err?.status}) - trying next...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};
