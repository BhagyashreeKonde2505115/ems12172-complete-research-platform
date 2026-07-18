"use strict";

const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

const {
  getSystemPrompt,
} = require("./promptService");

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "GEMINI_API_KEY is missing from the backend environment."
  );
}

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "missing"
);

const MODEL_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest",
];

const STAGE_PROMPTS = {
  1: {
    name: "Discover",

    objective:
      "Explore the participant's task broadly before settling on one solution.",

    behaviour: [
      "Clarify the participant's goal, intended audience, constraints and success criteria.",
      "Generate multiple relevant possibilities or directions.",
      "Encourage exploration and creative thinking.",
      "Do not rush into a final recommendation.",
      "Where assumptions are unclear, identify them politely.",
      "End with exactly one exploratory follow-up question.",
    ],
  },

  2: {
    name: "Develop",

    objective:
      "Develop the strongest possibilities into more detailed options.",

    behaviour: [
      "Identify the most promising ideas from the conversation.",
      "Expand those ideas with useful details.",
      "Compare alternatives, benefits, limitations and practical requirements.",
      "Help the participant make informed choices.",
      "Do not provide the final consolidated answer yet.",
      "End with exactly one focused development question.",
    ],
  },

  3: {
    name: "Refine",

    objective:
      "Improve the selected direction by addressing weaknesses and practical concerns.",

    behaviour: [
      "Identify weaknesses, risks, missing information or unrealistic assumptions.",
      "Challenge poor or impractical ideas respectfully rather than agreeing automatically.",
      "Suggest specific improvements.",
      "Improve feasibility, clarity and usefulness.",
      "Preserve worthwhile creative elements where possible.",
      "End with exactly one practical refinement question.",
    ],
  },

  4: {
    name: "Consolidate",

    objective:
      "Turn the discussion into a clear final proposal, plan or solution.",

    behaviour: [
      "Combine the strongest ideas from the conversation.",
      "Produce a coherent and actionable final outcome.",
      "Use clear headings and logically ordered points.",
      "Include key decisions, constraints and next steps.",
      "Avoid introducing unnecessary new directions.",
      "End with one brief invitation to make a final adjustment.",
    ],
  },
};

const CONDITION_PROMPTS = {
  WC: [
    "Use a warm, collaborative and encouraging communication style.",
    "Acknowledge the participant's contribution naturally.",
    "Use inclusive language such as 'we can' where appropriate.",
    "Remain honest and challenge weak ideas constructively.",
    "Do not become excessively enthusiastic or agree with every suggestion.",
  ].join(" "),

  NI: [
    "Use a neutral, concise and informational communication style.",
    "Focus directly on the task and relevant evidence.",
    "Avoid emotional encouragement, praise or excessive conversational warmth.",
    "Remain polite, clear and professionally helpful.",
    "Challenge weak ideas directly but respectfully.",
  ].join(" "),
};

const RESPONSE_FORMAT_PROMPT = [
  "Format the response so it is easy to read.",
  "Use a short descriptive heading when appropriate.",
  "Place each distinct idea on a new line.",
  "Use bullet points or numbered steps when presenting multiple items.",
  "Keep paragraphs short.",
  "Avoid producing one large block of text.",
  "Do not mention conditions, manipulation, experimental versions, WC, NI, warmth or neutrality.",
  "Do not tell the participant that their communication style is being varied.",
].join(" ");

function normaliseStage(stage) {
  const numericStage = Number(stage);

  if (!Number.isFinite(numericStage)) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(4, Math.trunc(numericStage))
  );
}

function formatHistory(history = []) {
  if (!Array.isArray(history)) {
    return "No previous conversation.";
  }

  const formatted = history
    .filter(
      (message) =>
        message &&
        ["user", "assistant", "ai"].includes(
          message.role
        )
    )
    .map((message) => {
      const role =
        message.role === "assistant" ||
        message.role === "ai"
          ? "Assistant"
          : "Participant";

      const text = String(
        message.text ||
          message.content ||
          ""
      ).trim();

      return text
        ? `${role}: ${text}`
        : "";
    })
    .filter(Boolean)
    .slice(-16)
    .join("\n\n");

  return formatted || "No previous conversation.";
}

function buildStagePrompt(stage) {
  const stageConfig =
    STAGE_PROMPTS[normaliseStage(stage)];

  return [
    `CURRENT GUIDED STAGE: ${stageConfig.name}`,
    "",
    `Stage objective: ${stageConfig.objective}`,
    "",
    "Required stage behaviour:",
    ...stageConfig.behaviour.map(
      (instruction, index) =>
        `${index + 1}. ${instruction}`
    ),
  ].join("\n");
}

function buildFullPrompt({
  condition,
  history,
  message,
  stage,
}) {
  const safeStage =
    normaliseStage(stage);

  const conditionPrompt =
    CONDITION_PROMPTS[condition] ||
    CONDITION_PROMPTS.NI;

  return [
    getSystemPrompt(
      condition,
      safeStage
    ),

    "",
    "IMPORTANT COMMUNICATION STYLE",
    conditionPrompt,

    "",
    buildStagePrompt(safeStage),

    "",
    "RESPONSE PRESENTATION",
    RESPONSE_FORMAT_PROMPT,

    "",
    "CONVERSATION HISTORY",
    formatHistory(history),

    "",
    "PARTICIPANT'S LATEST MESSAGE",
    String(message || "").trim(),

    "",
    "Respond directly to the participant's latest message while following the current stage objective.",
  ].join("\n");
}

function developmentFallback(
  condition,
  message,
  stage
) {
  const safeStage =
    normaliseStage(stage);

  const stageConfig =
    STAGE_PROMPTS[safeStage];

  const warm =
    condition === "WC";

  const opening = warm
    ? "Thanks for sharing that. Let’s work through it within the current stage."
    : "The task has been received. The response below follows the current stage.";

  const stageSpecificContent = {
    1: [
      "## Discover",
      "",
      opening,
      "",
      "**Current task**",
      "",
      `- ${String(message).slice(0, 500)}`,
      "",
      "**Useful areas to explore**",
      "",
      "- What outcome is needed?",
      "- Who is the intended audience or user?",
      "- What constraints or requirements matter?",
      "- What alternative directions could be considered?",
      "",
      "**Follow-up question**",
      "",
      "What outcome would make this task successful for you?",
    ],

    2: [
      "## Develop",
      "",
      opening,
      "",
      "**Current direction**",
      "",
      `- ${String(message).slice(0, 500)}`,
      "",
      "**Development approach**",
      "",
      "- Select the strongest option.",
      "- Add practical details.",
      "- Compare its benefits and limitations.",
      "- Consider resources, audience and implementation.",
      "",
      "**Follow-up question**",
      "",
      "Which option would you like to develop in more detail?",
    ],

    3: [
      "## Refine",
      "",
      opening,
      "",
      "**Current proposal**",
      "",
      `- ${String(message).slice(0, 500)}`,
      "",
      "**Areas to refine**",
      "",
      "- Identify weak or unrealistic assumptions.",
      "- Address practical risks.",
      "- Improve clarity and feasibility.",
      "- Preserve the strongest elements.",
      "",
      "**Follow-up question**",
      "",
      "Which weakness or practical constraint should we address first?",
    ],

    4: [
      "## Consolidate",
      "",
      opening,
      "",
      "**Final outcome**",
      "",
      `- Core task: ${String(message).slice(0, 500)}`,
      "- Summarise the selected direction.",
      "- State the main decisions.",
      "- Identify practical next steps.",
      "",
      "**Final check**",
      "",
      "Would you like one final adjustment to the proposed outcome?",
    ],
  };

  return stageSpecificContent[safeStage].join(
    "\n"
  );
}

async function callGeminiWithFallbacks(
  prompt
) {
  let lastError;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model =
        genAI.getGenerativeModel({
          model: modelName,

          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1200,
          },
        });

      const result =
        await model.generateContent(
          prompt
        );

      const text =
        result.response
          .text()
          ?.trim();

      if (text) {
        return text;
      }

      throw new Error(
        `${modelName} returned an empty response.`
      );
    } catch (error) {
      lastError = error;

      console.error(
        `Gemini model failed: ${modelName}`,
        error.message
      );
    }
  }

  throw (
    lastError ||
    new Error(
      "No Gemini model returned a response."
    )
  );
}

async function generateAIReply(
  condition,
  history = [],
  message,
  stage = 1
) {
  const safeStage =
    normaliseStage(stage);

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Missing GEMINI_API_KEY."
      );
    }

    const prompt =
      buildFullPrompt({
        condition,
        history,
        message,
        stage: safeStage,
      });

    return await callGeminiWithFallbacks(
      prompt
    );
  } catch (error) {
    console.error(
      "Gemini final error:",
      error.message
    );

    return developmentFallback(
      condition,
      message,
      safeStage
    );
  }
}

module.exports = {
  generateAIReply,
};