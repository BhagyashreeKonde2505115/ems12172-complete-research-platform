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
  console.error("❌ MONGODB_URI is missing. Check backend/.env file.");
  process.exit(1);
}

/* -------------------- CORS -------------------- */

const allowedOrigins = [
  ...new Set([
    "http://localhost:5173",
    "http://localhost:5174",
    process.env.CLIENT_ORIGIN,
  ].filter(Boolean))
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("❌ CORS blocked origin:", origin);
        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

/* -------------------- Middleware -------------------- */

app.use(express.json({ limit: "5mb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

/* -------------------- Health Routes -------------------- */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    study: "EMS12172",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

/* -------------------- API Routes -------------------- */

app.use("/api/participants", participantRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/admin", adminRoutes);

/* -------------------- MongoDB + Server Start -------------------- */

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
      console.log("✅ Allowed CORS origins:", allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed", err.message);
    process.exit(1);
  });