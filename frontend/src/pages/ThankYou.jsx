import { useExperiment } from "../context/ExperimentContext.jsx";
import { downloadDebrief } from "../utils/debriefDownload.js";

export default function ThankYou() {
  const { studyId, resetExperiment } = useExperiment();

  const startNewParticipant = () => {
    resetExperiment();
    window.location.replace("/");
  };

  return (
    <main className="container py-5"><div className="row justify-content-center"><div className="col-lg-7">
      <div className="card research-card p-5 text-center shadow-sm">
        <div className="mb-4"><div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center" style={{ width:"80px",height:"80px",fontSize:"2rem" }}>✓</div></div>
        <h1 className="fw-bold mb-3">Thank You for Participating</h1>
        <p className="text-muted mb-4">Your participation has been recorded successfully.</p>
        <h5 className="mb-2">Participant Study ID</h5>
        <div className="alert alert-light border fw-bold fs-4">{studyId}</div>
        <p className="small text-muted mb-4">Please save this Study ID if you wish to withdraw your data within the approved withdrawal period.</p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <button className="btn btn-outline-secondary" onClick={()=>downloadDebrief(studyId)}>Download Debrief Again</button>
          <button className="btn btn-outline-primary" onClick={startNewParticipant}>Start New Participant Session</button>
        </div>
        <div className="border-top pt-4 mt-4"><p className="small text-muted">Researcher: Bhagyashree Yashwant Konde<br/>Ethics Reference: EMS12277<br/>Abertay University</p></div>
      </div>
    </div></div></main>
  );
}
