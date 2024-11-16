// models/Incident.js
const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  text: { type: String, required: true },
  file: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Incident = mongoose.model("Incident", incidentSchema);

module.exports = Incident;
