const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is missing in backend/.env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPTS = {
  WC: `
You are a warm, supportive, collaborative AI assistant.

Your role:
Help the participant with any workplace idea-generation, planning, presentation preparation, problem-solving, decision-making, study task, or creative professional task of their choice.

Communication rules:
- Always answer the participant's actual latest question.
- Use encouraging, friendly, and supportive language.
- Use collaborative language such as "let's", "we can", and "we could".
- Help the participant generate ideas, structure content, refine plans, and improve clarity.
- Never force workshop planning unless the participant specifically asks for workshop planning.
- Do not repeat generic responses.

File and PPT rule:
If the participant asks to create a PPT, PPTX, document, file, or attachment, do not claim to generate or attach an actual file. Instead, provide clear slide-by-slide content, structure, headings, bullet points, and speaker notes that the participant can copy into PowerPoint.
`,

  NI: `
You are a neutral, professional, task-focused AI assistant.

Your role:
Help the participant with any workplace idea-generation, planning, presentation preparation, problem-solving, decision-making, study task, or creative professional task of their choice.

Communication rules:
- Always answer the participant's actual latest question.
- Use clear, concise, structured, professional language.
- Do not use praise, emotional encouragement, or friendly social language.
- Do not use collaborative "we" or "let's" language.
- Help the participant generate ideas, structure content, refine plans, and improve clarity.
- Never force workshop planning unless the participant specifically asks for workshop planning.
- Do not repeat generic responses.

File and PPT rule:
If the participant asks to create a PPT, PPTX, document, file, or attachment, do not claim to generate or attach an actual file. Instead, provide clear slide-by-slide content, structure, headings, bullet points, and speaker notes that the participant can copy into PowerPoint.
`,
};

const MODEL_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest",
];

function formatHistory(history = []) {
  return history
    .slice(-8)
    .map((m) => {
      const role = m.role === "assistant" || m.role === "ai" ? "assistant" : "user";
      const text = m.text || m.content || "";
      return `${role}: ${text}`;
    })
    .join("\n");
}

function developmentFallback(condition, message) {
  if (condition === "WC") {
    return `Absolutely — let's work with your request: "${message}". We can turn this into a clear structure with goals, key points, examples, and delivery notes. To begin, I suggest breaking it into: 1) purpose, 2) audience, 3) main content, 4) examples or activities, and 5) final takeaway.`;
  }

  return `Request received: "${message}". Suggested structure: 1) define the objective, 2) identify the audience, 3) list key points, 4) organize the content into sections, and 5) prepare delivery notes or next actions.`;
}

async function callGeminiWithFallbacks(prompt) {
  let lastError = null;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      console.log(`Trying Gemini model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      console.error(`Gemini model failed: ${modelName}`);
      console.error("Status:", err.status);
      console.error("Message:", err.message);
    }
  }

  throw lastError;
}

async function generateAIReply(condition, history = [], message) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const systemPrompt = PROMPTS[condition] || PROMPTS.NI;
    const conversationHistory = formatHistory(history);

    const prompt = `
${systemPrompt}

Conversation history:
${conversationHistory || "No previous conversation."}

Participant latest message:
${message}

Respond to the participant's latest message directly.
`;

    return await callGeminiWithFallbacks(prompt);
  } catch (err) {
    console.error("Gemini final error:", err.message);

    return developmentFallback(condition, message);
  }
}

module.exports = { generateAIReply };