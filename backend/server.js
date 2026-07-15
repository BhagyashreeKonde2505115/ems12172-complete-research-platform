"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const participantRoutes = require("./routes/participants");
const chatRoutes = require("./routes/chat");
const responseRoutes = require("./routes/responses");
const adminRoutes = require("./routes/admin");

const app = express();

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Add it in Render Environment settings.");
  process.exit(1);
}

/* -------------------- CORS -------------------- */

const configuredOrigins = String(process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...configuredOrigins,
];

const corsOptions = {
  origin(origin, callback) {
    // Requests such as Render health checks and PowerShell tests may have no Origin header.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error("CORS blocked origin:", origin);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  credentials: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

/* -------------------- Middleware -------------------- */

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

/* -------------------- Health Routes -------------------- */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    study: process.env.ETHICS_REFERENCE || "EMS12277",
    service: "EMS12277 research backend",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    study: process.env.ETHICS_REFERENCE || "EMS12277",
  });
});

/* -------------------- API Routes -------------------- */

app.use("/api/participants", participantRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/admin", adminRoutes);

/* -------------------- 404 + Error Handling -------------------- */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (error.message?.startsWith("CORS blocked origin:")) {
    return res.status(403).json({ error: error.message });
  }

  return res.status(500).json({
    error: "Unexpected server error.",
    details:
      process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

/* -------------------- MongoDB + Server Start -------------------- */

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
      console.log("Allowed CORS origins:", allowedOrigins);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
