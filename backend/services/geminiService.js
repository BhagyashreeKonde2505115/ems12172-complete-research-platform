const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSystemPrompt } = require("./promptService");

if (!process.env.GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY is missing in backend/.env");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "missing");
const MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash-latest"];

function formatHistory(history = []) {
  return history.slice(-10).map(m => {
    const role = m.role === "assistant" || m.role === "ai" ? "assistant" : "user";
    return `${role}: ${m.text || m.content || ""}`;
  }).filter(Boolean).join("\n\n");
}

function developmentFallback(condition, message, stage) {
  const warm = condition === "WC";
  return `## ${warm ? "Let’s shape this" : "Task response"}\n\n${warm ? "Thanks for sharing your direction. We can turn it into a clearer and more useful outcome." : "The request has been received. The next action is to clarify the intended outcome."}\n\n**Current focus**\n\n- ${String(message).slice(0,240)}\n- Stage ${stage} of 4\n- Define the audience, constraints, format, and success criteria\n\n**Suggested approach**\n\n- Clarify the result you need.\n- Develop two or three viable options.\n- Select and refine the strongest option.\n- Consolidate it into a usable final output.\n\n**Next step**\n\nWhat specific outcome would make this task successful for you?`;
}

async function callGeminiWithFallbacks(prompt) {
  let lastError;
  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim();
      if (text) return text;
    } catch (err) { lastError = err; console.error(`Gemini model failed: ${modelName}`, err.message); }
  }
  throw lastError || new Error("No Gemini response");
}

async function generateAIReply(condition, history = [], message, stage = 1) {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const prompt = `${getSystemPrompt(condition, stage)}\n\nConversation history:\n${formatHistory(history) || "No previous conversation."}\n\nParticipant latest message:\n${message}\n\nRespond to the latest message directly.`;
    return await callGeminiWithFallbacks(prompt);
  } catch (err) {
    console.error("Gemini final error:", err.message);
    return developmentFallback(condition, message, stage);
  }
}

module.exports = { generateAIReply };
