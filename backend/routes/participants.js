"use strict";
const express = require("express");
const crypto = require("crypto");
const Participant = require("../models/Participant");
const EventLog = require("../models/EventLog");
const { assignBalancedCondition } = require("../services/conditionService");
const router = express.Router();

function createStudyId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `EMS12277-${date}-${random}`;
}

router.post("/start", async (_req, res) => {
  try {
    let study_id = createStudyId();
    while (await Participant.exists({ study_id })) study_id = createStudyId();
    const condition = await assignBalancedCondition(Participant);
    const participant = await Participant.create({ study_id, condition, status: "started", createdAt: new Date(), updatedAt: new Date() });
    try { await EventLog.create({ study_id, eventType: "participant_started", payload: { condition } }); } catch (e) { console.error("Event log failed:", e.message); }
    return res.status(201).json({ study_id: participant.study_id, condition: participant.condition, status: participant.status });
  } catch (err) {
    console.error("Participant start failed:", err);
    return res.status(500).json({ error: "Could not start participant session", details: process.env.NODE_ENV === "development" ? err.message : undefined });
  }
});

router.post("/consent", async (req, res) => {
  try {
    const { study_id, consentChecks, demographics } = req.body;
    if (!study_id) return res.status(400).json({ error: "study_id required" });
    if (!Array.isArray(consentChecks) || !consentChecks.length || !consentChecks.every(Boolean)) return res.status(400).json({ error: "All consent boxes must be checked" });
    if (!demographics?.ageBand || !demographics?.gender || !demographics?.status) return res.status(400).json({ error: "All demographic fields are required" });
    const participant = await Participant.findOneAndUpdate(
      { study_id },
      { $set: { consent: { checked: consentChecks, consentedAt: new Date(), pisVersion: "EMS12277-PIS-v3" }, demographics, status: "consented", updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!participant) return res.status(404).json({ error: "Participant not found" });
    try { await EventLog.create({ study_id, eventType: "consent_completed", payload: { demographics } }); } catch (e) { console.error("Event log failed:", e.message); }
    return res.json({ success: true, study_id, condition: participant.condition, status: participant.status });
  } catch (err) {
    console.error("Consent save failed:", err);
    return res.status(500).json({ error: "Consent save failed", details: process.env.NODE_ENV === "development" ? err.message : undefined });
  }
});

router.post("/ai-literacy", async (req, res) => {
  try {
    const { study_id, aiLiteracy } = req.body;
    if (!study_id) return res.status(400).json({ error: "study_id required" });
    if (!aiLiteracy || !aiLiteracy.usedBefore || !aiLiteracy.frequency || !aiLiteracy.duration || aiLiteracy.baselineTrust === undefined || aiLiteracy.baselineTrust === null || aiLiteracy.baselineTrust === "") return res.status(400).json({ error: "Required AI literacy responses are missing" });
    const participant = await Participant.findOneAndUpdate(
      { study_id },
      { $set: { aiLiteracy: { ...aiLiteracy, baselineTrust: Number(aiLiteracy.baselineTrust), completedAt: new Date() }, status: "ai_literacy", updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!participant) return res.status(404).json({ error: "Participant not found" });
    try { await EventLog.create({ study_id, eventType: "ai_literacy_completed", payload: { tools: aiLiteracy.tools || [], frequency: aiLiteracy.frequency } }); } catch (e) { console.error("Event log failed:", e.message); }
    return res.json({ success: true, study_id, condition: participant.condition, status: participant.status });
  } catch (err) {
    console.error("AI literacy save failed:", err);
    return res.status(500).json({ error: "AI literacy save failed", details: process.env.NODE_ENV === "development" ? err.message : undefined });
  }
});


router.post("/mark-incomplete", async (req, res) => {
  try {
    const {
      study_id,
      reason = "participant_did_not_complete",
      stage = null,
      participantMessages = 0,
    } = req.body;

    if (!study_id) {
      return res.status(400).json({
        error: "study_id required",
      });
    }

    const numericStage = Number(stage);
    const safeStage =
      Number.isFinite(numericStage) &&
      numericStage >= 1 &&
      numericStage <= 4
        ? Math.trunc(numericStage)
        : null;

    const participant = await Participant.findOneAndUpdate(
      { study_id },
      {
        $set: {
          status: "incomplete",
          incompleteAt: new Date(),
          incompleteReason: String(reason || "participant_did_not_complete"),
          incompleteStage: safeStage,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!participant) {
      return res.status(404).json({
        error: "Participant not found",
      });
    }

    try {
      await EventLog.create({
        study_id,
        eventType: "study_incomplete",
        payload: {
          reason,
          stage: safeStage,
          participantMessages: Number(participantMessages) || 0,
        },
      });
    } catch (eventError) {
      console.error("Incomplete event log failed:", eventError.message);
    }

    return res.json({
      success: true,
      status: participant.status,
    });
  } catch (error) {
    console.error("Mark incomplete failed:", error);

    return res.status(500).json({
      error: "Could not mark participant as incomplete",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

router.post("/event", async (req, res) => {
  try {
    const { study_id, eventType, payload = {} } = req.body;
    if (!study_id || !eventType) return res.status(400).json({ error: "study_id and eventType required" });
    if (!(await Participant.exists({ study_id }))) return res.status(404).json({ error: "Participant not found" });
    await EventLog.create({ study_id, eventType, payload });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Event log failed" });
  }
});

module.exports = router;
