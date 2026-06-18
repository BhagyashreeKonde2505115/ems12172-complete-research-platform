const mongoose = require("mongoose");
const QuestionnaireResponseSchema = new mongoose.Schema({
  study_id: { type: String, required: true, unique: true, index: true },
  responses: { type: Object, default: {} },
  lastQuestionKey: String,
  isComplete: { type: Boolean, default: false },
  autosavedAt: Date,
  submittedAt: Date
});
module.exports = mongoose.model("QuestionnaireResponse", QuestionnaireResponseSchema);
