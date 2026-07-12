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
  const value = answers[index] || "";
  useEffect(()=>{ if(studyId) autosaveInterview({study_id:studyId, answers, lastIndex:index}).catch(()=>{}); }, [answers,index]);
  const next = async () => { if(index<interviewQuestions.length-1) setIndex(index+1); else { await submitInterview({study_id:studyId, answers}); downloadDebrief(studyId); setStep("debrief"); } };
  return <main className="container py-5"><div className="row justify-content-center"><div className="col-lg-8"><div className="card research-card p-4 p-md-5"><ProgressBar current={index+1} total={interviewQuestions.length}/><p className="text-primary fw-bold small">Interview question {index+1} of {interviewQuestions.length}</p><h1 className="h5 fw-bold mb-4">{interviewQuestions[index]}</h1><textarea className="form-control" rows="8" value={value} onChange={e=>setAnswers({...answers,[index]:e.target.value})} placeholder="Type your response here..."/><div className="d-flex justify-content-between mt-2"><small className="text-muted">{value.length} characters</small></div><div className="d-flex justify-content-between mt-4"><button className="btn btn-outline-secondary" disabled={index===0} onClick={()=>setIndex(index-1)}>Back</button><button className="btn btn-indigo" onClick={next}>{index===interviewQuestions.length-1?"Complete Interview":"Next"}</button></div></div></div></div></main>;
}
