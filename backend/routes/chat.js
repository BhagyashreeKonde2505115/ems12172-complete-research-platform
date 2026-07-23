"use strict";

const express = require("express");

const Participant = require("../models/Participant");
const ChatMessage = require("../models/ChatMessage");
const EventLog = require("../models/EventLog");
const {
  generateAIReply,
} = require("../services/geminiService");

const router = express.Router();

const STAGE_NAMES = {
  1: "Discover",
  2: "Develop",
  3: "Refine",
  4: "Consolidate",
};

function normaliseStage(value) {
  const numericStage = Number(value);
  if (!Number.isFinite(numericStage)) return 1;
  return Math.max(1, Math.min(4, Math.trunc(numericStage)));
}

function getTextMetrics(text) {
  const cleanText = String(text || "").trim();

  return {
    charCount: cleanText.length,
    wordCount: cleanText
      ? cleanText.split(/\s+/).filter(Boolean).length
      : 0,
  };
}

function normaliseHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (entry) =>
        entry &&
        ["user", "assistant"].includes(entry.role)
    )
    .map((entry) => ({
      role: entry.role,
      text: String(entry.text || entry.content || "").trim(),
    }))
    .filter((entry) => entry.text)
    .slice(-8);
}

router.post("/message", async (req, res) => {
  try {
    const {
      study_id,
      message,
      history,
      stage = 1,
    } = req.body;

    const cleanStudyId = String(study_id || "").trim();
    const cleanMessage = String(message || "").trim();

    if (!cleanStudyId || !cleanMessage) {
      return res.status(400).json({
        error: "study_id and message are required.",
      });
    }

    if (cleanMessage.length > 5000) {
      return res.status(400).json({
        error: "The message must be 5,000 characters or fewer.",
      });
    }

    const participant = await Participant.findOne({
      study_id: cleanStudyId,
    });

    if (!participant) {
      return res.status(404).json({
        error: "Participant not found.",
        study_id: cleanStudyId,
      });
    }

    const safeStage = normaliseStage(stage);
    const safeHistory = normaliseHistory(history);
    const requestStartedAt = Date.now();
    const userMetrics = getTextMetrics(cleanMessage);

    await ChatMessage.create({
      study_id: cleanStudyId,
      role: "user",
      text: cleanMessage,
      condition: participant.condition,
      stage: safeStage,
      metrics: {
        ...userMetrics,
        responseLatencyMs: null,
      },
    });

    const aiResult = await generateAIReply(
      participant.condition,
      safeHistory,
      cleanMessage,
      safeStage
    );

    const cleanReply = String(aiResult?.text || "").trim();

    if (!cleanReply) {
      throw new Error("The AI service returned an empty response.");
    }

    const latency = Date.now() - requestStartedAt;
    const assistantMetrics = getTextMetrics(cleanReply);

    await ChatMessage.create({
      study_id: cleanStudyId,
      role: "assistant",
      text: cleanReply,
      condition: participant.condition,
      stage: safeStage,
      provider: aiResult.provider || "gemini",
      model: aiResult.model || "",
      providerStatus: aiResult.providerStatus || "success",
      errorCategory: aiResult.errorCategory || "",
      aiAvailable: aiResult.aiAvailable !== false,
      keyIndex: aiResult.keyIndex || null,
      metrics: {
        ...assistantMetrics,
        responseLatencyMs: latency,
      },
    });

    if (aiResult.aiAvailable === false) {
      await Participant.updateOne(
        { study_id: cleanStudyId },
        {
          $set: {
            status: "ai_unavailable",
            aiUnavailableAt: new Date(),
            incompleteReason:
              aiResult.errorCategory || "ai_service_unavailable",
            incompleteStage: safeStage,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await Participant.updateOne(
        { study_id: cleanStudyId },
        {
          $set: {
            status: "chat",
            chatStartedAt: participant.chatStartedAt || new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    try {
      await EventLog.create({
        study_id: cleanStudyId,
        eventType:
          aiResult.aiAvailable === false
            ? "ai_service_unavailable"
            : "chat_message",
        payload: {
          stage: safeStage,
          stageName: STAGE_NAMES[safeStage],
          latencyMs: latency,
          aiAvailable: aiResult.aiAvailable !== false,
          provider: aiResult.provider || "gemini",
          model: aiResult.model || "",
          providerStatus: aiResult.providerStatus || "success",
          errorCategory: aiResult.errorCategory || "",
          keyIndex: aiResult.keyIndex || null,
          userCharCount: userMetrics.charCount,
          userWordCount: userMetrics.wordCount,
          assistantCharCount: assistantMetrics.charCount,
          assistantWordCount: assistantMetrics.wordCount,
        },
      });
    } catch (eventError) {
      console.error(
        "Chat event logging failed:",
        eventError.message
      );
    }

    return res.json({
      reply: cleanReply,
      condition: participant.condition,
      stage: safeStage,
      stageName: STAGE_NAMES[safeStage],
      aiAvailable: aiResult.aiAvailable !== false,
      providerStatus: aiResult.providerStatus || "success",
      errorCategory: aiResult.errorCategory || "",
    });
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);

    return res.status(500).json({
      error: "The AI assistant could not respond.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

module.exports = router;
