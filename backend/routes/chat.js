const express = require("express");
const Participant = require("../models/Participant");
const ChatMessage = require("../models/ChatMessage");
const EventLog = require("../models/EventLog");
const { generateAIReply } = require("../services/geminiService");

const router = express.Router();

function getTextMetrics(text) {
  const clean = text || "";
  return {
    charCount: clean.length,
    wordCount: clean.trim().split(/\s+/).filter(Boolean).length,
  };
}

router.post("/message", async (req, res) => {
  try {
    const { study_id, message, history } = req.body;

    if (!study_id || !message) {
      return res.status(400).json({
        error: "study_id and message required",
      });
    }

    const participant = await Participant.findOne({ study_id });

    if (!participant) {
      return res.status(404).json({
        error: "Participant not found",
        study_id,
      });
    }

    const start = Date.now();

    await ChatMessage.create({
      study_id,
      role: "user",
      text: message,
      condition: participant.condition,
      metrics: {
        ...getTextMetrics(message),
        responseLatencyMs: null,
      },
    });

    const reply = await generateAIReply(
      participant.condition,
      history || [],
      message
    );

    const latency = Date.now() - start;

    await ChatMessage.create({
      study_id,
      role: "assistant",
      text: reply,
      condition: participant.condition,
      metrics: {
        ...getTextMetrics(reply),
        responseLatencyMs: latency,
      },
    });

    await Participant.updateOne(
      { study_id },
      {
        status: "chat",
        updatedAt: new Date(),
      }
    );

    await EventLog.create({
      study_id,
      eventType: "chat_message",
      payload: {
        latencyMs: latency,
        userCharCount: message.length,
        userWordCount: getTextMetrics(message).wordCount,
        assistantCharCount: reply.length,
        assistantWordCount: getTextMetrics(reply).wordCount,
      },
    });

    res.json({
      reply,
      condition: participant.condition,
    });
  } catch (err) {
    console.error("CHAT ROUTE ERROR:", err);

    res.status(500).json({
      error: "Chat failed",
      details: err.message,
    });
  }
});

module.exports = router;