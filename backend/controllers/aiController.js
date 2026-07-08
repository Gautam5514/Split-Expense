// controller/aiController.js

import AiMessage from "../models/aiMessageModel.js";
import { generateWithRetry as generateWithGemini } from "../services/geminiService.js";
import { generateWithRetry as generateWithOpenAI } from "../services/openaiService.js";
import { buildUserContext } from "../services/contextBuilder.js";
import { detectIntent, handleSmartQuery } from "../services/smartQueryHandler.js";

const PROVIDERS = {
  gemini: { generate: generateWithGemini, label: "Gemini" },
  openai: { generate: generateWithOpenAI, label: "ChatGPT" },
};

/**
 * Cleans response text while preserving professional markdown formatting.
 * Keeps asterisks for bold/italic and preserves code block styling.
 */
const cleanText = (text = "") => {
  return text
    .replace(/\n{3,}/g, "\n\n") // Collapse triple newlines to double newlines
    .trim();
};

const getAIServiceError = (err, providerLabel = "AI") => {
  const message = (err?.message || "").toLowerCase();
  const code = err?.code || err?.error?.code;

  if (
    err?.status === 401 ||
    code === "invalid_api_key" ||
    (err?.status === 403 && message.includes("api key"))
  ) {
    return {
      status: 503,
      code: "AI_KEY_REJECTED",
      message: `SplitEase AI is not available because the ${providerLabel} API key was rejected. Replace the key on the server and restart the backend.`,
    };
  }

  if (err?.status === 429 || code === "insufficient_quota") {
    return {
      status: 429,
      code: "AI_RATE_LIMITED",
      message: `${providerLabel} is temporarily rate limited or has run out of quota. Please try again in a few seconds, or switch providers.`,
    };
  }

  if (err?.status === 503) {
    return {
      status: 503,
      code: "AI_OVERLOADED",
      message: `${providerLabel} is experiencing high demand right now. Please try again in a moment.`,
    };
  }

  return {
    status: 500,
    code: "AI_REQUEST_FAILED",
    message: `An error occurred while processing your request with ${providerLabel}.`,
  };
};

export const queryAI = async (req, res) => {
  const { prompt, provider } = req.body;
  const userId = req.user.id;

  if (!prompt) {
    return res.status(400).json({ message: "Prompt cannot be empty." });
  }

  const requested = PROVIDERS[provider] ? provider : "gemini";

  try {
    // 1️⃣ Save the user's original question immediately.
    await AiMessage.create({ userId, role: "user", content: prompt, provider: requested });

    // 2️⃣ SMART BACKEND HANDLER — intercept common data queries, no AI needed.
    const intent = detectIntent(prompt);
    if (intent) {
      const smartReply = await handleSmartQuery(intent, userId, prompt);
      if (smartReply) {
        await AiMessage.create({ userId, role: "ai", content: smartReply, provider: "smart" });
        return res.json({ text: smartReply, provider: "smart" });
      }
    }

    // 3️⃣ SINGLE-CALL PROMPT: fetch DB context (no AI cost) and let one call
    // decide for itself whether the question is personal or general.
    const context = await buildUserContext(userId);

    const finalPrompt = `
      You are **SplitEase AI**, a friendly assistant inside an expense-splitting app.
      You can answer two kinds of questions:

      1. **Personal questions** about the user's own expenses, groups, balances, settlements, categories, or notes — use the DATABASE STATE below to answer these accurately.
      2. **General questions** (math, definitions, coding, advice, etc.) — answer these directly using your own knowledge, ignoring the DATABASE STATE.

      --- START DATABASE STATE ---
      ${context}
      --- END DATABASE STATE ---

      ### Guidelines:
      - For balances/settlements, look across ALL groups and net out cross-group debts where possible.
      - Keep money calculations to exactly 2 decimal places.
      - Use clean Markdown: bold headers, bullet lists, blockquotes for warnings.
      - If a personal question asks for data that isn't in the DATABASE STATE, say: "I searched your SplitEase records but couldn't find any information about that." Do not invent data.
      - Keep answers concise and to the point — no unnecessary padding.

      **User Question**: "${prompt}"
    `;

    // 4️⃣ GENERATE: try the requested provider first, then transparently fall
    // back to the other provider if it's unavailable (key rejected, rate
    // limited, overloaded) so the user still gets an answer.
    const fallbackOrder = [requested, ...Object.keys(PROVIDERS).filter((p) => p !== requested)];
    let rawText, usedProvider, lastErr;

    for (const key of fallbackOrder) {
      try {
        rawText = await PROVIDERS[key].generate(finalPrompt);
        usedProvider = key;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`⚠️ Provider "${key}" failed, trying next fallback...`, err.message);
      }
    }

    if (usedProvider === undefined) throw lastErr;

    let aiText = rawText || "Hmm... I had trouble generating an answer.";

    // 5️⃣ Clean the response for better UI presentation.
    aiText = cleanText(aiText);

    // 6️⃣ Save the AI's final response to the database.
    await AiMessage.create({ userId, role: "ai", content: aiText, provider: usedProvider });

    // 7️⃣ Send the clean response to the frontend, noting which provider answered
    // (useful if we silently fell back from the user's chosen provider).
    res.json({ text: aiText, provider: usedProvider });

  } catch (err) {
    console.error("❌ [AI Controller Error]:", err);
    const aiError = getAIServiceError(err, PROVIDERS[requested]?.label);
    res.status(aiError.status).json({
      message: aiError.message,
      code: aiError.code,
      error: err.message,
    });
  }
};
