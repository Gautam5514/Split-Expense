import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Primary model - latest and most capable
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Fallback model - more available during high demand
export const geminiFallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Generates content with automatic exponential backoff retries.
 * Falls back to gemini-1.5-flash if gemini-2.5-flash is unavailable (503).
 *
 * @param {string} prompt - The prompt to send to the model
 * @param {object} options - Optional config { maxRetries, baseDelayMs }
 * @returns {Promise<string>} - The generated text
 */
export const generateWithRetry = async (prompt, options = {}) => {
  const { maxRetries = 3, baseDelayMs = 800 } = options;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Try primary model (gemini-2.5-flash) with retries first
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const isRetryable = err?.status === 503 || err?.status === 429;
      const isLastAttempt = attempt === maxRetries;

      if (!isRetryable || isLastAttempt) {
        // If it's a 503 or we've exhausted retries on primary, try fallback
        if (isRetryable) break;
        throw err;
      }

      // Exponential backoff: 800ms, 1600ms, 3200ms...
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Gemini 2.5-flash attempt ${attempt} failed (${err?.status}). Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // Fallback to gemini-1.5-flash if primary is saturated
  console.warn("⚠️ Gemini 2.5-flash unavailable — switching to gemini-1.5-flash fallback...");
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiFallbackModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const isRetryable = err?.status === 503 || err?.status === 429;
      const isLastAttempt = attempt === maxRetries;

      if (!isRetryable || isLastAttempt) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Gemini 1.5-flash attempt ${attempt} failed (${err?.status}). Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
};
