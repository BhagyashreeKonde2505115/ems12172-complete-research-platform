"use strict";

const express = require("express");

const Participant = require("../models/Participant");
const ChatMessage = require("../models/ChatMessage");
const EventLog = require("../models/EventLog");

const {
  generateAIReply,
} = require("../services/geminiService");

const router = express.Router();

const STAGE_DEFINITIONS = {
  1: {
    key: "discover",
    name: "Discover",
    guidance: [
      "The participant is currently in Stage 1: Discover.",
      "Help the participant explore their task broadly.",
      "Clarify the task, identify goals and generate several possibilities.",
      "Do not rush towards one final answer.",
      "Finish with one relevant exploratory follow-up question.",
    ].join(" "),
  },

  2: {
    key: "develop",
    name: "Develop",
    guidance: [
      "The participant is currently in Stage 2: Develop.",
      "Help the participant select and expand the strongest ideas.",
      "Compare useful alternatives, advantages, limitations and practical requirements.",
      "Add meaningful detail without producing the final answer too early.",
      "Finish with one focused follow-up question.",
    ].join(" "),
  },

  3: {
    key: "refine",
    name: "Refine",
    guidance: [
      "The participant is currently in Stage 3: Refine.",
      "Help the participant identify weaknesses, risks, missing information and practical constraints.",
      "Improve feasibility, clarity and usefulness.",
      "Challenge unrealistic assumptions politely where appropriate.",
      "Finish with one practical follow-up question.",
    ].join(" "),
  },

  4: {
    key: "consolidate",
    name: "Consolidate",
    guidance: [
      "The participant is currently in Stage 4: Consolidate.",
      "Help the participant combine the strongest ideas into a clear final proposal, plan or solution.",
      "Summarise the main decisions and practical next steps.",
      "Use headings and a structured format.",
      "Finish with one brief invitation to make a final adjustment.",
    ].join(" "),
  },
};

const RESPONSE_FORMAT_GUIDANCE = [
  "Write a clean and structured response.",
  "Place each distinct idea on a separate line.",
  "Use short headings where useful.",
  "Use numbered steps or bullet points where useful.",
  "Avoid one long block of text.",
  "Do not mention the experimental condition or communication-style assignment.",
].join(" ");

function getTextMetrics(text) {
  const cleanText = String(text || "").trim();

  return {
    charCount: cleanText.length,
    wordCount: cleanText
      ? cleanText.split(/\s+/).filter(Boolean).length
      : 0,
  };
}

function normaliseStage(value) {
  const numericStage = Number(value);

  if (!Number.isFinite(numericStage)) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(4, Math.trunc(numericStage))
  );
}

function normaliseHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (entry) =>
        entry &&
        ["user", "assistant"].includes(entry.role)
    )
    .map((entry) => ({
      role: entry.role,
      text: String(
        entry.text ||
          entry.content ||
          ""
      ).trim(),
    }))
    .filter((entry) => entry.text)
    .slice(-16);
}

router.post("/message", async (req, res) => {
  try {
    const {
      study_id,
      message,
      history,
      stage = 1,
    } = req.body;

    const cleanStudyId = String(
      study_id || ""
    ).trim();

    const cleanMessage = String(
      message || ""
    ).trim();

    if (!cleanStudyId || !cleanMessage) {
      return res.status(400).json({
        error:
          "study_id and message are required.",
      });
    }

    if (cleanMessage.length > 5000) {
      return res.status(400).json({
        error:
          "The message must be 5,000 characters or fewer.",
      });
    }

    const participant =
      await Participant.findOne({
        study_id: cleanStudyId,
      });

    if (!participant) {
      return res.status(404).json({
        error: "Participant not found.",
        study_id: cleanStudyId,
      });
    }

    const safeStage =
      normaliseStage(stage);

    const stageDefinition =
      STAGE_DEFINITIONS[safeStage];

    const safeHistory =
      normaliseHistory(history);

    const requestStartedAt = Date.now();

    await ChatMessage.create({
      study_id: cleanStudyId,
      role: "user",
      text: cleanMessage,
      condition: participant.condition,
      stage: safeStage,
      metrics: {
        ...getTextMetrics(
          cleanMessage
        ),
        responseLatencyMs: null,
      },
    });

    /*
     * The stage guidance is added server-side so the
     * participant cannot alter the intended task structure.
     */
    const guidedMessage = [
      stageDefinition.guidance,
      RESPONSE_FORMAT_GUIDANCE,
      "",
      "Participant message:",
      cleanMessage,
    ].join("\n");

    const reply = await generateAIReply(
      participant.condition,
      safeHistory,
      guidedMessage,
      safeStage
    );

    const cleanReply = String(
      reply || ""
    ).trim();

    if (!cleanReply) {
      throw new Error(
        "The AI service returned an empty response."
      );
    }

    const latency =
      Date.now() - requestStartedAt;

    await ChatMessage.create({
      study_id: cleanStudyId,
      role: "assistant",
      text: cleanReply,
      condition: participant.condition,
      stage: safeStage,
      metrics: {
        ...getTextMetrics(
          cleanReply
        ),
        responseLatencyMs: latency,
      },
    });

    await Participant.updateOne(
      {
        study_id: cleanStudyId,
      },
      {
        $set: {
          status: "chat",
          updatedAt: new Date(),
        },
      }
    );

    try {
      await EventLog.create({
        study_id: cleanStudyId,
        eventType: "chat_message",
        payload: {
          latencyMs: latency,

          stage: safeStage,
          stageKey:
            stageDefinition.key,

          userCharCount:
            getTextMetrics(
              cleanMessage
            ).charCount,

          userWordCount:
            getTextMetrics(
              cleanMessage
            ).wordCount,

          assistantCharCount:
            getTextMetrics(
              cleanReply
            ).charCount,

          assistantWordCount:
            getTextMetrics(
              cleanReply
            ).wordCount,
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
      condition:
        participant.condition,
      stage: safeStage,
      stageName:
        stageDefinition.name,
    });
  } catch (error) {
    console.error(
      "CHAT ROUTE ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "The AI assistant could not respond.",
      details:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
});

module.exports = router;