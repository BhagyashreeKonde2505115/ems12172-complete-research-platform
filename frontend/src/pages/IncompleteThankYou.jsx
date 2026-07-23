import { useExperiment } from "../context/ExperimentContext.jsx";

export default function IncompleteThankYou() {
  const {
    studyId,
    resetExperiment,
  } = useExperiment();

  function startNewSession() {
    resetExperiment();
    window.location.assign("/");
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-7">
          <div className="card research-card p-4 p-md-5 text-center">
            <div
              className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-light border"
              style={{
                width: "72px",
                height: "72px",
                fontSize: "2rem",
              }}
              aria-hidden="true"
            >
              ✓
            </div>

            <p className="text-uppercase text-primary fw-bold small mb-1">
              Abertay University Research
            </p>

            <h1 className="h2 fw-bold mb-3">
              Thank You
            </h1>

            <p className="lead">
              Your participant session has been recorded as incomplete.
            </p>

            <p className="text-muted">
              The remaining questionnaire and interview sections are not
              required because the guided AI task was not completed.
            </p>

            <p className="text-muted">
              This may be because no task response was entered or because the
              external AI service was temporarily unavailable. The reason and
              the stage reached have been recorded for research-quality checks.
            </p>

            {studyId && (
              <div className="alert alert-light border text-start mt-4">
                <strong>Study ID:</strong>{" "}
                {studyId}
              </div>
            )}

            <div className="alert alert-info text-start mt-4">
              You may close this browser tab. Where the AI service was
              unavailable, you may start a new session in approximately
              4–5 hours or tomorrow.
            </div>

            <button
              type="button"
              className="btn btn-outline-primary mt-3"
              onClick={startNewSession}
            >
              Start New Participant Session
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
