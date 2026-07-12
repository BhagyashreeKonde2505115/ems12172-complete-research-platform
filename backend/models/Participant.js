const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema({
  study_id: { type: String, required: true, unique: true, index: true },
  condition: { type: String, enum: ["WC", "NI"], required: true },
  status: { type: String, enum: ["started", "consented", "ai_literacy", "chat", "questionnaire", "interview", "completed", "withdrawn"], default: "started" },
  demographics: {
    ageBand: String,
    gender: String,
    status: String
  },
  aiLiteracy: {
    usedBefore: String,
    tools: [String],
    otherTool: String,
    mostUsed: String,
    frequency: String,
    duration: String,
    primaryUses: [String],
    items: { type: Object, default: {} },
    baselineTrust: Number,
    completedAt: Date
  },
  consent: {
    checked: [Boolean],
    consentedAt: Date,
    pisVersion: { type: String, default: "PIS-reduced-demand-characteristics-v2" }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date,
  withdrawnAt: Date
});

module.exports = mongoose.model("Participant", ParticipantSchema);
