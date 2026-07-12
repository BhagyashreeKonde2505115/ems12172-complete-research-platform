import { useExperiment } from "../context/ExperimentContext.jsx";

export default function ThankYou() {
  const {
    studyId,
    resetExperiment,
  } = useExperiment();

  function handleStartNewParticipant() {
    resetExperiment();

    /*
     * Force a clean reload after the
     * React context and local storage
     * have been reset.
     */
    window.location.replace("/");
  }

  return (
    <div className="container py-5">
      <div
        className="card shadow-sm border-0 mx-auto"
        style={{
          maxWidth: "720px",
        }}
      >
        <div className="card-body p-4 p-md-5 text-center">
          <div className="mb-4">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success"
              style={{
                width: "64px",
                height: "64px",
                fontSize: "30px",
              }}
            >
              ✓
            </span>
          </div>

          <h1 className="h2 mb-3">
            Thank you for taking part
          </h1>

          <p className="text-muted mb-4">
            Your responses have been
            recorded successfully.
          </p>

          {studyId && (
            <div className="alert alert-light border mb-4">
              <span className="d-block small text-muted">
                Participant ID
              </span>

              <strong className="text-break">
                {studyId}
              </strong>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={
              handleStartNewParticipant
            }
          >
            Start New Participant Session
          </button>
        </div>
      </div>
    </div>
  );
}