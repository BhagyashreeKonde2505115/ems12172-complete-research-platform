import { useEffect, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { consentStatements, pisText } from "../data/content.js";
import { startParticipant, saveConsent } from "../utils/api.js";

export default function PISConsent() {
  const { studyId, setCondition, setStep, demographics, setDemographics } = useExperiment();
  const [checks, setChecks] = useState(Array(10).fill(false));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studyId) return;
    startParticipant(studyId).then(res => setCondition(res.data.condition)).catch(console.error);
  }, [studyId, setCondition]);

  const allChecked = checks.every(Boolean) && demographics.ageBand && demographics.gender && demographics.aiExperience;

  const continueStudy = async () => {
    setLoading(true);
    await saveConsent({ study_id: studyId, consentChecks: checks, demographics });
    setLoading(false);
    setStep("chat");
  };

  return <main className="container py-5">
    <div className="row justify-content-center"><div className="col-lg-9">
      <div className="card research-card bg-white p-4 p-md-5 mb-4">
        <div className="d-flex justify-content-between align-items-start mb-3"><div><p className="text-uppercase text-primary fw-bold small mb-1">Abertay University · EMS12172</p><h1 className="h3 fw-bold">Participant Information Sheet</h1></div><span className="badge text-bg-light border">Study ID: {studyId?.slice(0,8)}</span></div>
        <pre className="text-muted" style={{whiteSpace:"pre-wrap", fontFamily:"inherit"}}>{pisText}</pre>
      </div>
      <div className="card research-card p-4 p-md-5">
        <h2 className="h4 fw-bold mb-3">Informed Consent Form</h2>
        {consentStatements.map((txt,i)=><label className={`choice-card d-flex gap-3 p-3 mb-2 border rounded-3 ${checks[i]?"selected":""}`} key={txt}>
          <input type="checkbox" checked={checks[i]} onChange={()=>{const c=[...checks]; c[i]=!c[i]; setChecks(c)}} />
          <span className="small">{txt}</span>
        </label>)}
        <hr />
        <div className="row g-3 mb-4">
          <div className="col-md-4"><label className="form-label">Age Band</label><select className="form-select" value={demographics.ageBand} onChange={e=>setDemographics({...demographics, ageBand:e.target.value})}><option value="">Select</option>{["18-24","25-34","35-44","45-54","55+"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="col-md-4"><label className="form-label">Gender</label><select className="form-select" value={demographics.gender} onChange={e=>setDemographics({...demographics, gender:e.target.value})}><option value="">Select</option>{["Female","Male","Non-binary","Prefer not to say","Self-describe"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="col-md-4"><label className="form-label">AI Experience</label><select className="form-select" value={demographics.aiExperience} onChange={e=>setDemographics({...demographics, aiExperience:e.target.value})}><option value="">Select</option>{["None","Beginner","Intermediate","Advanced"].map(x=><option key={x}>{x}</option>)}</select></div>
        </div>
        <button className="btn btn-indigo btn-lg" disabled={!allChecked || loading} onClick={continueStudy}>{loading?"Saving...":"I Agree and Wish to Proceed"}</button>
      </div>
    </div></div>
  </main>;
}
