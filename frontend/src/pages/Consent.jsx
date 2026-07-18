import { useState } from "react";
import { consentStatements } from "../data/content.js";
import { useExperiment } from "../context/ExperimentContext.jsx";
import {
  saveConsent,
  startParticipant,
} from "../utils/api.js";
import {
  downloadConsentPDF,
  downloadPISPDF,
} from "../utils/pdfDownloads.js";

const STUDY_DETAILS = {
  ethicsReference: "EMS12277",
  title:
    "Evaluating an AI Assistant for Workplace and Study-Related Tasks",
};

export default function Consent() {
  const {
    studyId,
    setStudyId,
    setCondition,
    setStep,
    demographics,
    setDemographics,
  } = useExperiment();

  const [checks, setChecks] = useState(
    Array(consentStatements.length).fill(false)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allChecked =
    checks.every(Boolean) &&
    demographics.ageBand &&
    demographics.gender &&
    demographics.status;

  function updateCheck(index) {
    setChecks((currentChecks) =>
      currentChecks.map((checked, currentIndex) =>
        currentIndex === index ? !checked : checked
      )
    );
  }

  async function handleConsentSubmit() {
    if (!allChecked || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const startResponse = await Promise.race([
        startParticipant(),
        new Promise((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error(
                  "The connection timed out. Please try again."
                )
              ),
            30000
          )
        ),
      ]);

      const newStudyId =
        startResponse?.data?.study_id;

      const assignedCondition =
        startResponse?.data?.condition;

      if (!newStudyId) {
        throw new Error(
          "The backend did not return a Study ID."
        );
      }

      setStudyId(newStudyId);
      setCondition(assignedCondition);

      const consentedAt = new Date();

      await saveConsent({
        study_id: newStudyId,
        consentChecks: checks,
        demographics,
      });

      downloadPISPDF(newStudyId);

      window.setTimeout(() => {
        downloadConsentPDF({
          studyId: newStudyId,
          demographics,
          consentChecks: checks,
          consentedAt,
        });
      }, 400);

      setStep("chat");
    } catch (requestError) {
      console.error(
        "Consent flow failed:",
        requestError
      );

      setError(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.details ||
          requestError?.message ||
          "We could not create your participant session. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
                  Informed Consent Form
                </h1>

                <p className="text-muted mb-0">
                  Please confirm each statement before continuing.
                </p>
              </div>

              <span className="badge text-bg-light border">
                Ethics Reference:{" "}
                {STUDY_DETAILS.ethicsReference}
              </span>
            </header>

            <div className="alert alert-light border mb-4">
              <strong>Study:</strong>{" "}
              {STUDY_DETAILS.title}
              <br />
              <strong>Study ID:</strong>{" "}
              {studyId ||
                "A new Study ID will be generated after you submit consent."}
            </div>

            <section className="mb-4">
              <h2 className="h5 fw-bold mb-3">
                Consent statements
              </h2>

              {consentStatements.map(
                (statement, index) => (
                  <label
                    key={statement}
                    className={`choice-card d-flex align-items-start gap-3 border rounded-3 p-3 mb-2 ${
                      checks[index]
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input mt-1"
                      checked={checks[index]}
                      onChange={() =>
                        updateCheck(index)
                      }
                    />

                    <span className="small">
                      {statement}
                    </span>
                  </label>
                )
              )}
            </section>

            <hr className="my-4" />

            <section>
              <h2 className="h5 fw-bold mb-3">
                Basic background information
              </h2>

              <p className="text-muted small">
                These questions are collected for research reporting and are not used to identify you.
              </p>

              <div className="row g-3">
                <div className="col-md-4">
                  <label
                    htmlFor="age-band"
                    className="form-label"
                  >
                    Age band
                  </label>

                  <select
                    id="age-band"
                    className="form-select"
                    value={
                      demographics.ageBand || ""
                    }
                    onChange={(event) =>
                      setDemographics({
                        ...demographics,
                        ageBand:
                          event.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select
                    </option>
                    <option value="18–24">
                      18–24
                    </option>
                    <option value="25–34">
                      25–34
                    </option>
                    <option value="35–44">
                      35–44
                    </option>
                    <option value="45–54">
                      45–54
                    </option>
                    <option value="55+">
                      55+
                    </option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label
                    htmlFor="gender"
                    className="form-label"
                  >
                    Gender
                  </label>

                  <select
                    id="gender"
                    className="form-select"
                    value={
                      demographics.gender || ""
                    }
                    onChange={(event) =>
                      setDemographics({
                        ...demographics,
                        gender:
                          event.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select
                    </option>
                    <option value="Female">
                      Female
                    </option>
                    <option value="Male">
                      Male
                    </option>
                    <option value="Non-binary">
                      Non-binary
                    </option>
                    <option value="Prefer not to say">
                      Prefer not to say
                    </option>
                    <option value="Self-describe">
                      Self-describe
                    </option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label
                    htmlFor="current-status"
                    className="form-label"
                  >
                    Current status
                  </label>

                  <select
                    id="current-status"
                    className="form-select"
                    value={
                      demographics.status || ""
                    }
                    onChange={(event) =>
                      setDemographics({
                        ...demographics,
                        status:
                          event.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select
                    </option>
                    <option value="Student">
                      Student
                    </option>
                    <option value="Employed">
                      Employed
                    </option>
                    <option value="Self-employed">
                      Self-employed
                    </option>
                    <option value="Not currently employed">
                      Not currently employed
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>
              </div>
            </section>

            {error && (
              <div
                className="alert alert-danger mt-4"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() =>
                  setStep("pis")
                }
                disabled={loading}
              >
                Back to Information Sheet
              </button>

              <button
                type="button"
                className="btn btn-indigo btn-lg"
                disabled={
                  !allChecked ||
                  loading
                }
                onClick={
                  handleConsentSubmit
                }
              >
                {loading
                  ? "Creating your study session…"
                  : "I Agree and Wish to Proceed"}
              </button>
            </div>

            {loading && (
              <p
                className="small text-muted mt-3 mb-0 text-end"
                aria-live="polite"
              >
                Saving consent, creating your Study ID, and preparing the task. Please do not close this page.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}