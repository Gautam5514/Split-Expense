// controller/aiController.js

import AiMessage from "../models/aiMessageModel.js";
import { generateWithRetry } from "../services/geminiService.js";
import { buildUserContext } from "../services/contextBuilder.js";
import { detectIntent, handleSmartQuery } from "../services/smartQueryHandler.js";

/**
 * Cleans response text while preserving professional markdown formatting.
 * Keeps asterisks for bold/italic and preserves code block styling.
 */
const cleanText = (text = "") => {
  return text
    .replace(/\n{3,}/g, "\n\n") // Collapse triple newlines to double newlines
    .trim();
};

const getAIServiceError = (err) => {
  const message = err?.message || "";

  if (err?.status === 403 && message.toLowerCase().includes("api key")) {
    return {
      status: 503,
      code: "AI_KEY_REJECTED",
      message:
        "SplitEase AI is not available because the Gemini API key was rejected. Replace GOOGLE_API_KEY on the server and restart the backend.",
    };
  }

  if (err?.status === 429) {
    return {
      status: 429,
      code: "AI_RATE_LIMITED",
      message: "SplitEase AI is temporarily rate limited. Please try again in a few seconds.",
    };
  }

  if (err?.status === 503) {
    return {
      status: 503,
      code: "AI_OVERLOADED",
      message:
        "SplitEase AI is experiencing high demand right now. Please try again in a moment.",
    };
  }

  return {
    status: 500,
    code: "AI_REQUEST_FAILED",
    message: "An error occurred while processing your request with the AI.",
  };
};

export const queryAI = async (req, res) => {
  const { prompt } = req.body;
  const userId = req.user.id;

  if (!prompt) {
    return res.status(400).json({ message: "Prompt cannot be empty." });
  }

  try {
    // 1️⃣ Save the user's original question immediately.
    await AiMessage.create({ userId, role: "user", content: prompt });

    // 2️⃣ SMART BACKEND HANDLER — intercept common data queries, no AI needed.
    const intent = detectIntent(prompt);
    if (intent) {
      const smartReply = await handleSmartQuery(intent, userId, prompt);
      if (smartReply) {
        await AiMessage.create({ userId, role: "ai", content: smartReply });
        return res.json({ text: smartReply });
      }
    }

    // 3️⃣ SINGLE-CALL PROMPT: fetch DB context (no AI cost) and let one Gemini
    // call decide for itself whether the question is personal or general.
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

    // 4️⃣ GENERATE: single call with retry + model fallback protection.
    const rawText = await generateWithRetry(finalPrompt);
    let aiText = rawText || "Hmm... I had trouble generating an answer.";

    // 5️⃣ Clean the response for better UI presentation.
    aiText = cleanText(aiText);

    // 6️⃣ Save the AI's final response to the database.
    await AiMessage.create({ userId, role: "ai", content: aiText });

    // 7️⃣ Send the clean response to the frontend.
    res.json({ text: aiText });

  } catch (err) {
    console.error("❌ [AI Controller Error]:", err);
    const aiError = getAIServiceError(err);
    res.status(aiError.status).json({
      message: aiError.message,
      code: aiError.code,
      error: err.message,
    });
  }
};
