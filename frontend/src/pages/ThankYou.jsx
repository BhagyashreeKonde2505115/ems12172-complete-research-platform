import { useExperiment } from "../context/ExperimentContext.jsx";
import { downloadDebrief } from "../utils/debriefDownload.js";

export default function ThankYou() {
  const { studyId, resetExperiment } = useExperiment();

  function startNewParticipant() {
    resetExperiment();
    window.location.replace("/");
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="card research-card p-4 p-md-5 text-center">
            <div className="mb-4">
              <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center" style={{ width: 80, height: 80, fontSize: "2rem" }}>✓</div>
            </div>
            <h1 className="fw-bold mb-3">Thank You for Participating</h1>
            <p className="text-muted mb-4">Your responses have been recorded. Please keep your Study ID and debrief document.</p>
            <h2 className="h5 mb-2">Participant Study ID</h2>
            <div className="alert alert-light border fw-bold fs-4 text-break">{studyId || "Not available"}</div>
            <p className="small text-muted mb-4">Quote this Study ID if you contact the researcher or request withdrawal within the approved period.</p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <button className="btn btn-outline-secondary" onClick={() => downloadDebrief(studyId)}>Download Debrief Again</button>
              <button className="btn btn-outline-primary" onClick={startNewParticipant}>Start New Participant Session</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
