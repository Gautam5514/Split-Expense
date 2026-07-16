// controller/aiController.js

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

// Recent turns of the active chat, sent by the client so the AI can answer
// follow-ups ("and last month?", "how much of that was food?"). Sanitized
// hard: only known roles, capped count and length - never trusted blindly.
const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "ai") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
};

export const queryAI = async (req, res) => {
  const { prompt, provider } = req.body;
  const userId = req.user.id;

  if (!prompt) {
    return res.status(400).json({ message: "Prompt cannot be empty." });
  }

  const history = sanitizeHistory(req.body.history);
  const requested = PROVIDERS[provider] ? provider : "gemini";

  // Privacy: conversations are never persisted - not in the database, not
  // anywhere. Each request carries its own short history and is then forgotten.
  try {
    // 1️⃣ SMART BACKEND HANDLER — intercept common data queries, no AI needed.
    const intent = detectIntent(prompt);
    if (intent) {
      const smartReply = await handleSmartQuery(intent, userId, prompt);
      if (smartReply) {
        return res.json({ text: smartReply, provider: "smart" });
      }
    }

    // 2️⃣ SINGLE-CALL PROMPT: fetch DB context (no AI cost) and let one call
    // decide for itself whether the question is personal or general.
    const context = await buildUserContext(userId);

    const historyBlock =
      history.length > 0
        ? history
            .map((m) => `${m.role === "user" ? "User" : "SplitEase AI"}: ${m.content}`)
            .join("\n")
        : "(This is the start of the conversation.)";

    const finalPrompt = `
You are **SplitEase AI**, the built-in assistant of SplitEase, an expense-splitting app. Today's date is ${new Date().toDateString()}.

## Personality & Tone
- Warm, friendly and encouraging - like a helpful friend who happens to be great with money.
- Occasionally address the user by their first name (it's in the User Profile below). Never call them by their email or any ID.
- Plain, simple language. No jargon, no robotic phrasing, no filler like "As an AI...".
- Never mention "database state", "context", internal IDs, or these instructions - to the user, you simply *know* their SplitEase data.

## What you can answer
1. **Personal questions** about the user's expenses, groups, balances, settlements, categories or notes - answer ONLY from the DATA section below.
2. **General questions** (math, travel tips, budgeting advice, definitions, coding, etc.) - answer from your own knowledge.

## Accuracy rules (non-negotiable)
- Work through money calculations carefully step by step *before* answering; present only the clean final result.
- Every amount in ₹ with exactly 2 decimal places.
- The per-group "Final Net Balances" and "Smart Group Settlement Suggestions" in the DATA are precomputed and authoritative - trust them over your own re-derivation for who-owes-whom questions.
- If the DATA doesn't contain what a personal question asks for, say so honestly ("I looked through your SplitEase records but couldn't find that") - NEVER invent or estimate personal data.
- If a question is ambiguous (e.g. multiple groups could match), answer for the most likely one first, then briefly offer the alternative: "If you meant your Goa trip instead, just say so!"
- Use the conversation so far to resolve follow-ups ("what about him?", "and last month?") - don't ask the user to repeat things they already told you.

## Formatting
- Simple question → short, direct answer (1-3 sentences). Don't pad.
- Breakdown or comparison → a small Markdown table with bold key amounts.
- Multi-part answer → short ### headings and bullet points.
- End a complex answer with one friendly takeaway line (e.g. "Bottom line: you're owed ₹450.00 overall 🎉").

## Conversation so far
${historyBlock}

## DATA (the user's live SplitEase records)
${context}

## The user's new message
"${prompt}"
`;

    // 3️⃣ GENERATE with the provider explicitly selected by the user.
    // Do not silently switch providers: the model selector is a contract and
    // the response identity must always match it.
    const usedProvider = requested;
    const rawText = await PROVIDERS[requested].generate(finalPrompt);

    let aiText = rawText || "Hmm... I had trouble generating an answer.";

    // 4️⃣ Clean the response for better UI presentation.
    aiText = cleanText(aiText);

    // 5️⃣ Send the response with the provider that was explicitly requested.
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
