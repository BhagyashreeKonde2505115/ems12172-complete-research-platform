import { useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { consentStatements, pisText } from "../data/content.js";
import { startParticipant, saveConsent } from "../utils/api.js";

export default function PISConsent() {
  const { studyId, setCondition, setStep, demographics, setDemographics } = useExperiment();
  const [checks, setChecks] = useState(Array(consentStatements.length).fill(false));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allChecked = checks.every(Boolean) && demographics.ageBand && demographics.gender && demographics.status;

  const continueStudy = async () => {
    if (!allChecked || loading) return;
    setLoading(true);
    setError("");
    try {
      const startResponse = await Promise.race([
        startParticipant(studyId),
        new Promise((_, reject) => setTimeout(() => reject(new Error("The connection timed out. Please try again.")), 15000)),
      ]);
      setCondition(startResponse.data.condition);
      await saveConsent({ study_id: studyId, consentChecks: checks, demographics });
      await saveConsent(payload);

downloadPISPDF();
downloadConsentPDF({
  studyId,
  demographics,
});
      setStep("ai-literacy");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "We could not create your study session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="container py-5">
    <div className="row justify-content-center"><div className="col-lg-9">
      <div className="card research-card bg-white p-4 p-md-5 mb-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div><p className="text-uppercase text-primary fw-bold small mb-1">Abertay University Research</p><h1 className="h3 fw-bold">Participant Information Sheet</h1></div>
          <span className="badge text-bg-light border">Study ID: {studyId?.slice(0,8)}</span>
        </div>
        <pre className="text-muted" style={{whiteSpace:"pre-wrap", fontFamily:"inherit"}}>{pisText}</pre>
      </div>
      <div className="card research-card p-4 p-md-5">
        <h2 className="h4 fw-bold mb-3">Informed Consent Form</h2>
        {consentStatements.map((txt,i)=><label className={`choice-card d-flex gap-3 p-3 mb-2 border rounded-3 ${checks[i]?"selected":""}`} key={txt}>
          <input type="checkbox" checked={checks[i]} onChange={()=>{const c=[...checks]; c[i]=!c[i]; setChecks(c)}} />
          <span className="small">{txt}</span>
        </label>)}
        <hr />
        <h3 className="h5 fw-bold">Basic background information</h3>
        <div className="row g-3 mb-4">
          <div className="col-md-4"><label className="form-label">Age band</label><select className="form-select" value={demographics.ageBand} onChange={e=>setDemographics({...demographics, ageBand:e.target.value})}><option value="">Select</option>{["18–24","25–34","35–44","45–54","55+"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="col-md-4"><label className="form-label">Gender</label><select className="form-select" value={demographics.gender} onChange={e=>setDemographics({...demographics, gender:e.target.value})}><option value="">Select</option>{["Female","Male","Non-binary","Prefer not to say","Self-describe"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="col-md-4"><label className="form-label">Current status</label><select className="form-select" value={demographics.status} onChange={e=>setDemographics({...demographics, status:e.target.value})}><option value="">Select</option>{["Student","Employed","Self-employed","Not currently employed","Other"].map(x=><option key={x}>{x}</option>)}</select></div>
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <button className="btn btn-indigo btn-lg" disabled={!allChecked || loading} onClick={continueStudy}>{loading?"Preparing your study session…":"I Agree and Wish to Proceed"}</button>
        {loading && <p className="small text-muted mt-3 mb-0" aria-live="polite">Saving consent, assigning the study condition, and preparing the next page. Please do not close this window.</p>}
      </div>
    </div></div>
  </main>;
}