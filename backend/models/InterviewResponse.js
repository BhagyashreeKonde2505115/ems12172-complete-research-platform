const mongoose = require("mongoose");
const InterviewResponseSchema = new mongoose.Schema({
  study_id: { type: String, required: true, unique: true, index: true },
  answers: { type: Object, default: {} },
  lastIndex: { type: Number, default: 0 },
  isComplete: { type: Boolean, default: false },
  autosavedAt: Date,
  submittedAt: Date
});
module.exports = mongoose.model("InterviewResponse", InterviewResponseSchema);
