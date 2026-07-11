import { useEffect, useRef, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import {
  sendChatMessage,
  logEvent,
} from "../utils/api.js";

import Timer from "../components/Timer.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import StageIndicator from "../components/StageIndicator.jsx";

const TASK_DURATION_SECONDS = 15 * 60;

const greetings = {
  WC: `## Welcome

Hello — I’m your AI collaboration partner for this task.

We can explore your goal, develop ideas, refine them, and bring everything together into a useful outcome.

You may ask for help with a professional, academic, creative, planning, writing, design, coding, analytical, communication, or problem-solving task.

Please avoid entering confidential, identifying, commercially sensitive, or distressing information.

**What would you like help with today?**`,

  NI: `## Start

AI assistant ready.

Describe the professional, academic, creative, planning, writing, design, coding, analytical, communication, or problem-solving task you want assistance with.

Do not enter confidential, identifying, commercially sensitive, or distressing information.

**What task would you like to work on?**`,
};

const stageDetails = {
  1: {
    name: "Discover",
    description:
      "Clarify your goal, context, audience, constraints, and intended outcome.",
  },
  2: {
    name: "Develop",
    description:
      "Generate ideas, options, possible approaches, or a first draft.",
  },
  3: {
    name: "Refine",
    description:
      "Review, compare, improve, personalise, or challenge the developing work.",
  },
  4: {
    name: "Consolidate",
    description:
      "Create a clear final output, summary, action plan, or completed draft.",
  },
};

export default function ChatTask() {
  const {
    studyId,
    condition,
    setStep,
    taskStage,
    setTaskStage,
  } = useExperiment();

  const initialCondition =
    condition === "WC" ? "WC" : "NI";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: greetings[initialCondition],
      stage: 1,
      isGreeting: true,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const chatStartedLoggedRef = useRef(false);

  /*
   * Scroll to the latest message.
   *
   * Important:
   * This effect uses braces and therefore returns undefined.
   * It does not return the result of scrollIntoView().
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  /*
   * Record that the participant entered the chat task.
   *
   * The async function is declared inside the effect.
   * The effect itself does not return a Promise.
   */
  useEffect(() => {
    let cancelled = false;

    async function recordChatStart() {
      if (
        !studyId ||
        chatStartedLoggedRef.current
      ) {
        return;
      }

      chatStartedLoggedRef.current = true;

      try {
        await logEvent({
          study_id: studyId,
          eventType: "chat_started",
          payload: {
            condition: initialCondition,
            stage: taskStage || 1,
          },
        });
      } catch (eventError) {
        console.error(
          "Unable to record chat start:",
          eventError
        );

        /*
         * Do not block the participant solely because
         * analytics logging failed.
         */
        if (!cancelled) {
          setError(
            "The task opened, but one activity record could not be saved. You may continue."
          );
        }
      }
    }

    recordChatStart();

    return () => {
      cancelled = true;
    };
  }, [
    studyId,
    initialCondition,
    taskStage,
  ]);

  /*
   * Keep the greeting aligned with the assigned condition.
   * This matters when the condition is loaded shortly after
   * the component initially renders.
   */
  useEffect(() => {
    setMessages((currentMessages) => {
      if (
        currentMessages.length !== 1 ||
        !currentMessages[0]?.isGreeting
      ) {
        return currentMessages;
      }

      return [
        {
          role: "assistant",
          text:
            greetings[
              condition === "WC" ? "WC" : "NI"
            ],
          stage: 1,
          isGreeting: true,
        },
      ];
    });
  }, [condition]);

  const currentStage =
    Number(taskStage) >= 1 &&
    Number(taskStage) <= 4
      ? Number(taskStage)
      : 1;

  const canSend =
    input.trim().length > 0 &&
    !loading &&
    !expired;

  async function handleSend(event) {
    event?.preventDefault();

    const cleanInput = input.trim();

    if (!cleanInput || loading || expired) {
      return;
    }

    if (!studyId) {
      setError(
        "Your participant session could not be identified. Please return to the previous step or refresh the page."
      );
      return;
    }

    if (cleanInput.length > 5000) {
      setError(
        "Your message must be 5,000 characters or fewer."
      );
      return;
    }

    const userMessage = {
      role: "user",
      text: cleanInput,
      stage: currentStage,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const history = updatedMessages
        .filter(
          (message) => !message.isGreeting
        )
        .slice(-12)
        .map((message) => ({
          role: message.role,
          text:
            message.text ||
            message.content ||
            "",
        }));

      const response =
        await sendChatMessage({
          study_id: studyId,
          message: cleanInput,
          history,
          stage: currentStage,
        });

      const replyText =
        response?.data?.reply ||
        response?.data?.message?.text ||
        response?.data?.message?.content ||
        response?.data?.message ||
        response?.reply ||
        "";

      if (!replyText) {
        throw new Error(
          "The assistant returned an empty response."
        );
      }

      const assistantMessage = {
        role: "assistant",
        text: String(replyText),
        stage: currentStage,
        createdAt: new Date().toISOString(),
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (requestError) {
      console.error(
        "Chat request failed:",
        requestError
      );

      const backendMessage =
        requestError?.response?.data?.error ||
        requestError?.response?.data?.details ||
        requestError?.message;

      setError(
        backendMessage ||
          "The assistant could not respond. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (canSend) {
        handleSend();
      }
    }
  }

  async function handleStageChange(nextStage) {
    if (
      loading ||
      expired ||
      nextStage < 1 ||
      nextStage > 4
    ) {
      return;
    }

    setTaskStage(nextStage);
    setError("");

    try {
      await logEvent({
        study_id: studyId,
        eventType: "task_stage_changed",
        payload: {
          previousStage: currentStage,
          newStage: nextStage,
        },
      });
    } catch (eventError) {
      console.error(
        "Unable to record stage change:",
        eventError
      );
    }
  }

  async function handleNextStage() {
    if (currentStage >= 4) {
      return;
    }

    await handleStageChange(
      currentStage + 1
    );
  }

  async function handlePreviousStage() {
    if (currentStage <= 1) {
      return;
    }

    await handleStageChange(
      currentStage - 1
    );
  }

  async function handleFinishTask() {
    if (loading) {
      return;
    }

    if (messages.length < 3) {
      setError(
        "Please exchange at least one message with the assistant before continuing."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await logEvent({
        study_id: studyId,
        eventType: "chat_completed",
        payload: {
          condition: initialCondition,
          finalStage: currentStage,
          totalMessages: messages.length,
          userMessageCount:
            messages.filter(
              (message) =>
                message.role === "user"
            ).length,
          assistantMessageCount:
            messages.filter(
              (message) =>
                message.role === "assistant"
            ).length,
          timerExpired: expired,
        },
      });

      setStep("questionnaire");
    } catch (finishError) {
      console.error(
        "Unable to complete chat task:",
        finishError
      );

      /*
       * Logging failure should not trap the participant
       * after they have completed the task.
       */
      setStep("questionnaire");
    } finally {
      setLoading(false);
    }
  }

  function handleTimerExpire() {
    setExpired(true);
    setError(
      "The planned interaction time has ended. You can now continue to the questionnaire."
    );

    logEvent({
      study_id: studyId,
      eventType: "chat_timer_expired",
      payload: {
        stage: currentStage,
        totalMessages: messages.length,
      },
    }).catch((eventError) => {
      console.error(
        "Unable to record timer expiry:",
        eventError
      );
    });
  }

  const userMessageCount =
    messages.filter(
      (message) =>
        message.role === "user"
    ).length;

  return (
    <div className="container py-4">
      <div className="row g-4">
        <aside className="col-12 col-lg-4 col-xl-3">
          <div className="task-sidebar">
            <div className="mb-4">
              <p className="text-uppercase text-muted small fw-semibold mb-1">
                AI interaction task
              </p>

              <h2 className="h4 mb-2">
                Task journey
              </h2>

              <p className="text-muted small mb-0">
                Work through the stages at a natural
                pace. The assistant will adapt to the
                task you choose.
              </p>
            </div>

            <StageIndicator
              stage={currentStage}
              onChange={handleStageChange}
            />

            <div className="mt-4 p-3 rounded border bg-light">
              <span className="d-block small text-muted">
                Current stage
              </span>

              <strong className="d-block mb-1">
                {currentStage}.{" "}
                {
                  stageDetails[currentStage]
                    .name
                }
              </strong>

              <small className="text-muted">
                {
                  stageDetails[currentStage]
                    .description
                }
              </small>
            </div>

            <div className="mt-3 p-3 rounded border">
              <span className="d-block small text-muted">
                Participant ID
              </span>

              <strong className="d-block text-break">
                {studyId || "Not available"}
              </strong>

              <small className="text-muted">
                Keep this ID if you may wish to
                request withdrawal of your data.
              </small>
            </div>

            <div className="mt-3">
              <Timer
                duration={
                  TASK_DURATION_SECONDS
                }
                onExpire={
                  handleTimerExpire
                }
              />
            </div>
          </div>
        </aside>

        <section className="col-12 col-lg-8 col-xl-9">
          <div className="chat-card">
            <header className="chat-header">
              <div>
                <span className="small text-muted">
                  Stage {currentStage} of 4
                </span>

                <h1 className="h3 mb-1">
                  {
                    stageDetails[currentStage]
                      .name
                  }
                </h1>

                <p className="text-muted mb-0">
                  {
                    stageDetails[currentStage]
                      .description
                  }
                </p>
              </div>

              <div className="text-end">
                <span className="small text-muted d-block">
                  Messages sent
                </span>

                <strong>
                  {userMessageCount}
                </strong>
              </div>
            </header>

            <div
              className="chat-window"
              role="log"
              aria-live="polite"
              aria-label="Conversation with AI assistant"
            >
              {messages.map(
                (message, index) => (
                  <MessageBubble
                    key={`${message.role}-${index}`}
                    message={message}
                  />
                )
              )}

              {loading && (
                <div
                  className="typing-indicator"
                  aria-live="polite"
                >
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>

                  <em>
                    Preparing a structured
                    response…
                  </em>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {error && (
              <div
                className={
                  expired
                    ? "alert alert-warning mx-3 mt-3"
                    : "alert alert-danger mx-3 mt-3"
                }
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              className="chat-composer"
              onSubmit={handleSend}
            >
              <label
                htmlFor="participant-message"
                className="form-label fw-semibold"
              >
                Your message
              </label>

              <textarea
                id="participant-message"
                className="form-control"
                rows="4"
                value={input}
                disabled={
                  loading || expired
                }
                maxLength={5000}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Describe your task, answer the assistant’s follow-up question, request alternatives, or ask for a refinement…"
              />

              <div className="composer-footer">
                <small className="text-muted">
                  {input.length}/5000
                  characters · Enter to send ·
                  Shift+Enter for a new line
                </small>

                <button
                  type="submit"
                  className="btn btn-indigo"
                  disabled={!canSend}
                >
                  {loading
                    ? "Waiting…"
                    : "Send message"}
                </button>
              </div>
            </form>

            <footer className="task-navigation">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={
                  currentStage === 1 ||
                  loading
                }
                onClick={
                  handlePreviousStage
                }
              >
                Previous stage
              </button>

              <div className="d-flex gap-2 flex-wrap justify-content-end">
                {currentStage < 4 && (
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={loading}
                    onClick={
                      handleNextStage
                    }
                  >
                    Continue to{" "}
                    {
                      stageDetails[
                        currentStage + 1
                      ].name
                    }
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-indigo"
                  disabled={
                    loading ||
                    userMessageCount < 1
                  }
                  onClick={
                    handleFinishTask
                  }
                >
                  Continue to questionnaire
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}