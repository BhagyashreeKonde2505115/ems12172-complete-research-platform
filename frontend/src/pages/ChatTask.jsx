import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useExperiment } from "../context/ExperimentContext.jsx";

import {
  logEvent,
  sendChatMessage,
} from "../utils/api.js";

import MessageBubble from "../components/MessageBubble.jsx";

/*
 * Final study setting: 120 seconds per stage.
 *
 * During development, temporarily change this to 15 or 20
 * so you do not need to wait eight minutes.
 */
const STAGE_DURATION_SECONDS = 120;

const STAGES = [
  {
    number: 1,
    key: "discover",
    title: "Discover",

    summary:
      "Explore the task and generate different possibilities.",

    instructions: [
      "Describe the task, problem or idea you want to work on.",
      "Clarify the intended outcome, audience and important constraints.",
      "Explore several possible directions before choosing one.",
      "Do not worry about creating a final answer yet.",
    ],

    message: [
      "## Stage 1 — Discover",
      "",
      "Let’s begin by exploring your task.",
      "",
      "Describe what you would like to work on, the result you hope to achieve and any important constraints.",
      "",
      "**What would you like help with today?**",
    ].join("\n"),
  },

  {
    number: 2,
    key: "develop",
    title: "Develop",

    summary:
      "Expand the strongest ideas and compare useful alternatives.",

    instructions: [
      "Choose the most promising ideas from the previous stage.",
      "Develop them with more detail.",
      "Compare advantages, limitations and alternatives.",
      "Consider how the idea could work in practice.",
    ],

    message: [
      "## Stage 2 — Develop",
      "",
      "The discovery stage is complete.",
      "",
      "Now focus on the strongest ideas and develop them in more detail.",
      "",
      "Consider the available alternatives, benefits, limitations and practical requirements.",
    ].join("\n"),
  },

  {
    number: 3,
    key: "refine",
    title: "Refine",

    summary:
      "Improve the proposed solution and address its weaknesses.",

    instructions: [
      "Identify weaknesses, risks or missing information.",
      "Improve feasibility, clarity and usefulness.",
      "Address practical constraints or unrealistic assumptions.",
      "Strengthen the most valuable elements of the proposal.",
    ],

    message: [
      "## Stage 3 — Refine",
      "",
      "The development stage is complete.",
      "",
      "Now improve the proposed solution.",
      "",
      "Identify weaknesses, address practical concerns and strengthen the idea before creating the final outcome.",
    ].join("\n"),
  },

  {
    number: 4,
    key: "consolidate",
    title: "Consolidate",

    summary:
      "Combine the strongest elements into a clear final outcome.",

    instructions: [
      "Bring together the strongest elements from the discussion.",
      "Create a clear final proposal, plan or solution.",
      "Summarise the main decisions.",
      "Identify practical next steps.",
    ],

    message: [
      "## Stage 4 — Consolidate",
      "",
      "The refinement stage is complete.",
      "",
      "Now bring the strongest elements together.",
      "",
      "Use this stage to produce a clear final proposal, plan or solution with practical next steps.",
    ].join("\n"),
  },
];

const TASK_EXAMPLES = [
  "Planning a Master's dissertation or research project",
  "Organising a workplace project",
  "Developing a business or service idea",
  "Designing a tourism experience",
  "Creating a study or time-management plan",
  "Improving an existing product, process or service",
];

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(
    0,
    Number(totalSeconds) || 0
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const seconds =
    safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getConditionGreeting(condition) {
  if (condition === "WC") {
    return [
      "## Welcome",
      "",
      "Hello — I’m looking forward to working through your task with you.",
      "",
      "You may choose a non-sensitive academic, professional, planning, creative or design task.",
      "",
      "We will work through four guided stages:",
      "",
      "1. Discover",
      "2. Develop",
      "3. Refine",
      "4. Consolidate",
      "",
      "Each stage lasts approximately two minutes and changes automatically.",
      "",
      "Select **Start Guided Task** when you are ready.",
    ].join("\n");
  }

  return [
    "## Guided task",
    "",
    "AI assistant ready.",
    "",
    "Choose a non-sensitive academic, professional, planning, creative or design task.",
    "",
    "The activity contains four automatic stages:",
    "",
    "1. Discover",
    "2. Develop",
    "3. Refine",
    "4. Consolidate",
    "",
    "Each stage lasts approximately two minutes.",
    "",
    "Select **Start Guided Task** to begin.",
  ].join("\n");
}

function normaliseReply(response) {
  return String(
    response?.data?.reply ||
      response?.data?.message ||
      response?.data?.text ||
      response?.data?.content ||
      ""
  ).trim();
}

function createGreeting(condition) {
  return {
    id: `greeting-${Date.now()}`,
    role: "assistant",
    text: getConditionGreeting(condition),
    messageType: "greeting",
    createdAt: new Date().toISOString(),
  };
}

export default function ChatTask() {
  const {
    studyId,
    condition,
    setStep,
    setTaskStage,
  } = useExperiment();

  const [stageIndex, setStageIndex] =
    useState(0);

  const [
    secondsRemaining,
    setSecondsRemaining,
  ] = useState(
    STAGE_DURATION_SECONDS
  );

  const [messages, setMessages] =
    useState(() => [
      createGreeting(condition),
    ]);

  const [input, setInput] =
    useState("");

  const [
    taskStarted,
    setTaskStarted,
  ] = useState(false);

  const [
    taskComplete,
    setTaskComplete,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    transitioning,
    setTransitioning,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const bottomRef =
    useRef(null);

  const stageEndTimeRef =
    useRef(null);

  const transitionLockRef =
    useRef(false);

  const transitionTimeoutRef =
    useRef(null);

  const currentStage =
    STAGES[stageIndex];

  const participantMessageCount =
    messages.filter(
      (message) =>
        message.role === "user"
    ).length;

  const overallProgress =
    useMemo(() => {
      if (taskComplete) {
        return 100;
      }

      if (!taskStarted) {
        return 0;
      }

      const completedSeconds =
        stageIndex *
        STAGE_DURATION_SECONDS;

      const elapsedInStage =
        STAGE_DURATION_SECONDS -
        secondsRemaining;

      const totalSeconds =
        STAGES.length *
        STAGE_DURATION_SECONDS;

      return Math.min(
        100,
        Math.max(
          0,
          ((completedSeconds +
            elapsedInStage) /
            totalSeconds) *
            100
        )
      );
    }, [
      stageIndex,
      secondsRemaining,
      taskStarted,
      taskComplete,
    ]);

  /*
   * Start with a fresh task whenever this component mounts.
   *
   * Nothing is restored from localStorage or sessionStorage.
   */
  useEffect(() => {
    setStageIndex(0);
    setTaskStage?.(1);

    setSecondsRemaining(
      STAGE_DURATION_SECONDS
    );

    setMessages([
      createGreeting(condition),
    ]);

    setInput("");
    setTaskStarted(false);
    setTaskComplete(false);
    setLoading(false);
    setTransitioning(false);
    setError("");

    stageEndTimeRef.current =
      null;

    transitionLockRef.current =
      false;

    return () => {
      if (
        transitionTimeoutRef.current
      ) {
        window.clearTimeout(
          transitionTimeoutRef.current
        );
      }
    };
  }, [
    studyId,
    condition,
    setTaskStage,
  ]);

  /*
   * Scroll to the newest message.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    messages,
    loading,
    transitioning,
  ]);

  /*
   * Countdown timer.
   */
  useEffect(() => {
    if (
      !taskStarted ||
      taskComplete ||
      transitioning
    ) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        const endTime =
          stageEndTimeRef.current;

        if (!endTime) {
          return;
        }

        const remaining =
          Math.max(
            0,
            Math.ceil(
              (endTime -
                Date.now()) /
                1000
            )
          );

        setSecondsRemaining(
          remaining
        );
      }, 250);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [
    taskStarted,
    taskComplete,
    transitioning,
    stageIndex,
  ]);

  /*
   * Automatically progress to the next stage.
   */
  useEffect(() => {
    if (
      !taskStarted ||
      taskComplete ||
      transitioning ||
      secondsRemaining > 0 ||
      transitionLockRef.current
    ) {
      return;
    }

    transitionLockRef.current =
      true;

    async function advanceStage() {
      const completedStage =
        STAGES[stageIndex];

      /*
       * Final stage has ended.
       */
      if (
        stageIndex ===
        STAGES.length - 1
      ) {
        stageEndTimeRef.current =
          null;

        setTaskComplete(true);

        setMessages(
          (currentMessages) => [
            ...currentMessages,
            {
              id: `complete-${Date.now()}`,
              role: "assistant",
              messageType:
                "task-complete",

              text: [
                "## Guided task complete",
                "",
                "You have completed all four stages.",
                "",
                participantMessageCount >
                0
                  ? "Please review the final outcome from the conversation and continue to the questionnaire when you are ready."
                  : "No participant message was entered during the activity. You may restart the task or end your participation.",
              ].join("\n"),

              createdAt:
                new Date().toISOString(),
            },
          ]
        );

        try {
          await logEvent({
            study_id: studyId,

            eventType:
              "chat_task_completed",

            payload: {
              completedStages: 4,

              participantMessages:
                participantMessageCount,

              completedWithoutInput:
                participantMessageCount ===
                0,
            },
          });
        } catch (eventError) {
          console.error(
            "Task completion logging failed:",
            eventError
          );
        }

        transitionLockRef.current =
          false;

        return;
      }

      setTransitioning(true);

      const nextIndex =
        stageIndex + 1;

      const nextStage =
        STAGES[nextIndex];

      try {
        await logEvent({
          study_id: studyId,

          eventType:
            "task_stage_completed",

          payload: {
            completedStage:
              completedStage.key,

            nextStage:
              nextStage.key,

            participantMessages:
              participantMessageCount,
          },
        });
      } catch (eventError) {
        console.error(
          "Stage event logging failed:",
          eventError
        );
      }

      transitionTimeoutRef.current =
        window.setTimeout(() => {
          setStageIndex(nextIndex);

          setTaskStage?.(
            nextIndex + 1
          );

          setSecondsRemaining(
            STAGE_DURATION_SECONDS
          );

          stageEndTimeRef.current =
            Date.now() +
            STAGE_DURATION_SECONDS *
              1000;

          setMessages(
            (currentMessages) => [
              ...currentMessages,
              {
                id: `stage-${
                  nextStage.number
                }-${Date.now()}`,

                role: "assistant",

                messageType:
                  "stage-transition",

                stage:
                  nextStage.number,

                text:
                  nextStage.message,

                createdAt:
                  new Date().toISOString(),
              },
            ]
          );

          setTransitioning(false);

          transitionLockRef.current =
            false;
        }, 2000);
    }

    advanceStage();
  }, [
    participantMessageCount,
    secondsRemaining,
    setTaskStage,
    stageIndex,
    studyId,
    taskComplete,
    taskStarted,
    transitioning,
  ]);

  async function startTask() {
    if (taskStarted) {
      return;
    }

    if (!studyId) {
      setError(
        "Your Study ID is missing. Please return to the consent page and start a new participant session."
      );

      return;
    }

    const firstStage =
      STAGES[0];

    setStageIndex(0);
    setTaskStage?.(1);

    setSecondsRemaining(
      STAGE_DURATION_SECONDS
    );

    setTaskStarted(true);
    setTaskComplete(false);
    setLoading(false);
    setTransitioning(false);
    setError("");
    setInput("");

    transitionLockRef.current =
      false;

    stageEndTimeRef.current =
      Date.now() +
      STAGE_DURATION_SECONDS *
        1000;

    setMessages(
      (currentMessages) => [
        ...currentMessages,
        {
          id: `stage-1-${Date.now()}`,

          role: "assistant",

          messageType:
            "stage-transition",

          stage: 1,

          text:
            firstStage.message,

          createdAt:
            new Date().toISOString(),
        },
      ]
    );

    try {
      await logEvent({
        study_id: studyId,

        eventType:
          "chat_task_started",

        payload: {
          stageDurationSeconds:
            STAGE_DURATION_SECONDS,

          stages:
            STAGES.map(
              (stage) =>
                stage.key
            ),
        },
      });
    } catch (eventError) {
      console.error(
        "Task start logging failed:",
        eventError
      );
    }
  }

  async function restartTask() {
    if (
      transitionTimeoutRef.current
    ) {
      window.clearTimeout(
        transitionTimeoutRef.current
      );

      transitionTimeoutRef.current =
        null;
    }

    const firstStage =
      STAGES[0];

    setStageIndex(0);
    setTaskStage?.(1);

    setSecondsRemaining(
      STAGE_DURATION_SECONDS
    );

    setTaskStarted(true);
    setTaskComplete(false);
    setLoading(false);
    setTransitioning(false);

    setInput("");
    setError("");

    transitionLockRef.current =
      false;

    stageEndTimeRef.current =
      Date.now() +
      STAGE_DURATION_SECONDS *
        1000;

    setMessages([
      createGreeting(condition),

      {
        id: `stage-1-${Date.now() + 1}`,

        role: "assistant",

        messageType:
          "stage-transition",

        stage: 1,

        text:
          firstStage.message,

        createdAt:
          new Date().toISOString(),
      },
    ]);

    try {
      await logEvent({
        study_id: studyId,

        eventType:
          "chat_task_restarted",

        payload: {
          reason:
            "no_participant_messages",

          stageDurationSeconds:
            STAGE_DURATION_SECONDS,
        },
      });
    } catch (eventError) {
      console.error(
        "Task restart logging failed:",
        eventError
      );
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const cleanInput =
      input.trim();

    if (
      !cleanInput ||
      loading ||
      transitioning ||
      taskComplete ||
      !taskStarted
    ) {
      return;
    }

    if (!studyId) {
      setError(
        "Your Study ID is missing. Please start a new participant session."
      );

      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,

      role: "user",

      text:
        cleanInput,

      stage:
        currentStage.number,

      createdAt:
        new Date().toISOString(),
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(
      updatedMessages
    );

    setInput("");
    setLoading(true);
    setError("");

    try {
      const history =
        updatedMessages
          .filter(
            (message) =>
              [
                "user",
                "assistant",
              ].includes(
                message.role
              )
          )
          .slice(-16)
          .map(
            (message) => ({
              role:
                message.role,

              text:
                message.text,
            })
          );

      const response =
        await sendChatMessage({
          study_id:
            studyId,

          message:
            cleanInput,

          stage:
            currentStage.number,

          history,
        });

      const assistantReply =
        normaliseReply(response);

      if (!assistantReply) {
        throw new Error(
          "The AI assistant returned an empty response."
        );
      }

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          {
            id: `assistant-${Date.now()}`,

            role: "assistant",

            text:
              assistantReply,

            stage:
              currentStage.number,

            createdAt:
              new Date().toISOString(),
          },
        ]
      );
    } catch (requestError) {
      console.error(
        "Chat request failed:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.details ||
          requestError?.response?.data
            ?.error ||
          requestError?.message ||
          "The assistant could not respond. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function continueToQuestionnaire() {
    if (
      !taskComplete ||
      participantMessageCount ===
        0
    ) {
      return;
    }

    try {
      await logEvent({
        study_id:
          studyId,

        eventType:
          "chat_finished",

        payload: {
          participantMessages:
            participantMessageCount,

          totalMessages:
            messages.length,

          completedStages:
            4,
        },
      });
    } catch (eventError) {
      console.error(
        "Chat finish logging failed:",
        eventError
      );
    }

    setStep("questionnaire");
  }

  async function endStudyWithoutTask() {
    const confirmed =
      window.confirm(
        "End your participation without completing the AI task?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await logEvent({
        study_id:
          studyId,

        eventType:
          "study_ended_without_chat_input",

        payload: {
          participantMessages:
            0,

          completedTimedStages:
            4,

          reason:
            "no_chat_input",
        },
      });
    } catch (eventError) {
      console.error(
        "Early study-end logging failed:",
        eventError
      );
    }

    /*
     * Incomplete participants go directly to the simple
     * thank-you page. No questionnaire, interview, debrief
     * page or debrief PDF is shown.
     */
    setStep(
      "incomplete-thankyou"
    );
  }

  return (
    <main className="container-fluid py-4 px-3 px-lg-5">
      <div className="row g-4">
        <aside className="col-xl-3">
          <div className="card research-card p-4 task-sidebar sticky-xl-top">
            <p className="text-primary text-uppercase fw-bold small mb-1">
              Guided AI activity
            </p>

            <h1 className="h4 fw-bold mb-2">
              Four-stage task
            </h1>

            <p className="text-muted small">
              The stages change automatically.
              They are progress indicators,
              not clickable navigation buttons.
            </p>

            <div className="task-stage-list mb-4">
              {STAGES.map(
                (stage, index) => {
                  const complete =
                    taskComplete ||
                    index <
                      stageIndex;

                  const active =
                    taskStarted &&
                    !taskComplete &&
                    index ===
                      stageIndex;

                  return (
                    <div
                      key={stage.key}

                      className={[
                        "task-stage-item",

                        complete
                          ? "task-stage-complete"
                          : "",

                        active
                          ? "task-stage-active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}

                      aria-current={
                        active
                          ? "step"
                          : undefined
                      }
                    >
                      <span className="task-stage-number">
                        {complete
                          ? "✓"
                          : stage.number}
                      </span>

                      <div>
                        <strong className="d-block">
                          {stage.title}
                        </strong>

                        <small className="text-muted">
                          {stage.summary}
                        </small>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="border rounded-3 p-3 mb-3">
              <small className="text-muted d-block">
                Current stage
              </small>

              <strong className="h5 d-block mb-1">
                {taskComplete
                  ? "Complete"
                  : taskStarted
                    ? currentStage.title
                    : "Not started"}
              </strong>

              <small>
                {taskComplete
                  ? "All four stages have finished."
                  : taskStarted
                    ? currentStage.summary
                    : "Select Start Guided Task when ready."}
              </small>
            </div>

            <div className="border rounded-3 p-3 mb-3">
              <small className="text-muted d-block">
                Time remaining
              </small>

              <strong
                className="display-6 d-block"
                aria-live="polite"
              >
                {taskStarted &&
                !taskComplete
                  ? formatTime(
                      secondsRemaining
                    )
                  : taskComplete
                    ? "00:00"
                    : formatTime(
                        STAGE_DURATION_SECONDS
                      )}
              </strong>

              <small className="text-muted">
                Stage{" "}
                {Math.min(
                  stageIndex + 1,
                  4
                )}{" "}
                of 4
              </small>
            </div>

            <div className="study-id-box">
              <small>
                Your Study ID
              </small>

              <strong>
                {studyId ||
                  "Not available"}
              </strong>
            </div>
          </div>
        </aside>

        <section className="col-xl-9">
          <div className="card research-card chat-card overflow-hidden">
            <header className="task-header p-4 border-bottom">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <p className="text-primary text-uppercase fw-bold small mb-1">
                    Participant task
                  </p>

                  <h2 className="h4 fw-bold mb-1">
                    {taskComplete
                      ? "Guided activity complete"
                      : taskStarted
                        ? currentStage.title
                        : "Choose your task"}
                  </h2>

                  <p className="text-muted mb-0">
                    {taskComplete
                      ? "Review the options below."
                      : taskStarted
                        ? currentStage.summary
                        : "Select a suitable task before starting."}
                  </p>
                </div>

                <span className="badge text-bg-light border">
                  Approximately 8 minutes
                </span>
              </div>

              <div
                className="progress mt-3"
                role="progressbar"
                aria-label="Task progress"
                aria-valuenow={Math.round(
                  overallProgress
                )}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  className="progress-bar"
                  style={{
                    width: `${overallProgress}%`,
                  }}
                />
              </div>
            </header>

            {!taskStarted ? (
              <div className="p-4 p-md-5">
                <h2 className="h4 fw-bold">
                  Select a suitable task
                </h2>

                <p>
                  Collaborate with the AI
                  assistant on a non-sensitive
                  academic, professional,
                  planning, creative or design
                  problem.
                </p>

                <div className="row g-3 my-3">
                  {TASK_EXAMPLES.map(
                    (example) => (
                      <div
                        className="col-md-6"
                        key={example}
                      >
                        <div className="border rounded-3 p-3 h-100">
                          {example}
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="alert alert-light border">
                  <strong>
                    How the task works
                  </strong>

                  <p className="mb-0 mt-2">
                    The activity contains four
                    automatic stages. Each stage
                    lasts approximately two
                    minutes. Continue interacting
                    with the AI throughout the
                    activity. The stage changes
                    automatically.
                  </p>
                </div>

                {error && (
                  <div className="alert alert-danger">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-indigo btn-lg"
                  onClick={startTask}
                >
                  Start Guided Task
                </button>
              </div>
            ) : (
              <>
                <section className="stage-guidance border-bottom p-3 p-md-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <span className="small text-uppercase text-primary fw-bold">
                        Stage goal
                      </span>

                      <p className="mb-0 mt-1">
                        {currentStage.summary}
                      </p>
                    </div>

                    <div className="col-md-8">
                      <span className="small text-uppercase text-primary fw-bold">
                        What to do now
                      </span>

                      <ul className="mb-0 mt-1 ps-3">
                        {currentStage.instructions.map(
                          (instruction) => (
                            <li
                              key={instruction}
                            >
                              {instruction}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </section>

                <div className="chat-window p-3 p-md-4">
                  {messages.map(
                    (message) => (
                      <MessageBubble
                        key={
                          message.id ||
                          `${message.role}-${message.text}`
                        }
                        message={message}
                      />
                    )
                  )}

                  {loading && (
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />

                      <em>
                        Preparing a structured
                        response…
                      </em>
                    </div>
                  )}

                  {transitioning && (
                    <div
                      className="alert alert-primary"
                      aria-live="assertive"
                    >
                      Stage complete. Preparing
                      the next stage…
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {error && (
                  <div className="alert alert-danger mx-3 mx-md-4 py-2">
                    {error}
                  </div>
                )}

                <footer className="border-top p-3 p-md-4">
                  {taskComplete ? (
                    participantMessageCount ===
                    0 ? (
                      <div className="border rounded-4 p-4">
                        <div className="alert alert-warning mb-4">
                          <h3 className="h5 fw-bold">
                            No task response was
                            entered
                          </h3>

                          <p className="mb-0">
                            The four guided stages
                            have finished, but no
                            participant message was
                            submitted. There is no
                            AI interaction to
                            evaluate. Restart the
                            task or end your
                            participation.
                          </p>
                        </div>

                        <div className="d-flex flex-wrap justify-content-between gap-3">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-lg"
                            onClick={restartTask}
                          >
                            Restart Guided Task
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-lg"
                            onClick={
                              endStudyWithoutTask
                            }
                          >
                            End Study
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                          <strong className="d-block">
                            Task complete
                          </strong>

                          <small className="text-muted">
                            Continue to the
                            post-task questionnaire.
                          </small>
                        </div>

                        <button
                          type="button"
                          className="btn btn-indigo btn-lg"
                          onClick={
                            continueToQuestionnaire
                          }
                        >
                          Continue to Questionnaire
                        </button>
                      </div>
                    )
                  ) : (
                    <form
                      onSubmit={sendMessage}
                    >
                      <label
                        htmlFor="chat-message"
                        className="form-label fw-semibold"
                      >
                        Your message
                      </label>

                      <textarea
                        id="chat-message"
                        className="form-control"
                        rows="3"

                        disabled={
                          loading ||
                          transitioning
                        }

                        value={input}

                        maxLength={5000}

                        onChange={(event) =>
                          setInput(
                            event.target.value
                          )
                        }

                        onKeyDown={(event) => {
                          if (
                            event.key ===
                              "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();
                            sendMessage(event);
                          }
                        }}

                        placeholder={`Continue the ${currentStage.title.toLowerCase()} stage…`}
                      />

                      <div className="composer-footer">
                        <small className="text-muted">
                          {input.length}/5000 ·
                          Enter to send ·
                          Shift+Enter for a new line
                        </small>

                        <button
                          type="submit"
                          className="btn btn-indigo"

                          disabled={
                            !input.trim() ||
                            loading ||
                            transitioning
                          }
                        >
                          {loading
                            ? "Sending…"
                            : "Send"}
                        </button>
                      </div>

                      <p className="small text-muted mt-2 mb-0">
                        Do not enter personal,
                        confidential or sensitive
                        information.
                      </p>
                    </form>
                  )}
                </footer>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}