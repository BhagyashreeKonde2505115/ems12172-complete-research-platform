const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    study_id: { type: String, required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, required: true },
    condition: { type: String },
    metrics: {
      charCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      responseLatencyMs: { type: Number, default: null },
      createdAtClient: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);