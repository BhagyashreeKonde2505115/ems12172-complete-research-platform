const mongoose = require("mongoose");
const EventLogSchema = new mongoose.Schema({
  study_id: { type: String, index: true },
  eventType: String,
  payload: Object,
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model("EventLog", EventLogSchema);
