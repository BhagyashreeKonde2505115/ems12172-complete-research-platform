import { useEffect, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { questionnaireItems } from "../data/questionnaire.js";
import { autosaveQuestionnaire, submitQuestionnaire } from "../utils/api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import LikertScale from "../components/LikertScale.jsx";

export default function Questionnaire() {
  const { studyId, setStep } = useExperiment();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const item = questionnaireItems[index];

  useEffect(()=>{ if(studyId) autosaveQuestionnaire({study_id:studyId, responses, lastQuestionKey:item?.key}).catch(()=>{}); }, [responses, index]);

  const next = async () => {
    if (!responses[item.key]) return;
    if (index < questionnaireItems.length - 1) setIndex(index+1);
    else { await submitQuestionnaire({ study_id: studyId, responses }); setStep("interview"); }
  };

  return <main className="container py-5"><div className="row justify-content-center"><div className="col-lg-8"><div className="card research-card p-4 p-md-5"><ProgressBar current={index+1} total={questionnaireItems.length}/><p className="text-primary fw-bold small text-uppercase">{item.scale}</p><h1 className="h4 fw-bold mb-4">{item.label}</h1>{item.reverse && <p className="small text-muted">Reverse-scored item.</p>}<LikertScale points={item.points} value={responses[item.key]} minLabel={item.minLabel} maxLabel={item.maxLabel} onChange={v=>setResponses({...responses,[item.key]:v})}/><div className="d-flex justify-content-between mt-5"><button className="btn btn-outline-secondary" disabled={index===0} onClick={()=>setIndex(index-1)}>Back</button><button className="btn btn-indigo" disabled={!responses[item.key]} onClick={next}>{index===questionnaireItems.length-1?"Submit Questionnaire":"Next"}</button></div></div></div></div></main>;
}
