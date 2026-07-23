"use strict";

const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema(
  {
    study_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    condition: {
      type: String,
      enum: ["WC", "NI"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "started",
        "consented",
        "chat",
        "ai_unavailable",
        "incomplete",
        "questionnaire",
        "ai_literacy",
        "interview",
        "debrief",
        "thankyou",
        "completed",
        "finished",
        "withdrawn",
      ],
      default: "started",
      index: true,
    },

    demographics: {
      ageBand: {
        type: String,
        default: "",
      },

      gender: {
        type: String,
        default: "",
      },

      status: {
        type: String,
        default: "",
      },

      aiExperience: {
        type: String,
        default: "",
      },
    },

    aiLiteracy: {
      usedBefore: {
        type: String,
        default: "",
      },

      tools: {
        type: [String],
        default: [],
      },

      otherTool: {
        type: String,
        default: "",
      },

      mostUsed: {
        type: String,
        default: "",
      },

      frequency: {
        type: String,
        default: "",
      },

      duration: {
        type: String,
        default: "",
      },

      primaryUses: {
        type: [String],
        default: [],
      },

      otherPrimaryUse: {
        type: String,
        default: "",
      },

      items: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      baselineTrust: {
        type: Number,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },

    consent: {
      checked: {
        type: [Boolean],
        default: [],
      },

      consentedAt: {
        type: Date,
        default: null,
      },

      pisVersion: {
        type: String,
        default: "EMS12277-PIS-v3",
      },
    },

    chatStartedAt: {
      type: Date,
      default: null,
    },

    chatCompletedAt: {
      type: Date,
      default: null,
    },

    aiUnavailableAt: {
      type: Date,
      default: null,
    },

    incompleteAt: {
      type: Date,
      default: null,
    },

    incompleteReason: {
      type: String,
      default: "",
    },

    incompleteStage: {
      type: Number,
      min: 1,
      max: 4,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

ParticipantSchema.index({
  condition: 1,
  createdAt: -1,
});

ParticipantSchema.index({
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Participant",
  ParticipantSchema
);