import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { questionnaireItems } from "../data/questionnaire.js";
import {
  autosaveQuestionnaire,
  submitQuestionnaire,
} from "../utils/api.js";
import LikertScale from "../components/LikertScale.jsx";

export default function Questionnaire() {
  const { studyId, setStep } = useExperiment();
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const answeredCount = useMemo(
    () =>
      questionnaireItems.filter(
        (item) => responses[item.key] !== undefined && responses[item.key] !== ""
      ).length,
    [responses]
  );

  const unansweredItems = useMemo(
    () =>
      questionnaireItems.filter(
        (item) => responses[item.key] === undefined || responses[item.key] === ""
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
        lastQuestionKey: questionnaireItems[questionnaireItems.length - 1]?.key,
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
      const firstMissing = document.getElementById(
        `question-${unansweredItems[0]?.key}`
      );
      firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        <div className="col-xl-9 col-lg-10">
          <form className="card research-card p-4 p-md-5" onSubmit={handleSubmit}>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
              <div>
                <p className="text-primary text-uppercase fw-bold small mb-1">
                  Post-task questionnaire
                </p>
                <h1 className="h3 fw-bold mb-2">Your experience with the AI assistant</h1>
                <p className="text-muted mb-0">
                  Please answer every item based on the interaction you have just completed.
                </p>
              </div>

              <span className="badge text-bg-light border questionnaire-progress-badge">
                {answeredCount} of {questionnaireItems.length} answered
              </span>
            </div>

            <div className="alert alert-light border questionnaire-guidance">
              Select one response for each statement. The response scale and wording are kept unchanged so the validated measures remain consistent.
            </div>

            <div className="questionnaire-list">
              {questionnaireItems.map((item, index) => {
                const missing =
                  showValidation &&
                  (responses[item.key] === undefined || responses[item.key] === "");

                return (
                  <section
                    id={`question-${item.key}`}
                    className={`questionnaire-item ${missing ? "questionnaire-item-missing" : ""}`}
                    key={item.key}
                  >
                    <div className="questionnaire-item-heading">
                      <span className="questionnaire-number">{index + 1}</span>
                      <h2 className="h6 fw-bold mb-0">{item.label}</h2>
                    </div>

                    <LikertScale
                      points={item.points}
                      value={responses[item.key]}
                      minLabel={item.minLabel}
                      maxLabel={item.maxLabel}
                      onChange={(value) => updateResponse(item.key, value)}
                    />

                    {missing && (
                      <p className="questionnaire-required-message mb-0 mt-3" role="alert">
                        Please answer this question before submitting.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>

            {error && (
              <div className="alert alert-danger mt-4" role="alert">
                {error}
              </div>
            )}

            {!isComplete && (
              <div className="alert alert-info mt-4 mb-3" role="status">
                Please answer all {questionnaireItems.length} questions before you can continue. {unansweredItems.length} {unansweredItems.length === 1 ? "question remains" : "questions remain"}.
              </div>
            )}

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
              <small className="text-muted">
                All items are required because they form part of the study's validated measures.
              </small>

              <button
                type="submit"
                className="btn btn-indigo btn-lg"
                disabled={!isComplete || submitting}
                title={!isComplete ? "Answer all questions before continuing" : undefined}
              >
                {submitting ? "Submitting…" : "Submit Questionnaire and Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
