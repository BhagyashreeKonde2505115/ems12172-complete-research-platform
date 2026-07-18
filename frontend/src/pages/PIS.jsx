import { pisText } from "../data/content.js";
import { useExperiment } from "../context/ExperimentContext.jsx";

export default function PIS() {
  const { setStep } = useExperiment();

  function continueToConsent() {
    setStep("consent");
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-9">
          <div className="card research-card p-4 p-md-5">
            <header className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
              <div>
                <p className="text-uppercase text-primary fw-bold small mb-1">
                  Abertay University Research
                </p>

                <h1 className="h2 fw-bold mb-2">
                  Participant Information Sheet
                </h1>

                <p className="text-muted mb-0">
                  Please read the information below carefully before continuing
                  to the consent form.
                </p>
              </div>

              <span className="badge text-bg-light border">
                Ethics Reference: EMS12277
              </span>
            </header>

            <section className="pis-summary border rounded-4 p-3 p-md-4 mb-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <span className="small text-muted d-block">
                    Study title
                  </span>

                  <strong>
                    Evaluating an AI Assistant for Workplace and Study-Related
                    Tasks
                  </strong>
                </div>

                <div className="col-md-3">
                  <span className="small text-muted d-block">
                    Estimated duration
                  </span>

                  <strong>
                    35–40 minutes
                  </strong>
                </div>

                <div className="col-md-3">
                  <span className="small text-muted d-block">
                    Study ID
                  </span>

                  <strong>
                    Generated after consent
                  </strong>
                </div>
              </div>
            </section>

            <section
              className="pis-content"
              aria-labelledby="pis-content-heading"
            >
              <h2
                id="pis-content-heading"
                className="visually-hidden"
              >
                Participant information
              </h2>

              <pre
                className="mb-0"
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  fontFamily: "inherit",
                  fontSize: "0.98rem",
                  lineHeight: 1.75,
                  color: "inherit",
                }}
              >
                {pisText}
              </pre>
            </section>

            <div className="alert alert-info border-0 mt-4 mb-4">
              Continuing to the next page does not yet enrol you in the study.
              You will be asked to confirm each informed-consent statement
              before a participant Study ID is created.
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <p className="small text-muted mb-0">
                You may leave this page without taking part.
              </p>

              <button
                type="button"
                className="btn btn-indigo btn-lg"
                onClick={continueToConsent}
              >
                Continue to Consent Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}