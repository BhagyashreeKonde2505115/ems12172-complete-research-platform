const express = require("express");
const Participant = require("../models/Participant");
const QuestionnaireResponse = require("../models/QuestionnaireResponse");
const InterviewResponse = require("../models/InterviewResponse");
const EventLog = require("../models/EventLog");

const router = express.Router();

router.post("/questionnaire/autosave", async (req, res) => {
  try {
    const { study_id, responses, lastQuestionKey } = req.body;
    const doc = await QuestionnaireResponse.findOneAndUpdate(
      { study_id },
      { study_id, responses, lastQuestionKey, autosavedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ error: "Questionnaire autosave failed" });
  }
});

router.post("/questionnaire/submit", async (req, res) => {
  try {
    const { study_id, responses } = req.body;
    await QuestionnaireResponse.findOneAndUpdate(
      { study_id },
      { study_id, responses, isComplete: true, submittedAt: new Date() },
      { upsert: true }
    );
    await Participant.updateOne({ study_id }, { status: "questionnaire", updatedAt: new Date() });
    await EventLog.create({ study_id, eventType: "questionnaire_submitted", payload: {} });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Questionnaire submit failed" });
  }
});

router.post("/interview/autosave", async (req, res) => {
  try {
    const { study_id, answers, lastIndex } = req.body;
    const doc = await InterviewResponse.findOneAndUpdate(
      { study_id },
      { study_id, answers, lastIndex, autosavedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ error: "Interview autosave failed" });
  }
});

router.post("/interview/submit", async (req, res) => {
  try {
    const { study_id, answers } = req.body;
    await InterviewResponse.findOneAndUpdate(
      { study_id },
      { study_id, answers, isComplete: true, submittedAt: new Date() },
      { upsert: true }
    );
    await Participant.updateOne({ study_id }, { status: "completed", completedAt: new Date(), updatedAt: new Date() });
    await EventLog.create({ study_id, eventType: "interview_submitted", payload: {} });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Interview submit failed" });
  }
});

module.exports = router;
