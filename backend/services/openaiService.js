const OpenAI = require("openai");
const { getSystemPrompt } = require("./promptService");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateAIReply(condition, history = [], message, stage = 1) {
  if (!process.env.OPENAI_API_KEY) return "The assistant is unavailable because the OpenAI API key is missing.";
  const formattedHistory = history.slice(-10).map(m => ({
    role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
    content: m.text || m.content || ""
  })).filter(m => m.content);
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "system", content: getSystemPrompt(condition, stage) }, ...formattedHistory, { role: "user", content: message }]
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI error:", err.message);
    return "The assistant is temporarily unavailable. Please try again.";
  }
}
module.exports = { generateAIReply };
