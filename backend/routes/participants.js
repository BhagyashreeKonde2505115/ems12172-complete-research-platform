const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Participant = require("../models/Participant");
const EventLog = require("../models/EventLog");
const { assignBalancedCondition } = require("../services/conditionService");

const router = express.Router();

router.post("/start", async (req, res) => {
  try {
    const study_id = req.body.study_id || uuidv4();
    let participant = await Participant.findOne({ study_id });
    if (!participant) {
      const condition = await assignBalancedCondition(Participant);
      participant = await Participant.create({ study_id, condition, status: "started" });
      await EventLog.create({ study_id, eventType: "participant_started", payload: { condition } });
    }
    res.json({ study_id: participant.study_id, condition: participant.condition, status: participant.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start participant session" });
  }
});

router.post("/consent", async (req, res) => {
  try {
    const { study_id, consentChecks, demographics } = req.body;
    if (!study_id) return res.status(400).json({ error: "study_id required" });
    if (!Array.isArray(consentChecks) || !consentChecks.every(Boolean)) {
      return res.status(400).json({ error: "All consent boxes must be checked" });
    }
    const participant = await Participant.findOneAndUpdate(
      { study_id },
      { consent: { checked: consentChecks, consentedAt: new Date() }, demographics, status: "consented", updatedAt: new Date() },
      { new: true }
    );
    await EventLog.create({ study_id, eventType: "consent_completed", payload: { demographics } });
    res.json({ success: true, participant });
  } catch (err) {
    res.status(500).json({ error: "Consent save failed" });
  }
});

router.post("/event", async (req, res) => {
  try {
    const { study_id, eventType, payload } = req.body;
    await EventLog.create({ study_id, eventType, payload });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Event log failed" });
  }
});

module.exports = router;
