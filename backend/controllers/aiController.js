// controller/aiController.js

import AiMessage from "../models/aiMessageModel.js";
import { geminiModel } from "../services/geminiService.js";
import { buildUserContext } from "../services/contextBuilder.js";

const cleanText = (text = "") => {
  // ... (your existing cleanText function is perfect)
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{2,}/g, "\n")
    .trim();
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
    // This is a quick, preliminary call to the AI to understand the *type* of question.
    const classificationPrompt = `
      Analyze the following user question. Classify it as either 'PERSONAL_DATA' if it asks about the user's personal information (like expenses, groups, trips, plans), or 'GENERAL_KNOWLEDGE' if it's a general question (like "what is the capital of France?" or "what is the distance from Koderma to Goa?").

      Respond with only a single word: PERSONAL_DATA or GENERAL_KNOWLEDGE.

      User Question: "${prompt}"
    `;

    const classificationResult = await geminiModel.generateContent(classificationPrompt);
    // We clean up the response to be certain we just have the classification word.
    const intent = classificationResult.response.text().trim();

    let finalPrompt;

    // 3️⃣ STEP 2: CHOOSE THE CORRECT PROMPT BASED ON INTENT
    if (intent === "PERSONAL_DATA") {
      // --- Path for questions about the user's data ---

      // RETRIEVE: Fetch the user-specific data from your database.
      const context = await buildUserContext(userId);
      
      // AUGMENT: Create the strict, data-aware prompt.
      finalPrompt = `
        You are SplitEase AI, a specialized assistant for the SplitEase app.
        Your primary function is to answer the user's question based *exclusively* on the CONTEXT provided below.
        
        Instructions:
        - Analyze the CONTEXT to find the answer to the user's question.
        - If the answer is in the context, provide it clearly and concisely.
        - If the information is not in the context, you MUST respond with "I'm sorry, but I can't find that information in your records."
        - Do NOT use any external knowledge or make up information.

        ${context}

        Now, please answer the following user question:
        Question: "${prompt}"
      `;

    } else {
      // --- Path for general knowledge questions ---

      // We do NOT provide context. We give a simple, direct instruction.
      finalPrompt = `
        You are a helpful general knowledge assistant.
        Please answer the following question accurately.

        Question: "${prompt}"
      `;
    }

    // 4️⃣ GENERATE: Send the chosen prompt to the Gemini model.
    const result = await geminiModel.generateContent(finalPrompt);
    let aiText = result?.response?.text() || "Hmm... I had trouble generating an answer.";

    // 5️⃣ Clean the response for better UI presentation.
    aiText = cleanText(aiText);

    // 6️⃣ Save the AI's final response to the database.
    await AiMessage.create({ userId, role: "ai", content: aiText });

    // 7️⃣ Send the clean response to the frontend.
    res.json({ text: aiText });

  } catch (err) {
    console.error("❌ [AI Controller Error]:", err);
    res.status(500).json({
      message: "An error occurred while processing your request with the AI.",
      error: err.message,
    });
  }
};