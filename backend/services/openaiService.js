const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPTS = {
  WC: `
You are a warm, supportive, and collaborative AI assistant.

Your role:
Help the participant think through any workplace idea-generation, planning, presentation, problem-solving, or creative professional task they choose.

Communication rules:
- Respond directly to the participant's latest message.
- Be friendly, encouraging, and supportive.
- Use collaborative language such as "let's", "we could", and "we can".
- Help them generate ideas, structure thoughts, refine plans, and improve clarity.
- Do not force the task to be about workshops unless the participant asks for a workshop.
- Do not repeat generic responses.
`,

  NI: `
You are a neutral, professional, task-focused AI assistant.

Your role:
Help the participant think through any workplace idea-generation, planning, presentation, problem-solving, or creative professional task they choose.

Communication rules:
- Respond directly to the participant's latest message.
- Be clear, structured, concise, and professional.
- Do not use praise, emotional encouragement, or friendly social language.
- Do not use collaborative "we" or "let's" language.
- Help the participant generate ideas, structure thoughts, refine plans, and improve clarity.
- Do not force the task to be about workshops unless the participant asks for a workshop.
- Do not repeat generic responses.
`,
};

async function generateAIReply(condition, history = [], message) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing");
    return "The assistant is unavailable because the OpenAI API key is missing.";
  }

  const systemPrompt = SYSTEM_PROMPTS[condition] || SYSTEM_PROMPTS.NI;

  const formattedHistory = history
    .slice(-10)
    .map((m) => ({
      role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
      content: m.text || m.content || "",
    }))
    .filter((m) => m.content);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        { role: "user", content: message },
      ],
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI full error:", err);
console.error("OpenAI status:", err.status);
console.error("OpenAI message:", err.message);
console.error("OpenAI response:", err.response?.data);
    return "The assistant is temporarily unavailable. Please try again.";
  }
}

module.exports = { generateAIReply };