const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema({
  study_id: { type: String, required: true, unique: true, index: true },
  condition: { type: String, enum: ["WC", "NI"], required: true },
  status: { type: String, enum: ["started", "consented", "chat", "questionnaire", "interview", "completed", "withdrawn"], default: "started" },
  demographics: {
    ageBand: String,
    gender: String,
    aiExperience: String
  },
  consent: {
    checked: [Boolean],
    consentedAt: Date,
    pisVersion: { type: String, default: "EMS12172-PIS-v1" }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date,
  withdrawnAt: Date
});

module.exports = mongoose.model("Participant", ParticipantSchema);
