import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { questionnaireItems } from "../data/questionnaire.js";
import {
  autosaveQuestionnaire,
  submitQuestionnaire,
} from "../utils/api.js";

function QuestionnaireLikertRow({
  item,
  value,
  onChange,
  missing,
}) {
  const minLabel =
    item.minLabel || "Strongly disagree";
  const maxLabel =
    item.maxLabel || "Strongly agree";

  return (
    <fieldset
      id={`question-${item.key}`}
      className={`literacy-item questionnaire-literacy-item ${
        missing ? "questionnaire-item-missing" : ""
      }`}
    >
      <legend>{item.label}</legend>

      <div className="d-flex justify-content-between gap-3 small text-muted mb-2">
        <span>{minLabel}</span>
        <span className="text-end">{maxLabel}</span>
      </div>

      <div
        className={`likert-inline likert-${item.points}`}
        role="radiogroup"
        aria-label={item.label}
      >
        {Array.from(
          { length: item.points },
          (_, index) => index + 1
        ).map((number) => (
          <label key={number}>
            <input
              type="radio"
              name={item.key}
              checked={value === number}
              onChange={() => onChange(number)}
            />
            <span>{number}</span>
          </label>
        ))}
      </div>

      {missing && (
        <p
          className="questionnaire-required-message mb-0 mt-3"
          role="alert"
        >
          Please answer this question before submitting.
        </p>
      )}
    </fieldset>
  );
}

export default function Questionnaire() {
  const { studyId, setStep } = useExperiment();
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const answeredCount = useMemo(
    () =>
      questionnaireItems.filter(
        (item) =>
          responses[item.key] !== undefined &&
          responses[item.key] !== ""
      ).length,
    [responses]
  );

  const unansweredItems = useMemo(
    () =>
      questionnaireItems.filter(
        (item) =>
          responses[item.key] === undefined ||
          responses[item.key] === ""
      ),
    [responses]
  );

  const isComplete = unansweredItems.length === 0;

  useEffect(() => {
    if (!studyId || Object.keys(responses).length === 0) return;

    const timeoutId = window.setTimeout(() => {
      autosaveQuestionnaire({
        study_id: studyId,
        responses,
        lastQuestionKey:
          questionnaireItems[questionnaireItems.length - 1]?.key,
      }).catch(() => {});
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [responses, studyId]);

  function updateResponse(key, value) {
    setResponses((current) => ({
      ...current,
      [key]: value,
    }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setShowValidation(true);

    if (!isComplete || submitting) {
      document
        .getElementById(`question-${unansweredItems[0]?.key}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitQuestionnaire({
        study_id: studyId,
        responses,
      });
      setStep("ai-literacy");
    } catch (requestError) {
      console.error("Questionnaire submission failed:", requestError);
      setError(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.details ||
          requestError?.message ||
          "The questionnaire could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <form
            className="card research-card p-4 p-md-5"
            onSubmit={handleSubmit}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
              <div>
                <p className="text-primary text-uppercase fw-bold small mb-1">
                  Post-task questionnaire
                </p>
                <h1 className="h3 fw-bold mb-2">
                  Your experience with the AI assistant
                </h1>
                <p className="text-muted mb-0">
                  Please answer each item based on the interaction you
                  have just completed. There are no right or wrong answers.
                </p>
              </div>

              <span className="badge text-bg-light border questionnaire-progress-badge">
                {answeredCount} of {questionnaireItems.length} answered
              </span>
            </div>

            <div className="alert alert-light border questionnaire-guidance">
              Select one response for each statement. Items use either a
              five-point or seven-point response scale, as shown.
            </div>

            <div className="questionnaire-literacy-list">
              {questionnaireItems.map((item) => (
                <QuestionnaireLikertRow
                  key={item.key}
                  item={item}
                  value={responses[item.key]}
                  onChange={(value) =>
                    updateResponse(item.key, value)
                  }
                  missing={
                    showValidation &&
                    (responses[item.key] === undefined ||
                      responses[item.key] === "")
                  }
                />
              ))}
            </div>

            {error && (
              <div className="alert alert-danger mt-4" role="alert">
                {error}
              </div>
            )}

            {!isComplete && (
              <div className="alert alert-info mt-4 mb-3" role="status">
                Please answer all {questionnaireItems.length} questions
                before continuing. {unansweredItems.length}{" "}
                {unansweredItems.length === 1
                  ? "question remains"
                  : "questions remain"}.
              </div>
            )}

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
              <small className="text-muted">
                All items are required for the study measures.
              </small>

              <button
                type="submit"
                className="btn btn-indigo btn-lg"
                disabled={!isComplete || submitting}
                title={
                  !isComplete
                    ? "Answer all questions before continuing"
                    : undefined
                }
              >
                {submitting
                  ? "Submitting…"
                  : "Submit Questionnaire and Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
