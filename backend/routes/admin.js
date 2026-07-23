"use strict";

const express = require("express");
const {
  Parser,
} = require("json2csv");

const XLSX = require("xlsx");

const Participant = require("../models/Participant");
const QuestionnaireResponse = require("../models/QuestionnaireResponse");
const InterviewResponse = require("../models/InterviewResponse");
const ChatMessage = require("../models/ChatMessage");
const EventLog = require("../models/EventLog");

const router = express.Router();

const STAGE_NAMES = {
  1: "Discover",
  2: "Develop",
  3: "Refine",
  4: "Consolidate",
};

function checkAdmin(
  req,
  res,
  next
) {
  const key =
    req.headers["x-admin-key"] ||
    req.query.key;

  if (
    !process.env.ADMIN_API_KEY
  ) {
    return res.status(500).json({
      error:
        "ADMIN_API_KEY is not configured on the server.",
    });
  }

  if (
    !key ||
    key !==
      process.env.ADMIN_API_KEY
  ) {
    return res.status(403).json({
      error:
        "Forbidden. Invalid admin key.",
    });
  }

  next();
}

function safe(value) {
  return value === undefined ||
    value === null
    ? ""
    : value;
}

function numericValues(values) {
  return values
    .map(Number)
    .filter(
      (value) =>
        Number.isFinite(value)
    );
}

function mean(values) {
  const numbers =
    numericValues(values);

  if (!numbers.length) {
    return "";
  }

  return (
    numbers.reduce(
      (total, value) =>
        total + value,
      0
    ) / numbers.length
  ).toFixed(2);
}

function sum(values) {
  return numericValues(
    values
  ).reduce(
    (total, value) =>
      total + value,
    0
  );
}

function getStageNumber(value) {
  const numericStage =
    Number(value);

  if (
    Number.isFinite(
      numericStage
    ) &&
    numericStage >= 1 &&
    numericStage <= 4
  ) {
    return Math.trunc(
      numericStage
    );
  }

  return "";
}

function getStageName(value) {
  const stage =
    getStageNumber(value);

  return stage
    ? STAGE_NAMES[stage]
    : "Unknown";
}

function calculateSUS(
  questionnaire = {}
) {
  const values = [
    questionnaire.sus_1,
    questionnaire.sus_2,
    questionnaire.sus_3,
    questionnaire.sus_4,
    questionnaire.sus_5,
    questionnaire.sus_6,
    questionnaire.sus_7,
    questionnaire.sus_8,
    questionnaire.sus_9,
    questionnaire.sus_10,
  ].map(Number);

  if (
    values.length !== 10 ||
    values.some(
      (value) =>
        !Number.isFinite(value)
    )
  ) {
    return "";
  }

  const score =
    (values[0] - 1) +
    (5 - values[1]) +
    (values[2] - 1) +
    (5 - values[3]) +
    (values[4] - 1) +
    (5 - values[5]) +
    (values[6] - 1) +
    (5 - values[7]) +
    (values[8] - 1) +
    (5 - values[9]);

  return score * 2.5;
}


function calculateUXLite(questionnaire = {}) {
  const ease = Number(questionnaire.ux_lite_ease);
  const usefulness = Number(questionnaire.ux_lite_usefulness);

  if (!Number.isFinite(ease) || !Number.isFinite(usefulness)) {
    return "";
  }

  const easeScore = (ease - 1) * 25;
  const usefulnessScore = (usefulness - 1) * 25;

  return ((easeScore + usefulnessScore) / 2).toFixed(2);
}

function estimateSUSFromUXLite(questionnaire = {}) {
  const ease = Number(questionnaire.ux_lite_ease);

  if (!Number.isFinite(ease)) {
    return "";
  }

  return (-2.279 + 19.2 * ease).toFixed(2);
}

function flattenQuestionnaire(
  questionnaire = {}
) {
  return {
    trust_1: safe(
      questionnaire.trust_1
    ),
    trust_2: safe(
      questionnaire.trust_2
    ),
    trust_3: safe(
      questionnaire.trust_3
    ),
    trust_4: safe(
      questionnaire.trust_4
    ),
    trust_5: safe(
      questionnaire.trust_5
    ),

    cse_1: safe(
      questionnaire.cse_1
    ),
    cse_2: safe(
      questionnaire.cse_2
    ),
    cse_3: safe(
      questionnaire.cse_3
    ),
    cse_4: safe(
      questionnaire.cse_4
    ),

    safety_1: safe(
      questionnaire.safety_1
    ),
    safety_2: safe(
      questionnaire.safety_2
    ),
    safety_3: safe(
      questionnaire.safety_3
    ),
    safety_4: safe(
      questionnaire.safety_4
    ),

    ux_lite_ease: safe(
      questionnaire.ux_lite_ease
    ),

    ux_lite_usefulness: safe(
      questionnaire.ux_lite_usefulness
    ),

    legacy_sus_1: safe(questionnaire.sus_1),
    legacy_sus_2: safe(questionnaire.sus_2),
    legacy_sus_3: safe(questionnaire.sus_3),
    legacy_sus_4: safe(questionnaire.sus_4),
    legacy_sus_5: safe(questionnaire.sus_5),
    legacy_sus_6: safe(questionnaire.sus_6),
    legacy_sus_7: safe(questionnaire.sus_7),
    legacy_sus_8: safe(questionnaire.sus_8),
    legacy_sus_9: safe(questionnaire.sus_9),
    legacy_sus_10: safe(questionnaire.sus_10),

    warmth: safe(
      questionnaire.warmth
    ),

    task_focus: safe(
      questionnaire.task_focus
    ),

    ux_1: safe(
      questionnaire.ux_1
    ),
    ux_2: safe(
      questionnaire.ux_2
    ),

    use_1: safe(
      questionnaire.use_1
    ),
    use_2: safe(
      questionnaire.use_2
    ),

    supportive: safe(
      questionnaire.supportive
    ),

    professional: safe(
      questionnaire.professional
    ),

    clarity: safe(
      questionnaire.clarity
    ),

    follow_up: safe(
      questionnaire.follow_up
    ),
  };
}

function flattenInterview(
  interview = {}
) {
  return {
    interview_q1_overall_experience:
      safe(interview["0"]),

    interview_q2_trust_reliability:
      safe(interview["1"]),

    interview_q3_creativity_ideation:
      safe(interview["2"]),

    interview_q4_communication_style:
      safe(interview["3"]),

    interview_q5_positive_experience:
      safe(interview["4"]),

    interview_q6_design_future_use:
      safe(interview["5"]),

    interview_q7_open_reflection:
      safe(interview["6"]),
  };
}

function getResponseObject(
  record
) {
  return (
    record?.responses ||
    record?.questionnaire ||
    record?.interview ||
    {}
  );
}

function getAiLiteracyFields(
  participant
) {
  const literacy =
    participant?.aiLiteracy ||
    {};

  return {
    aiUsedBefore: safe(
      literacy.usedBefore ||
        participant?.demographics
          ?.aiExperience
    ),

    aiTools: Array.isArray(
      literacy.tools
    )
      ? literacy.tools.join("; ")
      : "",

    mostUsedAI: safe(
      literacy.mostUsed
    ),

    aiFrequency: safe(
      literacy.frequency
    ),

    aiDuration: safe(
      literacy.duration
    ),

    aiPrimaryUses: Array.isArray(
      literacy.primaryUses
    )
      ? literacy.primaryUses.join("; ")
      : "",

    aiOtherPrimaryUse: safe(
      literacy.otherPrimaryUse
    ),

    baselineAITrust: safe(
      literacy.baselineTrust
    ),
  };
}

function buildChatRows(chats) {
  return chats
    .slice()
    .sort(
      (first, second) =>
        new Date(
          first.createdAt
        ) -
        new Date(
          second.createdAt
        )
    )
    .map(
      (chat, index) => ({
        study_id:
          chat.study_id,

        condition:
          safe(chat.condition),

        stage:
          getStageNumber(
            chat.stage
          ),

        stage_name:
          getStageName(
            chat.stage
          ),

        message_sequence:
          index + 1,

        role:
          chat.role,

        text:
          chat.text,

        provider: safe(
          chat.provider
        ),

        model: safe(
          chat.model
        ),

        providerStatus: safe(
          chat.providerStatus
        ),

        errorCategory: safe(
          chat.errorCategory
        ),

        aiAvailable:
          chat.aiAvailable === undefined
            ? ""
            : chat.aiAvailable,

        keyIndex: safe(
          chat.keyIndex
        ),

        charCount:
          safe(
            chat.metrics
              ?.charCount
          ),

        wordCount:
          safe(
            chat.metrics
              ?.wordCount
          ),

        responseLatencyMs:
          safe(
            chat.metrics
              ?.responseLatencyMs
          ),

        createdAtClient:
          safe(
            chat.metrics
              ?.createdAtClient
          ),

        createdAt:
          safe(
            chat.createdAt
          ),

        updatedAt:
          safe(
            chat.updatedAt
          ),
      })
    );
}

function buildParticipantChatMetrics(
  chats
) {
  const metricsMap =
    new Map();

  for (const chat of chats) {
    const studyId =
      chat.study_id;

    if (
      !metricsMap.has(
        studyId
      )
    ) {
      metricsMap.set(
        studyId,
        {
          all: [],
          stages: {
            1: [],
            2: [],
            3: [],
            4: [],
          },
        }
      );
    }

    const entry =
      metricsMap.get(
        studyId
      );

    entry.all.push(chat);

    const stage =
      getStageNumber(
        chat.stage
      );

    if (stage) {
      entry.stages[
        stage
      ].push(chat);
    }
  }

  return metricsMap;
}

function calculateChatMetrics(
  chats = []
) {
  const userMessages =
    chats.filter(
      (chat) =>
        chat.role === "user"
    );

  const assistantMessages =
    chats.filter(
      (chat) =>
        chat.role ===
        "assistant"
    );

  const latencyValues =
    assistantMessages
      .map(
        (chat) =>
          chat.metrics
            ?.responseLatencyMs
      )
      .filter(
        (value) =>
          Number.isFinite(
            Number(value)
          )
      );

  const timestamps = chats
    .map(
      (chat) =>
        new Date(
          chat.createdAt
        ).getTime()
    )
    .filter(
      Number.isFinite
    )
    .sort(
      (a, b) => a - b
    );

  const durationSeconds =
    timestamps.length >= 2
      ? Math.round(
          (timestamps[
            timestamps.length - 1
          ] -
            timestamps[0]) /
            1000
        )
      : "";

  return {
    totalMessages:
      chats.length,

    userMessages:
      userMessages.length,

    assistantMessages:
      assistantMessages.length,

    userWords: sum(
      userMessages.map(
        (chat) =>
          chat.metrics
            ?.wordCount
      )
    ),

    assistantWords: sum(
      assistantMessages.map(
        (chat) =>
          chat.metrics
            ?.wordCount
      )
    ),

    totalWords: sum(
      chats.map(
        (chat) =>
          chat.metrics
            ?.wordCount
      )
    ),

    averageUserWords:
      mean(
        userMessages.map(
          (chat) =>
            chat.metrics
              ?.wordCount
        )
      ),

    averageAssistantWords:
      mean(
        assistantMessages.map(
          (chat) =>
            chat.metrics
              ?.wordCount
        )
      ),

    averageLatencyMs:
      mean(latencyValues),

    durationSeconds,
  };
}

function buildStageSummaryRows(
  participants,
  chats
) {
  const participantMap =
    new Map(
      participants.map(
        (participant) => [
          participant.study_id,
          participant,
        ]
      )
    );

  const grouped =
    new Map();

  for (const chat of chats) {
    const stage =
      getStageNumber(
        chat.stage
      );

    if (!stage) {
      continue;
    }

    const key =
      `${chat.study_id}::${stage}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped
      .get(key)
      .push(chat);
  }

  return Array.from(
    grouped.entries()
  )
    .map(
      ([key, stageChats]) => {
        const [
          studyId,
          stageValue,
        ] = key.split("::");

        const stage =
          Number(stageValue);

        const participant =
          participantMap.get(
            studyId
          );

        const metrics =
          calculateChatMetrics(
            stageChats
          );

        return {
          study_id:
            studyId,

          condition:
            safe(
              participant
                ?.condition ||
                stageChats[0]
                  ?.condition
            ),

          stage,

          stage_name:
            getStageName(stage),

          total_messages:
            metrics.totalMessages,

          participant_messages:
            metrics.userMessages,

          assistant_messages:
            metrics.assistantMessages,

          participant_words:
            metrics.userWords,

          assistant_words:
            metrics.assistantWords,

          total_words:
            metrics.totalWords,

          average_participant_words:
            metrics.averageUserWords,

          average_assistant_words:
            metrics.averageAssistantWords,

          average_ai_latency_ms:
            metrics.averageLatencyMs,

          stage_observed_duration_seconds:
            metrics.durationSeconds,
        };
      }
    )
    .sort(
      (first, second) =>
        first.study_id.localeCompare(
          second.study_id
        ) ||
        first.stage -
          second.stage
    );
}

function buildConditionStageSummary(
  stageSummaryRows
) {
  const grouped =
    new Map();

  for (
    const row of
    stageSummaryRows
  ) {
    const key =
      `${row.condition}::${row.stage}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped
      .get(key)
      .push(row);
  }

  return Array.from(
    grouped.entries()
  )
    .map(
      ([key, rows]) => {
        const [
          condition,
          stageValue,
        ] = key.split("::");

        const stage =
          Number(stageValue);

        return {
          condition,

          stage,

          stage_name:
            getStageName(stage),

          participants:
            new Set(
              rows.map(
                (row) =>
                  row.study_id
              )
            ).size,

          total_messages:
            sum(
              rows.map(
                (row) =>
                  row.total_messages
              )
            ),

          participant_messages:
            sum(
              rows.map(
                (row) =>
                  row.participant_messages
              )
            ),

          assistant_messages:
            sum(
              rows.map(
                (row) =>
                  row.assistant_messages
              )
            ),

          participant_words:
            sum(
              rows.map(
                (row) =>
                  row.participant_words
              )
            ),

          assistant_words:
            sum(
              rows.map(
                (row) =>
                  row.assistant_words
              )
            ),

          mean_participant_messages:
            mean(
              rows.map(
                (row) =>
                  row.participant_messages
              )
            ),

          mean_assistant_messages:
            mean(
              rows.map(
                (row) =>
                  row.assistant_messages
              )
            ),

          mean_participant_words:
            mean(
              rows.map(
                (row) =>
                  row.participant_words
              )
            ),

          mean_assistant_words:
            mean(
              rows.map(
                (row) =>
                  row.assistant_words
              )
            ),

          mean_ai_latency_ms:
            mean(
              rows.map(
                (row) =>
                  row.average_ai_latency_ms
              )
            ),
        };
      }
    )
    .sort(
      (first, second) =>
        first.condition.localeCompare(
          second.condition
        ) ||
        first.stage -
          second.stage
    );
}

function buildParticipantRows({
  participants,
  questionnaires,
  interviews,
  chats,
}) {
  const questionnaireMap =
    new Map(
      questionnaires.map(
        (record) => [
          record.study_id,
          getResponseObject(
            record
          ),
        ]
      )
    );

  const interviewMap =
    new Map(
      interviews.map(
        (record) => [
          record.study_id,
          getResponseObject(
            record
          ),
        ]
      )
    );

  const chatMetricsMap =
    buildParticipantChatMetrics(
      chats
    );

  return participants.map(
    (participant) => {
      const questionnaire =
        questionnaireMap.get(
          participant.study_id
        ) || {};

      const interview =
        interviewMap.get(
          participant.study_id
        ) || {};

      const chatEntry =
        chatMetricsMap.get(
          participant.study_id
        ) || {
          all: [],
          stages: {
            1: [],
            2: [],
            3: [],
            4: [],
          },
        };

      const overallChat =
        calculateChatMetrics(
          chatEntry.all
        );

      const discover =
        calculateChatMetrics(
          chatEntry.stages[1]
        );

      const develop =
        calculateChatMetrics(
          chatEntry.stages[2]
        );

      const refine =
        calculateChatMetrics(
          chatEntry.stages[3]
        );

      const consolidate =
        calculateChatMetrics(
          chatEntry.stages[4]
        );

      return {
        study_id:
          participant.study_id,

        condition:
          participant.condition,

        status:
          participant.status,

        incompleteReason: safe(
          participant.incompleteReason
        ),

        incompleteStage: safe(
          participant.incompleteStage
        ),

        incompleteAt: safe(
          participant.incompleteAt
        ),

        aiUnavailableAt: safe(
          participant.aiUnavailableAt
        ),

        ageBand: safe(
          participant
            .demographics
            ?.ageBand
        ),

        gender: safe(
          participant
            .demographics
            ?.gender
        ),

        employmentStatus:
          safe(
            participant
              .demographics
              ?.status
          ),

        ...getAiLiteracyFields(
          participant
        ),

        createdAt: safe(
          participant.createdAt
        ),

        updatedAt: safe(
          participant.updatedAt
        ),

        trust_mean: mean([
          questionnaire.trust_1,
          questionnaire.trust_2,
          questionnaire.trust_3,
          questionnaire.trust_4,
          questionnaire.trust_5,
        ]),

        cse_mean: mean([
          questionnaire.cse_1,
          questionnaire.cse_2,
          questionnaire.cse_3,
          questionnaire.cse_4,
        ]),

        safety_mean: mean([
          questionnaire.safety_1,
          questionnaire.safety_2,
          questionnaire.safety_3,
          questionnaire.safety_4,
        ]),

        ux_lite_score:
          calculateUXLite(
            questionnaire
          ),

        estimated_sus_from_ux_lite:
          estimateSUSFromUXLite(
            questionnaire
          ),

        legacy_sus_score:
          calculateSUS(
            questionnaire
          ),

        chat_total_messages:
          overallChat.totalMessages,

        chat_participant_messages:
          overallChat.userMessages,

        chat_assistant_messages:
          overallChat.assistantMessages,

        chat_participant_words:
          overallChat.userWords,

        chat_assistant_words:
          overallChat.assistantWords,

        chat_total_words:
          overallChat.totalWords,

        chat_average_participant_words:
          overallChat.averageUserWords,

        chat_average_assistant_words:
          overallChat.averageAssistantWords,

        chat_average_ai_latency_ms:
          overallChat.averageLatencyMs,

        chat_observed_duration_seconds:
          overallChat.durationSeconds,

        discover_participant_messages:
          discover.userMessages,

        discover_assistant_messages:
          discover.assistantMessages,

        discover_participant_words:
          discover.userWords,

        discover_assistant_words:
          discover.assistantWords,

        discover_average_ai_latency_ms:
          discover.averageLatencyMs,

        develop_participant_messages:
          develop.userMessages,

        develop_assistant_messages:
          develop.assistantMessages,

        develop_participant_words:
          develop.userWords,

        develop_assistant_words:
          develop.assistantWords,

        develop_average_ai_latency_ms:
          develop.averageLatencyMs,

        refine_participant_messages:
          refine.userMessages,

        refine_assistant_messages:
          refine.assistantMessages,

        refine_participant_words:
          refine.userWords,

        refine_assistant_words:
          refine.assistantWords,

        refine_average_ai_latency_ms:
          refine.averageLatencyMs,

        consolidate_participant_messages:
          consolidate.userMessages,

        consolidate_assistant_messages:
          consolidate.assistantMessages,

        consolidate_participant_words:
          consolidate.userWords,

        consolidate_assistant_words:
          consolidate.assistantWords,

        consolidate_average_ai_latency_ms:
          consolidate.averageLatencyMs,

        ...flattenQuestionnaire(
          questionnaire
        ),

        ...flattenInterview(
          interview
        ),
      };
    }
  );
}

/* ---------------- KPIs ---------------- */

router.get(
  "/kpis",
  checkAdmin,
  async (req, res) => {
    try {
      const [
        participants,
        questionnaires,
        interviews,
        chats,
      ] = await Promise.all([
        Participant.find({}).lean(),

        QuestionnaireResponse.find(
          {}
        ).lean(),

        InterviewResponse.find(
          {}
        ).lean(),

        ChatMessage.find({}).lean(),
      ]);

      const total =
        participants.length;

      const completed =
        participants.filter(
          (participant) =>
            [
              "completed",
              "thankyou",
              "finished",
            ].includes(
              participant.status
            )
        ).length;

      const wc =
        participants.filter(
          (participant) =>
            participant.condition ===
            "WC"
        ).length;

      const ni =
        participants.filter(
          (participant) =>
            participant.condition ===
            "NI"
        ).length;

      const overallMetrics =
        calculateChatMetrics(
          chats
        );

      const stageSummary =
        buildStageSummaryRows(
          participants,
          chats
        );

      const stageTotals = {};

      for (
        const stage of
        [1, 2, 3, 4]
      ) {
        const rows =
          stageSummary.filter(
            (row) =>
              row.stage === stage
          );

        stageTotals[
          STAGE_NAMES[stage]
        ] = {
          participants:
            new Set(
              rows.map(
                (row) =>
                  row.study_id
              )
            ).size,

          messages: sum(
            rows.map(
              (row) =>
                row.total_messages
            )
          ),

          participantWords:
            sum(
              rows.map(
                (row) =>
                  row.participant_words
            )
          ),

          assistantWords:
            sum(
              rows.map(
                (row) =>
                  row.assistant_words
            )
          ),

          averageLatencyMs:
            mean(
              rows.map(
                (row) =>
                  row.average_ai_latency_ms
              )
            ),
        };
      }

      return res.json({
        total,
        completed,

        dropout:
          Math.max(
            0,
            total - completed
          ),

        completionRate:
          total === 0
            ? 0
            : Math.round(
                (completed /
                  total) *
                  100
              ),

        dropoutRate:
          total === 0
            ? 0
            : Math.round(
                ((total -
                  completed) /
                  total) *
                  100
              ),

        chats:
          chats.length,

        questionnaires:
          questionnaires.length,

        interviews:
          interviews.length,

        conditionBalance: {
          WC: wc,
          NI: ni,
        },

        chatMetrics: {
          totalMessages:
            overallMetrics.totalMessages,

          participantMessages:
            overallMetrics.userMessages,

          assistantMessages:
            overallMetrics.assistantMessages,

          participantWords:
            overallMetrics.userWords,

          assistantWords:
            overallMetrics.assistantWords,

          averageParticipantWords:
            overallMetrics.averageUserWords,

          averageAssistantWords:
            overallMetrics.averageAssistantWords,

          averageLatencyMs:
            overallMetrics.averageLatencyMs,
        },

        stageMetrics:
          stageTotals,
      });
    } catch (error) {
      console.error(
        "KPI route error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to load KPIs.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/* ---------------- Participants ---------------- */

router.get(
  "/participants",
  checkAdmin,
  async (req, res) => {
    try {
      const search =
        String(
          req.query.search ||
            ""
        ).trim();

      const filter = search
        ? {
            study_id: {
              $regex: search,
              $options: "i",
            },
          }
        : {};

      const participants =
        await Participant.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.json(
        participants.map(
          (participant) => ({
            study_id:
              participant.study_id,

            condition:
              participant.condition,

            status:
              participant.status,

            ageBand: safe(
              participant
                .demographics
                ?.ageBand
            ),

            gender: safe(
              participant
                .demographics
                ?.gender
            ),

            employmentStatus:
              safe(
                participant
                  .demographics
                  ?.status
              ),

            ...getAiLiteracyFields(
              participant
            ),

            createdAt:
              participant.createdAt,

            updatedAt:
              participant.updatedAt,
          })
        )
      );
    } catch (error) {
      console.error(
        "Participants route error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to load participants.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/* ---------------- CSV Export ---------------- */

router.get(
  "/export-csv",
  checkAdmin,
  async (req, res) => {
    try {
      const [
        participants,
        questionnaires,
        interviews,
        chats,
      ] = await Promise.all([
        Participant.find({}).lean(),

        QuestionnaireResponse.find(
          {}
        ).lean(),

        InterviewResponse.find(
          {}
        ).lean(),

        ChatMessage.find({}).lean(),
      ]);

      const rows =
        buildParticipantRows({
          participants,
          questionnaires,
          interviews,
          chats,
        });

      const csv =
        rows.length > 0
          ? new Parser().parse(
              rows
            )
          : "";

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="EMS12277_participants_with_stage_metrics.csv"'
      );

      return res.send(
        "\uFEFF" + csv
      );
    } catch (error) {
      console.error(
        "CSV export error:",
        error
      );

      return res.status(500).json({
        error:
          "CSV export failed.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/* ---------------- Excel Export ---------------- */

router.get(
  "/export-excel",
  checkAdmin,
  async (req, res) => {
    try {
      const [
        participants,
        questionnaires,
        interviews,
        chats,
      ] = await Promise.all([
        Participant.find({}).lean(),

        QuestionnaireResponse.find(
          {}
        ).lean(),

        InterviewResponse.find(
          {}
        ).lean(),

        ChatMessage.find({}).lean(),
      ]);

      const participantRows =
        buildParticipantRows({
          participants,
          questionnaires,
          interviews,
          chats,
        });

      const chatRows =
        buildChatRows(chats);

      const stageSummaryRows =
        buildStageSummaryRows(
          participants,
          chats
        );

      const conditionStageRows =
        buildConditionStageSummary(
          stageSummaryRows
        );

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          participantRows
        ),
        "Participants"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          chatRows
        ),
        "ChatMessages"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          stageSummaryRows
        ),
        "StageSummary"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          conditionStageRows
        ),
        "ConditionStageSummary"
      );

      const buffer =
        XLSX.write(
          workbook,
          {
            type: "buffer",
            bookType: "xlsx",
          }
        );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="EMS12277_full_research_export.xlsx"'
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return res.send(
        buffer
      );
    } catch (error) {
      console.error(
        "Excel export error:",
        error
      );

      return res.status(500).json({
        error:
          "Excel export failed.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/* ---------------- GDPR Erasure ---------------- */

router.delete(
  "/erase-participant/:study_id",
  checkAdmin,
  async (req, res) => {
    try {
      const studyId =
        String(
          req.params.study_id ||
            ""
        ).trim();

      if (!studyId) {
        return res.status(400).json({
          error:
            "Study ID is required.",
        });
      }

      await Promise.all([
        Participant.deleteMany({
          study_id: studyId,
        }),

        QuestionnaireResponse.deleteMany(
          {
            study_id: studyId,
          }
        ),

        InterviewResponse.deleteMany(
          {
            study_id: studyId,
          }
        ),

        ChatMessage.deleteMany({
          study_id: studyId,
        }),

        EventLog.deleteMany({
          study_id: studyId,
        }),
      ]);

      return res.json({
        success: true,

        message:
          `All data deleted for ${studyId}.`,
      });
    } catch (error) {
      console.error(
        "Participant deletion error:",
        error
      );

      return res.status(500).json({
        error: "Delete failed.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

module.exports = router;