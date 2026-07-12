import { useEffect, useRef, useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { sendChatMessage, logEvent } from "../utils/api.js";
import Timer from "../components/Timer.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import StageIndicator from "../components/StageIndicator.jsx";

const greetings={
  WC:"## Welcome\n\nHello — I’m your AI collaboration partner for this task.\n\nWe can explore your goal, develop ideas, refine them, and bring everything together into a useful outcome.\n\n**What would you like help with today?**",
  NI:"## Start\n\nAI assistant ready.\n\nDescribe the task, goal, or problem you want assistance with. The interaction will move through understanding, development, refinement, and consolidation.\n\n**What task would you like to work on?**"
};

export default function ChatTask() {
  const { studyId, condition, setStep, taskStage, setTaskStage } = useExperiment();
  const [messages, setMessages] = useState([{ role:"assistant", text:greetings[condition]||greetings.NI }]);
  const [input, setInput] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,setError]=useState("");
  const bottomRef=useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || expired || loading) return;
    const user={role:"user",text:input.trim()};
    const updated=[...messages,user];
    setMessages(updated);setInput("");setLoading(true);setError("");
    try {
      const res=await sendChatMessage({study_id:studyId,message:user.text,stage:taskStage,history:updated.map(m=>({role:m.role,text:m.text}))});
      setMessages([...updated,{role:"assistant",text:res.data.reply}]);
    } catch(e){setError(e.response?.data?.details||e.response?.data?.error||"The assistant could not respond. Please try again.");}
    finally{setLoading(false)}
  };

  const finish=async()=>{
    try{await logEvent({study_id:studyId,eventType:"chat_finished",payload:{turns:messages.length,stage:taskStage}})}catch(e){console.error(e)}
    setStep("questionnaire");
  };

  return <main className="container-fluid py-4 px-lg-5"><div className="row g-4">
    <div className="col-xl-3"><div className="card research-card p-4 task-sidebar">
      <div className="d-flex justify-content-between align-items-center mb-3"><h1 className="h4 fw-bold mb-0">Your AI task</h1><Timer seconds={900} onExpire={()=>setExpired(true)}/></div>
      <p className="text-muted small">Choose any non-sensitive workplace, study, planning, writing, creative, analytical, design, coding, communication or problem-solving task.</p>
      <StageIndicator stage={taskStage} onChange={setTaskStage}/>
      <div className="study-id-box"><small>Your study ID</small><strong>{studyId}</strong></div>
      {expired&&<div className="alert alert-warning small">Time is complete. Please proceed to the questionnaire.</div>}
      <button className="btn btn-indigo mt-3" disabled={messages.filter(m=>m.role==="user").length===0} onClick={finish}>{expired?"Proceed to questionnaire":"Finish task and proceed"}</button>
    </div></div>
    <div className="col-xl-9"><div className="card research-card p-3 p-md-4 chat-card">
      <div className="chat-header"><div><p className="text-primary text-uppercase fw-bold small mb-1">Stage {taskStage} of 4</p><h2 className="h4 fw-bold mb-0">Adaptive AI workspace</h2></div></div>
      <div className="chat-window p-3 mb-3">{messages.map((m,i)=><MessageBubble key={i} message={m}/>)}{loading&&<div className="typing-indicator"><span></span><span></span><span></span><em>Preparing a structured response…</em></div>}<div ref={bottomRef}/></div>
      {error&&<div className="alert alert-danger py-2">{error}</div>}
      <div className="chat-composer"><textarea className="form-control" rows="3" disabled={expired||loading} value={input} maxLength={5000} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Describe your task, answer the follow-up question, or ask for a refinement…"/><div className="composer-footer"><small className="text-muted">{input.length}/5000 · Enter to send · Shift+Enter for a new line</small><button className="btn btn-indigo" disabled={!input.trim()||expired||loading} onClick={send}>Send</button></div></div>
    </div></div>
  </div></main>;
}
