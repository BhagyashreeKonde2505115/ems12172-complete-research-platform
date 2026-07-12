const express = require("express");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");

const Participant = require("../models/Participant");
const QuestionnaireResponse = require("../models/QuestionnaireResponse");
const InterviewResponse = require("../models/InterviewResponse");
const ChatMessage = require("../models/ChatMessage");
const EventLog = require("../models/EventLog");

const router = express.Router();

function checkAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;

  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: "Forbidden. Invalid admin key." });
  }

  next();
}

function safe(value) {
  return value === undefined || value === null ? "" : value;
}

function mean(values) {
  const nums = values.map(Number).filter((v) => !Number.isNaN(v));
  if (!nums.length) return "";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}

function calculateSUS(q = {}) {
  const values = [
    q.sus_1,
    q.sus_2,
    q.sus_3,
    q.sus_4,
    q.sus_5,
    q.sus_6,
    q.sus_7,
    q.sus_8,
    q.sus_9,
    q.sus_10,
  ].map(Number);

  if (values.some((v) => Number.isNaN(v))) return "";

  const score =
    (values[0] - 1) +
    (5 - values[1]) +
    (values[2] - 1) +
    (5 - values[3]) +
    (values[4] - 1) +
    (5 - values[5]) +
    (values[6] - 1) +
    (5 - values[7]) +
    (values[8] - 1) +
    (5 - values[9]);

  return score * 2.5;
}

function flattenQuestionnaire(q = {}) {
  return {
    trust_1: safe(q.trust_1),
    trust_2: safe(q.trust_2),
    trust_3: safe(q.trust_3),
    trust_4: safe(q.trust_4),
    trust_5: safe(q.trust_5),

    cse_1: safe(q.cse_1),
    cse_2: safe(q.cse_2),
    cse_3: safe(q.cse_3),
    cse_4: safe(q.cse_4),

    safety_1: safe(q.safety_1),
    safety_2: safe(q.safety_2),
    safety_3: safe(q.safety_3),
    safety_4: safe(q.safety_4),

    sus_1: safe(q.sus_1),
    sus_2: safe(q.sus_2),
    sus_3: safe(q.sus_3),
    sus_4: safe(q.sus_4),
    sus_5: safe(q.sus_5),
    sus_6: safe(q.sus_6),
    sus_7: safe(q.sus_7),
    sus_8: safe(q.sus_8),
    sus_9: safe(q.sus_9),
    sus_10: safe(q.sus_10),

    warmth: safe(q.warmth),
    task_focus: safe(q.task_focus),

    ux_1: safe(q.ux_1),
    ux_2: safe(q.ux_2),

    use_1: safe(q.use_1),
    use_2: safe(q.use_2),
  };
}

function flattenInterview(i = {}) {
  return {
    interview_q1_overall_experience: safe(i["0"]),
    interview_q2_trust_reliability: safe(i["1"]),
    interview_q3_creativity_ideation: safe(i["2"]),
    interview_q4_communication_style: safe(i["3"]),
    interview_q5_positive_experience: safe(i["4"]),
    interview_q6_design_future_use: safe(i["5"]),
    interview_q7_open_reflection: safe(i["6"]),
  };
}

function getResponseObject(record) {
  return record?.responses || record?.questionnaire || record?.interview || {};
}

router.get("/kpis", checkAdmin, async (req, res) => {
  try {
    const participants = await Participant.find({}).lean();
    const questionnaires = await QuestionnaireResponse.find({}).lean();
    const interviews = await InterviewResponse.find({}).lean();
    const chats = await ChatMessage.find({}).lean();

    const total = participants.length;

    const completed = participants.filter((p) =>
      ["completed", "thankyou", "finished"].includes(p.status)
    ).length;

    const wc = participants.filter((p) => p.condition === "WC").length;
    const ni = participants.filter((p) => p.condition === "NI").length;

    res.json({
      total,
      completed,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
      chats: chats.length,
      questionnaires: questionnaires.length,
      interviews: interviews.length,
      conditionBalance: { WC: wc, NI: ni },
    });
  } catch (err) {
    console.error("KPI route error:", err);
    res.status(500).json({
      error: "Failed to load KPIs",
      details: err.message,
    });
  }
});

router.get("/participants", checkAdmin, async (req, res) => {
  try {
    const participants = await Participant.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      participants.map((p) => ({
        study_id: p.study_id,
        condition: p.condition,
        status: p.status,
        ageBand: safe(p.demographics?.ageBand),
        gender: safe(p.demographics?.gender),
        aiExperience: safe(p.demographics?.aiExperience),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    );
  } catch (err) {
    console.error("Participants route error:", err);
    res.status(500).json({
      error: "Failed to load participants",
      details: err.message,
    });
  }
});

router.get("/export-csv", checkAdmin, async (req, res) => {
  try {
    const participants = await Participant.find({}).lean();
    const questionnaires = await QuestionnaireResponse.find({}).lean();
    const interviews = await InterviewResponse.find({}).lean();

    const qMap = new Map(
      questionnaires.map((q) => [q.study_id, getResponseObject(q)])
    );

    const iMap = new Map(
      interviews.map((i) => [i.study_id, getResponseObject(i)])
    );

    const rows = participants.map((p) => {
      const q = qMap.get(p.study_id) || {};
      const i = iMap.get(p.study_id) || {};

      return {
        study_id: p.study_id,
        condition: p.condition,
        status: p.status,
        ageBand: safe(p.demographics?.ageBand),
        gender: safe(p.demographics?.gender),
        aiExperience: safe(p.demographics?.aiExperience),
        createdAt: safe(p.createdAt),
        updatedAt: safe(p.updatedAt),

        trust_mean: mean([
          q.trust_1,
          q.trust_2,
          q.trust_3,
          q.trust_4,
          q.trust_5,
        ]),
        cse_mean: mean([q.cse_1, q.cse_2, q.cse_3, q.cse_4]),
        safety_mean: mean([
          q.safety_1,
          q.safety_2,
          q.safety_3,
          q.safety_4,
        ]),
        sus_score: calculateSUS(q),

        ...flattenQuestionnaire(q),
        ...flattenInterview(i),
      };
    });

    const csv = new Parser().parse(rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="EMS12277_participants.csv"`
    );

    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error("CSV export error:", err);
    res.status(500).json({
      error: "CSV export failed",
      details: err.message,
    });
  }
});

router.get("/export-excel", checkAdmin, async (req, res) => {
  try {
    const participants = await Participant.find({}).lean();
    const questionnaires = await QuestionnaireResponse.find({}).lean();
    const interviews = await InterviewResponse.find({}).lean();
    const chats = await ChatMessage.find({}).lean();

    const qMap = new Map(
      questionnaires.map((q) => [q.study_id, getResponseObject(q)])
    );

    const iMap = new Map(
      interviews.map((i) => [i.study_id, getResponseObject(i)])
    );

    const participantRows = participants.map((p) => {
      const q = qMap.get(p.study_id) || {};
      const i = iMap.get(p.study_id) || {};

      return {
        study_id: p.study_id,
        condition: p.condition,
        status: p.status,
        ageBand: safe(p.demographics?.ageBand),
        gender: safe(p.demographics?.gender),
        aiExperience: safe(p.demographics?.aiExperience),
        createdAt: safe(p.createdAt),
        updatedAt: safe(p.updatedAt),

        trust_mean: mean([
          q.trust_1,
          q.trust_2,
          q.trust_3,
          q.trust_4,
          q.trust_5,
        ]),
        cse_mean: mean([q.cse_1, q.cse_2, q.cse_3, q.cse_4]),
        safety_mean: mean([
          q.safety_1,
          q.safety_2,
          q.safety_3,
          q.safety_4,
        ]),
        sus_score: calculateSUS(q),

        ...flattenQuestionnaire(q),
        ...flattenInterview(i),
      };
    });

    const chatRows = chats.map((c) => ({
      study_id: c.study_id,
      condition: c.condition,
      role: c.role,
      text: c.text,
      charCount: safe(c.metrics?.charCount),
      wordCount: safe(c.metrics?.wordCount),
      responseLatencyMs: safe(c.metrics?.responseLatencyMs),
      createdAt: safe(c.createdAt),
      updatedAt: safe(c.updatedAt),
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(participantRows),
      "Participants"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(chatRows),
      "ChatMessages"
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="EMS12277_full_export.xlsx"`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({
      error: "Excel export failed",
      details: err.message,
    });
  }
});

router.delete("/erase-participant/:study_id", checkAdmin, async (req, res) => {
  try {
    const { study_id } = req.params;

    await Participant.deleteMany({ study_id });
    await QuestionnaireResponse.deleteMany({ study_id });
    await InterviewResponse.deleteMany({ study_id });
    await ChatMessage.deleteMany({ study_id });
    await EventLog.deleteMany({ study_id });

    res.json({
      success: true,
      message: `All data deleted for ${study_id}`,
    });
  } catch (err) {
    res.status(500).json({
      error: "Delete failed",
      details: err.message,
    });
  }
});

module.exports = router;