export default function LikertScale({ value, onChange, points = 7, minLabel="Strongly disagree", maxLabel="Strongly agree" }) {
  return (
    <div>
      <div className="d-flex justify-content-between small text-muted mb-2"><span>{minLabel}</span><span>{maxLabel}</span></div>
      <div className="row g-2">
        {Array.from({ length: points }, (_, i) => i + 1).map(n => (
          <div className="col" key={n}>
            <button type="button" className={`w-100 btn ${value===n ? "btn-indigo" : "btn-outline-secondary"}`} onClick={() => onChange(n)}>{n}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
