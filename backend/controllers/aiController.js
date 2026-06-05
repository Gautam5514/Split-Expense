// controller/aiController.js

import AiMessage from "../models/aiMessageModel.js";
import { generateWithRetry } from "../services/geminiService.js";
import { buildUserContext } from "../services/contextBuilder.js";

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

    // 2️⃣ STEP 1: CLASSIFY USER INTENT
    // Quick preliminary call to understand the *type* of question.
    const classificationPrompt = `
      Analyze the following user question. Classify it as either 'PERSONAL_DATA' if it asks about the user's personal information (like expenses, groups, trips, plans, category spending, balances, planning notes), or 'GENERAL_KNOWLEDGE' if it's a general question (like general math, history, coding, or definitions).

      Respond with only a single word: PERSONAL_DATA or GENERAL_KNOWLEDGE.

      User Question: "${prompt}"
    `;

    // Use generateWithRetry - auto retries + falls back to gemini-1.5-flash if 503
    const intent = (await generateWithRetry(classificationPrompt, { maxRetries: 3 })).trim();

    let finalPrompt;

    // 3️⃣ STEP 2: CHOOSE THE CORRECT SYSTEM PROMPT BASED ON INTENT
    if (intent === "PERSONAL_DATA") {
      // --- Fetch user-specific structured database state ---
      const context = await buildUserContext(userId);

      finalPrompt = `
        You are **SplitEase Pro Financial Director & Intelligence Analyst**, the premium AI brain of SplitEase.
        Your goal is to parse the user's comprehensive database and provide professional-grade financial advice, exact split calculations, and smart, proactive cost optimization.

        --- START DATABASE STATE ---
        ${context}
        --- END DATABASE STATE ---

        ### CRITICAL ANALYTICAL INSTRUCTIONS:
        1. **Cross-Group Debt Simplification**: When asked about balances or settlements, look across ALL groups. If the user owes Person A in Group X but is owed by Person A in Group Y, calculate the *net cross-group settlement*! Proactively suggest this to simplify their real-world transfers.
        2. **Category & Trend Analytics**: If the user asks about spending, summarize their total expenses by category (e.g., Food, Travel, Stay, General) as percentages of their total out-of-pocket costs.
        3. **Anomaly & Spikes Warning**: Proactively flag:
           - Double entries (e.g., identical descriptions, amounts, and dates recorded in a group).
           - Outliers (extremely high individual transactions compared to average group costs).
           - Missing receipts (flag items without attachments if they seem high, e.g., > ₹1,000).
        4. **Group Trip Cost Predictions**: If the user asks about future trips or budgeting, check past group ledgers to predict daily average category splits, giving them a data-backed target budget.
        5. **Precision Math**: Keep all calculations to exactly 2 decimal places. Always verify split calculations to ensure they equal the total amount.
        6. **Professional Formatting**: Use beautiful, clean Markdown. Bold headers, neat lists, blockquotes for important warnings, and tidy bullet lists.
        7. **Confined Intelligence**: If a question is about personal records but the requested data is completely missing from the DATABASE STATE, explain clearly: "I searched your SplitEase records but couldn't find any information about that." Do not invent facts.

        Please respond to the following user question:
        **Question**: "${prompt}"
      `;
    } else {
      // --- Path for general knowledge questions ---
      finalPrompt = `
        You are an advanced general knowledge assistant.
        Provide a highly helpful, accurate, and structured answer.
        Use beautiful markdown bolding, clear formatting, and lists where appropriate.

        Question: "${prompt}"
      `;
    }

    // 4️⃣ GENERATE: Send the chosen prompt with retry + fallback protection.
    const rawText = await generateWithRetry(finalPrompt, { maxRetries: 3 });
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
