const stages=[
  {name:"Discover",description:"Clarify your goal and context."},
  {name:"Develop",description:"Generate options or a first draft."},
  {name:"Refine",description:"Improve, compare and personalise."},
  {name:"Consolidate",description:"Create a clear final outcome."}
];
export default function StageIndicator({stage,onChange}){
  return <div className="stage-list">{stages.map((s,i)=><button type="button" key={s.name} className={`stage-card ${stage===i+1?"active":""} ${stage>i+1?"done":""}`} onClick={()=>onChange(i+1)}><span>{stage>i+1?"✓":i+1}</span><div><strong>{s.name}</strong><small>{s.description}</small></div></button>)}</div>;
}
