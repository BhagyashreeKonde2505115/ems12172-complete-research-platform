import { useMemo, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { saveAiLiteracy } from "../utils/api.js";

const tools = ["ChatGPT","Microsoft Copilot","Google Gemini","Claude","Perplexity","GitHub Copilot","Meta AI","Grammarly AI","Canva AI","Notion AI","Midjourney","DALL·E","Adobe Firefly","Other","I have never used an AI tool"];
const uses = ["Writing","Brainstorming","Planning","Presentations","Coding","Research","Data analysis","UX/design","Emails","Business or strategy","Studying","Other"];
const literacyItems = [
  "I understand that AI assistants generate responses from patterns in data rather than human thinking.",
  "I feel confident using AI for professional or academic tasks.",
  "I know how to write prompts that help me obtain useful responses.",
  "I understand that AI-generated responses can be inaccurate or misleading.",
  "I verify important information produced by AI before relying on it.",
  "I can usually recognise when an AI response needs checking or improvement.",
  "I feel comfortable collaborating with AI on complex tasks.",
  "Overall, I consider myself knowledgeable about using AI tools."
];

function LikertRow({ label, value, onChange, min="Strongly disagree", max="Strongly agree" }) {
  return <fieldset className="literacy-item">
    <legend>{label}</legend>
    <div className="d-flex justify-content-between small text-muted mb-2"><span>{min}</span><span>{max}</span></div>
    <div className="likert-inline">{[1,2,3,4,5,6,7].map(n=><label key={n}><input type="radio" name={label} checked={value===n} onChange={()=>onChange(n)}/><span>{n}</span></label>)}</div>
  </fieldset>;
}

export default function AILiteracy() {
  const { studyId, aiLiteracy, setAiLiteracy, setStep } = useExperiment();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const toggle=(key,item)=>{
    const alreadySelected=aiLiteracy[key].includes(item);
    const nextValues=alreadySelected
      ? aiLiteracy[key].filter(x=>x!==item)
      : [...aiLiteracy[key],item];

    const nextState={...aiLiteracy,[key]:nextValues};

    if(key==="primaryUses"&&item==="Other"&&alreadySelected){
      nextState.otherPrimaryUse="";
    }

    if(key==="tools"&&item==="Other"&&alreadySelected){
      nextState.otherTool="";
    }

    setAiLiteracy(nextState);
  };

  const complete = useMemo(() => {
    const otherUseComplete =
      !aiLiteracy.primaryUses.includes("Other") ||
      Boolean(aiLiteracy.otherPrimaryUse?.trim());

    return Boolean(
      aiLiteracy.usedBefore &&
      aiLiteracy.frequency &&
      aiLiteracy.duration &&
      aiLiteracy.baselineTrust &&
      otherUseComplete &&
      literacyItems.every((_,i)=>aiLiteracy.items[i])
    );
  }, [aiLiteracy]);

  const submit=async()=>{
    if(!complete||loading)return;
    setLoading(true);setError("");
    try{await saveAiLiteracy({study_id:studyId,aiLiteracy});setStep("interview");}
    catch(err){setError(err.response?.data?.error||"AI literacy responses could not be saved. Please try again.");}
    finally{setLoading(false)}
  };

  return <main className="container py-5"><div className="row justify-content-center"><div className="col-lg-9"><div className="card research-card p-4 p-md-5">
    <p className="text-primary fw-bold small text-uppercase">Background AI experience</p>
    <h1 className="h3 fw-bold">Your experience with AI tools</h1>
    <p className="text-muted">Please answer based on your general experience with AI tools. This section is placed after the task to avoid influencing your interaction. There are no right or wrong answers.</p>

    <label className="form-label fw-semibold mt-3">Have you used an AI assistant before?</label>
    <select className="form-select mb-4" value={aiLiteracy.usedBefore} onChange={e=>setAiLiteracy({...aiLiteracy,usedBefore:e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option></select>

    <fieldset className="mb-4"><legend className="h6 fw-bold">Which AI tools have you used? Select all that apply.</legend><div className="tool-grid">{tools.map(t=><label key={t} className="tool-choice"><input type="checkbox" checked={aiLiteracy.tools.includes(t)} onChange={()=>toggle("tools",t)}/><span>{t}</span></label>)}</div></fieldset>
    {aiLiteracy.tools.includes("Other")&&<label className="form-label w-100 mb-4">Other tool<input className="form-control mt-2" value={aiLiteracy.otherTool} onChange={e=>setAiLiteracy({...aiLiteracy,otherTool:e.target.value})}/></label>}

    <div className="row g-3 mb-4">
      <div className="col-md-4"><label className="form-label">Most-used AI tool</label><input className="form-control" value={aiLiteracy.mostUsed} onChange={e=>setAiLiteracy({...aiLiteracy,mostUsed:e.target.value})} placeholder="For example, ChatGPT"/></div>
      <div className="col-md-4"><label className="form-label">How often do you use AI?</label><select className="form-select" value={aiLiteracy.frequency} onChange={e=>setAiLiteracy({...aiLiteracy,frequency:e.target.value})}><option value="">Select</option>{["Never","Less than monthly","Monthly","Weekly","Several times a week","Daily"].map(x=><option key={x}>{x}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label">How long have you used AI?</label><select className="form-select" value={aiLiteracy.duration} onChange={e=>setAiLiteracy({...aiLiteracy,duration:e.target.value})}><option value="">Select</option>{["Never","Less than 6 months","6–12 months","1–2 years","More than 2 years"].map(x=><option key={x}>{x}</option>)}</select></div>
    </div>

    <fieldset className="mb-4">
      <legend className="h6 fw-bold">What do you mainly use AI for?</legend>
      <div className="tool-grid">
        {uses.map(t=><label key={t} className="tool-choice"><input type="checkbox" checked={aiLiteracy.primaryUses.includes(t)} onChange={()=>toggle("primaryUses",t)}/><span>{t}</span></label>)}
      </div>
    </fieldset>

    {aiLiteracy.primaryUses.includes("Other") && (
      <label className="form-label w-100 mb-4">
        Please describe the other reason you mainly use AI
        <input
          className="form-control mt-2"
          value={aiLiteracy.otherPrimaryUse || ""}
          onChange={e=>setAiLiteracy({...aiLiteracy,otherPrimaryUse:e.target.value})}
          maxLength={300}
          placeholder="Enter another use of AI"
        />
      </label>
    )}

    {literacyItems.map((q,i)=><LikertRow key={q} label={q} value={aiLiteracy.items[i]} onChange={v=>setAiLiteracy({...aiLiteracy,items:{...aiLiteracy.items,[i]:v}})}/>)}
    <LikertRow label="Before today, how much did you generally trust AI assistants?" value={aiLiteracy.baselineTrust} onChange={v=>setAiLiteracy({...aiLiteracy,baselineTrust:v})} min="Not at all" max="Completely"/>

    {error&&<div className="alert alert-danger">{error}</div>}
    <button className="btn btn-indigo btn-lg mt-3" disabled={!complete||loading} onClick={submit}>{loading?"Saving…":"Continue"}</button>
  </div></div></div></main>;
}
