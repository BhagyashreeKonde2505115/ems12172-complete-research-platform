import { useEffect, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { interviewQuestions } from "../data/content.js";
import { autosaveInterview, submitInterview } from "../utils/api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import { downloadDebrief } from "../utils/debriefDownload.js";

export default function Interview() {
  const { studyId, setStep } = useExperiment();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const value = answers[index] || "";

  useEffect(() => {
    if (!studyId) return;
    const timeout = window.setTimeout(() => {
      autosaveInterview({ study_id: studyId, answers, lastIndex: index }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [answers, index, studyId]);

  async function next() {
    if (index < interviewQuestions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await submitInterview({ study_id: studyId, answers });
      downloadDebrief(studyId);
      setStep("debrief");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "The interview could not be submitted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card research-card p-4 p-md-5">
            <ProgressBar current={index + 1} total={interviewQuestions.length} />
            <p className="text-primary fw-bold small">Written reflection {index + 1} of {interviewQuestions.length}</p>
            <h1 className="h5 fw-bold mb-3">{interviewQuestions[index]}</h1>
            <p className="small text-muted">A brief response is acceptable. You may leave this response blank if you prefer not to answer.</p>
            <textarea className="form-control" rows="7" value={value} onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })} placeholder="Type your response here…" />
            <div className="d-flex justify-content-between mt-2"><small className="text-muted">{value.length} characters</small></div>
            {error && <div className="alert alert-danger mt-3">{error}</div>}
            <div className="d-flex justify-content-between mt-4">
              <button className="btn btn-outline-secondary" disabled={index === 0 || loading} onClick={() => setIndex((current) => current - 1)}>Back</button>
              <button className="btn btn-indigo" disabled={loading} onClick={next}>{loading ? "Submitting…" : index === interviewQuestions.length - 1 ? "Complete Interview" : "Next"}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
