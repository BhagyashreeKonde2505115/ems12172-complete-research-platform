export default function ProgressBar({ current, total }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between small text-muted mb-2">
        <span>Progress</span><span>{percent}%</span>
      </div>
      <div className="progress" style={{height:"10px"}}>
        <div className="progress-bar" style={{width:`${percent}%`, backgroundColor:"#4f46e5"}} />
      </div>
    </div>
  );
}
