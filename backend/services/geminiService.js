"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSystemPrompt } = require("./promptService");

/*
 * Use only API keys and Google projects that you own or are authorised to use.
 * This provides resilience across authorised projects; it must not be used to
 * evade Google-imposed quotas or terms.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
const DEFAULT_COOLDOWN_MS = Number(process.env.GEMINI_KEY_COOLDOWN_MS || 60000);
const MAX_HISTORY_MESSAGES = Number(process.env.GEMINI_MAX_HISTORY_MESSAGES || 8);
const MAX_HISTORY_CHARS_PER_MESSAGE = Number(process.env.GEMINI_MAX_HISTORY_CHARS || 1800);
const MAX_LATEST_MESSAGE_CHARS = 5000;

function loadApiKeys() {
  const multipleKeys = String(process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  const singleKey = String(process.env.GEMINI_API_KEY || "").trim();
  return [...new Set([...multipleKeys, ...(singleKey ? [singleKey] : [])])];
}

const API_KEYS = loadApiKeys();
const keyCooldownUntil = new Map();
let nextKeyIndex = 0;

if (!API_KEYS.length) {
  console.warn("No Gemini API key is configured. Set GEMINI_API_KEYS or GEMINI_API_KEY.");
}

function normaliseStage(stage) {
  const numericStage = Number(stage);
  if (!Number.isFinite(numericStage)) return 1;
  return Math.max(1, Math.min(4, Math.trunc(numericStage)));
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}

function normaliseHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((entry) => entry && ["user", "assistant", "ai", "model"].includes(entry.role))
    .map((entry) => ({
      role: ["assistant", "ai", "model"].includes(entry.role) ? "Assistant" : "Participant",
      text: truncateText(entry.text || entry.content || "", MAX_HISTORY_CHARS_PER_MESSAGE),
    }))
    .filter((entry) => entry.text)
    .slice(-MAX_HISTORY_MESSAGES);
}

function formatHistory(history = []) {
  const cleanHistory = normaliseHistory(history);
  if (!cleanHistory.length) return "No previous conversation.";
  return cleanHistory.map((entry) => `${entry.role}: ${entry.text}`).join("\n\n");
}

function buildPrompt({ condition, history, message, stage }) {
  const safeStage = normaliseStage(stage);
  const cleanMessage = truncateText(message, MAX_LATEST_MESSAGE_CHARS);

  return [
    getSystemPrompt(condition, safeStage),
    "",
    "Recent conversation:",
    formatHistory(history),
    "",
    "Participant's latest message:",
    cleanMessage,
    "",
    "Answer the participant's latest message directly.",
    "Use the recent conversation only where relevant.",
    "Apply the current stage naturally without repeating generic stage guidance.",
    "Return clear Markdown.",
  ].join("\n");
}

function getErrorMessage(error) {
  return String(error?.message || error?.response?.data?.error?.message || error || "");
}

function getErrorStatus(error) {
  const directStatus = Number(error?.status || error?.statusCode || error?.response?.status);
  if (Number.isFinite(directStatus)) return directStatus;

  const match = getErrorMessage(error).match(/\b(400|401|403|404|408|409|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : null;
}

function isQuotaOrRateLimitError(error) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  return status === 429 || message.includes("quota") || message.includes("rate limit") || message.includes("resource_exhausted") || message.includes("too many requests");
}

function isTransientProviderError(error) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  return (
    isQuotaOrRateLimitError(error) ||
    [408, 500, 502, 503, 504].includes(status) ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("temporarily unavailable") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("socket")
  );
}

function isConfigurationError(error) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  return (
    [400, 401, 403, 404].includes(status) ||
    message.includes("api key not valid") ||
    message.includes("invalid api key") ||
    message.includes("permission denied") ||
    message.includes("model not found") ||
    message.includes("is not found")
  );
}

function getRetryDelayMs(error) {
  const message = getErrorMessage(error);
  const matches = [
    message.match(/retry(?:\s+in)?\s+([\d.]+)\s*s/i),
    message.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i),
  ].filter(Boolean);

  if (matches.length) {
    const seconds = Number(matches[0][1]);
    if (Number.isFinite(seconds)) {
      return Math.max(1000, Math.min(seconds * 1000, 10 * 60 * 1000));
    }
  }

  return DEFAULT_COOLDOWN_MS;
}

function markKeyOnCooldown(keyIndex, error) {
  const cooldownMs = getRetryDelayMs(error);
  keyCooldownUntil.set(keyIndex, Date.now() + cooldownMs);
  console.warn(`Gemini key index ${keyIndex + 1} placed on cooldown for approximately ${Math.ceil(cooldownMs / 1000)} seconds.`);
}

function getAvailableKeyIndexes() {
  const now = Date.now();
  const indexes = API_KEYS.map((_, index) => index);
  const ordered = [...indexes.slice(nextKeyIndex), ...indexes.slice(0, nextKeyIndex)];

  return ordered.filter((index) => (keyCooldownUntil.get(index) || 0) <= now);
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Gemini request timed out after ${timeoutMs} ms.`);
      error.status = 408;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

async function generateWithKey(apiKey, prompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 700),
    },
  });

  const result = await withTimeout(model.generateContent(prompt), REQUEST_TIMEOUT_MS);
  const response = await result.response;
  const text = String(response.text() || "").trim();

  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function callGeminiWithKeyFailover(prompt) {
  if (!API_KEYS.length) throw new Error("No Gemini API keys are configured.");

  let availableKeyIndexes = getAvailableKeyIndexes();

  if (!availableKeyIndexes.length) {
    const earliestIndex = API_KEYS
      .map((_, index) => ({ index, until: keyCooldownUntil.get(index) || 0 }))
      .sort((a, b) => a.until - b.until)[0]?.index;

    if (earliestIndex !== undefined) availableKeyIndexes = [earliestIndex];
  }

  let lastError = null;

  for (const keyIndex of availableKeyIndexes) {
    try {
      const text = await generateWithKey(API_KEYS[keyIndex], prompt);
      nextKeyIndex = (keyIndex + 1) % API_KEYS.length;
      keyCooldownUntil.delete(keyIndex);
      console.info(`Gemini response generated with key index ${keyIndex + 1} of ${API_KEYS.length}, model ${MODEL}.`);
      return text;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      console.error(
        `Gemini key index ${keyIndex + 1} failed${status ? ` (${status})` : ""}:`,
        getErrorMessage(error)
      );

      if (isQuotaOrRateLimitError(error) || isTransientProviderError(error)) {
        markKeyOnCooldown(keyIndex, error);
        continue;
      }

      if (isConfigurationError(error)) continue;
      throw error;
    }
  }

  throw lastError || new Error("All configured Gemini keys failed.");
}

function participantFallback(error) {
  if (isQuotaOrRateLimitError(error)) {
    return [
      "## The AI assistant is temporarily busy",
      "",
      "The service has reached its current usage limit.",
      "",
      "Please wait a short while and send your message again.",
    ].join("\n");
  }

  return [
    "## The AI assistant is temporarily unavailable",
    "",
    "A response could not be generated at this time.",
    "",
    "Please try sending your message again.",
  ].join("\n");
}

async function generateAIReply(condition, history = [], message, stage = 1) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) throw new Error("A participant message is required.");

  const safeStage = normaliseStage(stage);

  try {
    const prompt = buildPrompt({
      condition,
      history,
      message: cleanMessage,
      stage: safeStage,
    });

    return await callGeminiWithKeyFailover(prompt);
  } catch (error) {
    console.error("Gemini final error:", getErrorMessage(error));
    return participantFallback(error);
  }
}

module.exports = { generateAIReply };
