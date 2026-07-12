import { useEffect, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { questionnaireItems } from "../data/questionnaire.js";
import {
  autosaveQuestionnaire,
  submitQuestionnaire,
} from "../utils/api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import LikertScale from "../components/LikertScale.jsx";

export default function Questionnaire() {
  const { studyId, setStep } = useExperiment();

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const item = questionnaireItems[index];

  useEffect(() => {
    if (!studyId || !item?.key) {
      return;
    }

    const timeoutId = setTimeout(() => {
      autosaveQuestionnaire({
        study_id: studyId,
        responses,
        lastQuestionKey: item.key,
      }).catch((autosaveError) => {
        console.error(
          "Questionnaire autosave failed:",
          autosaveError
        );
      });
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [studyId, responses, item?.key]);

  function updateResponse(value) {
    setResponses((currentResponses) => ({
      ...currentResponses,
      [item.key]: value,
    }));

    setError("");
  }

  function goBack() {
    if (index > 0) {
      setIndex((currentIndex) => currentIndex - 1);
      setError("");
    }
  }

  async function next() {
    if (!item) {
      return;
    }

    if (
      responses[item.key] === undefined ||
      responses[item.key] === null ||
      responses[item.key] === ""
    ) {
      setError(
        "Please select a response before continuing."
      );
      return;
    }

    if (index < questionnaireItems.length - 1) {
      setIndex((currentIndex) => currentIndex + 1);
      setError("");
      return;
    }

    if (!studyId) {
      setError(
        "Your Study ID is missing. Please restart the participant session."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitQuestionnaire({
        study_id: studyId,
        responses,
      });

      setStep("interview");
    } catch (submitError) {
      console.error(
        "Questionnaire submission failed:",
        submitError
      );

      setError(
        submitError?.response?.data?.error ||
          submitError?.message ||
          "The questionnaire could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger">
          Questionnaire items could not be loaded.
        </div>
      </main>
    );
  }

  const currentValue = responses[item.key];

  const hasResponse =
    currentValue !== undefined &&
    currentValue !== null &&
    currentValue !== "";

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card research-card p-4 p-md-5">
            <ProgressBar
              current={index + 1}
              total={questionnaireItems.length}
            />

            <p className="text-primary fw-bold small text-uppercase">
              {item.scale}
            </p>

            <h1 className="h4 fw-bold mb-4">
              {item.label}
            </h1>

            {item.reverse && (
              <p className="small text-muted">
                Please read this statement carefully.
              </p>
            )}

            <LikertScale
              points={item.points || 7}
              value={currentValue}
              minLabel={
                item.minLabel ||
                "Strongly disagree"
              }
              maxLabel={
                item.maxLabel ||
                "Strongly agree"
              }
              onChange={updateResponse}
            />

            {error && (
              <div
                className="alert alert-danger mt-4"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="d-flex justify-content-between mt-5">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={index === 0 || submitting}
                onClick={goBack}
              >
                Back
              </button>

              <button
                type="button"
                className="btn btn-indigo"
                disabled={!hasResponse || submitting}
                onClick={next}
              >
                {submitting
                  ? "Submitting…"
                  : index === questionnaireItems.length - 1
                    ? "Submit Questionnaire"
                    : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}