"use strict";

const {
  getSystemPrompt,
  normaliseStage,
} = require("./promptService");

/*
 * Gemini service tuned for temporary 503 demand spikes and slow responses.
 *
 * Required:
 *   npm install @google/genai
 *
 * Environment:
 *   GEMINI_API_KEYS=key_one,key_two,key_three
 *   GEMINI_MODEL=<a model currently available to your projects>
 *
 * Recommended:
 *   GEMINI_REQUEST_TIMEOUT_MS=45000
 *   GEMINI_TOTAL_TIMEOUT_MS=140000
 *   GEMINI_MAX_HISTORY_MESSAGES=4
 *   GEMINI_MAX_HISTORY_CHARS=600
 *   GEMINI_MAX_OUTPUT_TOKENS=350
 */

const MODEL = String(process.env.GEMINI_MODEL || "").trim();

const REQUEST_TIMEOUT_MS = boundedNumber(
  process.env.GEMINI_REQUEST_TIMEOUT_MS ||
    process.env.GEMINI_TIMEOUT_MS,
  10000,
  90000,
  45000
);

const TOTAL_TIMEOUT_MS = boundedNumber(
  process.env.GEMINI_TOTAL_TIMEOUT_MS,
  30000,
  170000,
  140000
);

const MAX_HISTORY_MESSAGES = boundedNumber(
  process.env.GEMINI_MAX_HISTORY_MESSAGES,
  2,
  8,
  4
);

const MAX_HISTORY_CHARS = boundedNumber(
  process.env.GEMINI_MAX_HISTORY_CHARS,
  250,
  2000,
  600
);

const MAX_OUTPUT_TOKENS = boundedNumber(
  process.env.GEMINI_MAX_OUTPUT_TOKENS,
  128,
  1000,
  350
);

const RETRIES_PER_KEY = boundedNumber(
  process.env.GEMINI_RETRIES_PER_KEY,
  0,
  2,
  1
);

const API_KEYS = loadApiKeys();

let GoogleGenAIClass = null;
let nextKeyIndex = 0;

if (!MODEL) {
  console.warn(
    "GEMINI_MODEL is missing. Add a currently supported model to backend/.env."
  );
}

if (!API_KEYS.length) {
  console.warn(
    "No Gemini API key configured. Set GEMINI_API_KEYS or GEMINI_API_KEY."
  );
}

function boundedNumber(value, min, max, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function loadApiKeys() {
  const multiple = String(process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  const single = String(
    process.env.GEMINI_API_KEY || ""
  ).trim();

  return [
    ...new Set([
      ...multiple,
      ...(single ? [single] : []),
    ]),
  ];
}

async function getGoogleGenAIClass() {
  if (GoogleGenAIClass) {
    return GoogleGenAIClass;
  }

  const module = await import("@google/genai");

  if (!module.GoogleGenAI) {
    throw new Error(
      "The installed @google/genai package does not export GoogleGenAI."
    );
  }

  GoogleGenAIClass = module.GoogleGenAI;
  return GoogleGenAIClass;
}

function truncate(value, maxLength) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}

function formatHistory(history = []) {
  if (!Array.isArray(history)) {
    return "None.";
  }

  const messages = history
    .filter(
      (entry) =>
        entry &&
        ["user", "assistant", "ai", "model"].includes(entry.role)
    )
    .map((entry) => ({
      role: ["assistant", "ai", "model"].includes(entry.role)
        ? "Assistant"
        : "Participant",
      text: truncate(
        entry.text || entry.content || "",
        MAX_HISTORY_CHARS
      ),
    }))
    .filter((entry) => entry.text)
    .slice(-MAX_HISTORY_MESSAGES);

  if (!messages.length) {
    return "None.";
  }

  return messages
    .map((entry) => `${entry.role}: ${entry.text}`)
    .join("\n\n");
}

function buildPrompt(condition, history, message, stage) {
  const safeStage = normaliseStage(stage);

  return [
    getSystemPrompt(condition, safeStage),
    "",
    "Recent context:",
    formatHistory(history),
    "",
    "Latest participant message:",
    truncate(message, 5000),
    "",
    "Respond directly and naturally.",
  ].join("\n");
}

function getErrorMessage(error) {
  return String(
    error?.message ||
      error?.response?.data?.error?.message ||
      error ||
      ""
  );
}

function getStatus(error) {
  const direct = Number(
    error?.status ||
      error?.statusCode ||
      error?.response?.status
  );

  if (Number.isFinite(direct)) {
    return direct;
  }

  const match = getErrorMessage(error).match(
    /\b(400|401|403|404|408|409|429|500|502|503|504)\b/
  );

  return match ? Number(match[1]) : null;
}

function isRetryable(error) {
  const status = getStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    message.includes("high demand") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("temporarily unavailable") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("socket")
  );
}

function isModelConfigurationError(error) {
  const status = getStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    status === 400 ||
    status === 404 ||
    message.includes("model") &&
      (
        message.includes("not found") ||
        message.includes("no longer available") ||
        message.includes("not supported")
      )
  );
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withTimeout(promise, timeoutMs) {
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(
        `Gemini request timed out after ${timeoutMs} ms.`
      );

      error.status = 408;
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithKey(
  apiKey,
  prompt,
  timeoutMs
) {
  if (!MODEL) {
    throw new Error(
      "GEMINI_MODEL is not configured. Set it to a model available to your project."
    );
  }

  const GoogleGenAI = await getGoogleGenAIClass();
  const client = new GoogleGenAI({ apiKey });

  const response = await withTimeout(
    client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
    timeoutMs
  );

  const text = String(
    response?.text || ""
  ).trim();

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text;
}

function orderedKeyIndexes() {
  const indexes = API_KEYS.map(
    (_, index) => index
  );

  return [
    ...indexes.slice(nextKeyIndex),
    ...indexes.slice(0, nextKeyIndex),
  ];
}

async function callGemini(prompt) {
  if (!API_KEYS.length) {
    throw new Error(
      "No Gemini API keys are configured."
    );
  }

  const startedAt = Date.now();
  let lastError = null;

  for (const keyIndex of orderedKeyIndexes()) {
    for (
      let attempt = 0;
      attempt <= RETRIES_PER_KEY;
      attempt += 1
    ) {
      const elapsed = Date.now() - startedAt;
      const remaining = TOTAL_TIMEOUT_MS - elapsed;

      if (remaining <= 1500) {
        const error = new Error(
          `Gemini total request window exceeded ${TOTAL_TIMEOUT_MS} ms.`
        );

        error.status = 408;
        throw lastError || error;
      }

      /*
       * Do not let one slow key consume the whole browser request window.
       */
      const attemptTimeout = Math.min(
        REQUEST_TIMEOUT_MS,
        Math.max(1000, remaining - 1000)
      );

      try {
        const text = await generateWithKey(
          API_KEYS[keyIndex],
          prompt,
          attemptTimeout
        );

        nextKeyIndex =
          (keyIndex + 1) %
          API_KEYS.length;

        console.info(
          `Gemini succeeded with key ${keyIndex + 1}/${API_KEYS.length}, attempt ${attempt + 1}, model ${MODEL}.`
        );

        return text;
      } catch (error) {
        lastError = error;

        console.error(
          `Gemini key ${keyIndex + 1}/${API_KEYS.length}, attempt ${attempt + 1} failed${
            getStatus(error)
              ? ` (${getStatus(error)})`
              : ""
          }:`,
          getErrorMessage(error)
        );

        /*
         * A model-level 404/400 will fail for every key.
         */
        if (isModelConfigurationError(error)) {
          throw error;
        }

        if (!isRetryable(error)) {
          /*
           * Invalid credentials can be key-specific, so try the next key.
           */
          break;
        }

        if (attempt < RETRIES_PER_KEY) {
          /*
           * Brief exponential backoff for temporary high demand.
           */
          const waitMs =
            1500 * 2 ** attempt;

          if (
            Date.now() -
              startedAt +
              waitMs <
            TOTAL_TIMEOUT_MS
          ) {
            await delay(waitMs);
          }
        }
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "All configured Gemini keys failed."
    )
  );
}

function participantFallback(error) {
  const status = getStatus(error);

  if (status === 503) {
    return [
      "## AI service currently busy",
      "",
      "The external AI service is experiencing unusually high demand.",
      "",
      "Please wait a few minutes and try your message again. If the issue continues, you may return later today.",
    ].join("\n");
  }

  if (status === 429) {
    return [
      "## AI service usage limit reached",
      "",
      "The external AI service has reached its current usage limit.",
      "",
      "Please try again later today or tomorrow.",
    ].join("\n");
  }

  return [
    "## AI service currently unavailable",
    "",
    "The external AI service could not generate a response at this time.",
    "",
    "Please try your message again. If the issue continues, return later today.",
  ].join("\n");
}

async function generateAIReply(
  condition,
  history = [],
  message,
  stage = 1
) {
  const cleanMessage = String(
    message || ""
  ).trim();

  if (!cleanMessage) {
    throw new Error(
      "A participant message is required."
    );
  }

  try {
    const prompt = buildPrompt(
      condition,
      history,
      cleanMessage,
      stage
    );

    console.info(
      `Gemini prompt size: ${prompt.length} characters; history limit: ${MAX_HISTORY_MESSAGES} messages.`
    );

    return await callGemini(prompt);
  } catch (error) {
    console.error(
      "Gemini final error:",
      getErrorMessage(error)
    );

    return participantFallback(error);
  }
}

module.exports = {
  generateAIReply,
};
