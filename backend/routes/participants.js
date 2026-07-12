"use strict";

const express = require("express");
const crypto = require("crypto");

const Participant = require(
  "../models/Participant"
);

const EventLog = require(
  "../models/EventLog"
);

const {
  assignBalancedCondition,
} = require(
  "../services/conditionService"
);

const router = express.Router();

/*
 * Generate a pseudonymous Study ID.
 *
 * Example:
 * EMS12277-20260712-A1B2C3
 */
function createStudyId() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const random =
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

  return `EMS12277-${date}-${random}`;
}

/*
 * POST /api/participants/start
 *
 * Creates a new participant,
 * generates a Study ID and assigns
 * WC or NI.
 */
router.post(
  "/start",
  async (req, res) => {
    try {
      let studyId =
        req.body?.study_id ||
        createStudyId();

      /*
       * Avoid an unlikely ID collision.
       */
      let existing =
        await Participant.findOne({
          study_id:
            studyId,
        });

      while (existing) {
        studyId =
          createStudyId();

        existing =
          await Participant.findOne({
            study_id:
              studyId,
          });
      }

      const condition =
        await assignBalancedCondition(
          Participant
        );

      const participant =
        await Participant.create({
          study_id:
            studyId,

          condition,

          status:
            "started",

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        });

      try {
        await EventLog.create({
          study_id:
            participant.study_id,

          eventType:
            "participant_started",

          payload: {
            condition:
              participant.condition,
          },
        });
      } catch (eventError) {
        /*
         * Do not fail participant creation
         * only because event logging failed.
         */
        console.error(
          "Participant start event logging failed:",
          eventError
        );
      }

      return res.status(201).json({
        study_id:
          participant.study_id,

        condition:
          participant.condition,

        status:
          participant.status,
      });
    } catch (error) {
      console.error(
        "Participant start failed:",
        error
      );

      return res.status(500).json({
        error:
          "Could not start participant session.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/*
 * POST /api/participants/consent
 *
 * Stores consent statements
 * and demographics.
 */
router.post(
  "/consent",
  async (req, res) => {
    try {
      const {
        study_id,
        consentChecks,
        demographics,
      } = req.body;

      if (!study_id) {
        return res.status(400).json({
          error:
            "Study ID is required.",
        });
      }

      if (
        !Array.isArray(
          consentChecks
        ) ||
        consentChecks.length ===
          0 ||
        !consentChecks.every(
          Boolean
        )
      ) {
        return res.status(400).json({
          error:
            "All consent statements must be accepted.",
        });
      }

      if (
        !demographics
          ?.ageBand ||
        !demographics
          ?.gender ||
        !demographics
          ?.status
      ) {
        return res.status(400).json({
          error:
            "All required demographic fields must be completed.",
        });
      }

      const participant =
        await Participant.findOneAndUpdate(
          {
            study_id,
          },

          {
            $set: {
              consent: {
                checked:
                  consentChecks,

                consentedAt:
                  new Date(),

                pisVersion:
                  "EMS12277-PIS-v2-reduced-demand-characteristics",
              },

              demographics: {
                ageBand:
                  demographics.ageBand,

                gender:
                  demographics.gender,

                status:
                  demographics.status,
              },

              status:
                "consented",

              updatedAt:
                new Date(),
            },
          },

          {
            new: true,
            runValidators: true,
          }
        );

      if (!participant) {
        return res.status(404).json({
          error:
            "Participant session was not found.",
        });
      }

      try {
        await EventLog.create({
          study_id,

          eventType:
            "consent_completed",

          payload: {
            demographics: {
              ageBand:
                demographics.ageBand,

              gender:
                demographics.gender,

              status:
                demographics.status,
            },
          },
        });
      } catch (eventError) {
        console.error(
          "Consent event logging failed:",
          eventError
        );
      }

      return res.json({
        success: true,

        study_id:
          participant.study_id,

        condition:
          participant.condition,

        status:
          participant.status,
      });
    } catch (error) {
      console.error(
        "Consent save failed:",
        error
      );

      return res.status(500).json({
        error:
          "Consent could not be saved.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/*
 * POST /api/participants/ai-literacy
 *
 * Stores pre-task AI experience
 * and literacy responses.
 */
router.post(
  "/ai-literacy",
  async (req, res) => {
    try {
      const {
        study_id,
        aiLiteracy,
      } = req.body;

      if (!study_id) {
        return res.status(400).json({
          error:
            "Study ID is required.",
        });
      }

      if (!aiLiteracy) {
        return res.status(400).json({
          error:
            "AI literacy responses are required.",
        });
      }

      if (
        !aiLiteracy
          .usedBefore ||
        !aiLiteracy
          .frequency ||
        !aiLiteracy
          .duration
      ) {
        return res.status(400).json({
          error:
            "Please complete the required AI experience questions.",
        });
      }

      if (
        aiLiteracy
          .baselineTrust ===
          undefined ||
        aiLiteracy
          .baselineTrust ===
          null ||
        aiLiteracy
          .baselineTrust ===
          ""
      ) {
        return res.status(400).json({
          error:
            "Baseline trust response is required.",
        });
      }

      const participant =
        await Participant.findOneAndUpdate(
          {
            study_id,
          },

          {
            $set: {
              aiLiteracy: {
                usedBefore:
                  aiLiteracy.usedBefore,

                tools:
                  Array.isArray(
                    aiLiteracy.tools
                  )
                    ? aiLiteracy.tools
                    : [],

                otherTool:
                  aiLiteracy.otherTool ||
                  "",

                mostUsed:
                  aiLiteracy.mostUsed ||
                  "",

                frequency:
                  aiLiteracy.frequency,

                duration:
                  aiLiteracy.duration,

                primaryUses:
                  Array.isArray(
                    aiLiteracy.primaryUses
                  )
                    ? aiLiteracy.primaryUses
                    : [],

                items:
                  aiLiteracy.items ||
                  {},

                baselineTrust:
                  Number(
                    aiLiteracy.baselineTrust
                  ),

                completedAt:
                  new Date(),
              },

              status:
                "ai_literacy",

              updatedAt:
                new Date(),
            },
          },

          {
            new: true,
            runValidators: true,
          }
        );

      if (!participant) {
        return res.status(404).json({
          error:
            "Participant session was not found.",
        });
      }

      try {
        await EventLog.create({
          study_id,

          eventType:
            "ai_literacy_completed",

          payload: {
            usedBefore:
              aiLiteracy.usedBefore,

            tools:
              aiLiteracy.tools ||
              [],

            mostUsed:
              aiLiteracy.mostUsed ||
              "",

            frequency:
              aiLiteracy.frequency,

            duration:
              aiLiteracy.duration,

            baselineTrust:
              Number(
                aiLiteracy.baselineTrust
              ),
          },
        });
      } catch (eventError) {
        console.error(
          "AI literacy event logging failed:",
          eventError
        );
      }

      return res.json({
        success: true,

        study_id:
          participant.study_id,

        condition:
          participant.condition,

        status:
          participant.status,
      });
    } catch (error) {
      console.error(
        "AI literacy save failed:",
        error
      );

      return res.status(500).json({
        error:
          "AI literacy responses could not be saved.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/*
 * POST /api/participants/event
 *
 * Saves non-sensitive participant
 * interaction events.
 */
router.post(
  "/event",
  async (req, res) => {
    try {
      const {
        study_id,
        eventType,
        payload = {},
      } = req.body;

      if (
        !study_id ||
        !eventType
      ) {
        return res.status(400).json({
          error:
            "Study ID and event type are required.",
        });
      }

      const participant =
        await Participant.findOne({
          study_id,
        });

      if (!participant) {
        return res.status(404).json({
          error:
            "Participant session was not found.",
        });
      }

      await EventLog.create({
        study_id,
        eventType,
        payload,
      });

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Event logging failed:",
        error
      );

      return res.status(500).json({
        error:
          "Event could not be recorded.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/*
 * GET /api/participants/:studyId
 *
 * Optional session lookup.
 */
router.get(
  "/:studyId",
  async (req, res) => {
    try {
      const participant =
        await Participant.findOne({
          study_id:
            req.params.studyId,
        }).lean();

      if (!participant) {
        return res.status(404).json({
          error:
            "Participant session was not found.",
        });
      }

      return res.json({
        study_id:
          participant.study_id,

        condition:
          participant.condition,

        status:
          participant.status,

        demographics:
          participant.demographics,

        aiLiteracy:
          participant.aiLiteracy,
      });
    } catch (error) {
      console.error(
        "Participant lookup failed:",
        error
      );

      return res.status(500).json({
        error:
          "Participant session could not be loaded.",
      });
    }
  }
);

module.exports = router;