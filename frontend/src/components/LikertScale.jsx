export default function LikertScale({
  value,
  onChange,
  points = 7,
  minLabel = "Strongly disagree",
  maxLabel = "Strongly agree",
}) {
  const scalePoints = Array.from(
    { length: points },
    (_, index) => index + 1
  );

  return (
    <div
      className="questionnaire-likert"
      style={{ "--likert-points": points }}
    >
      <div
        className="questionnaire-likert-labels"
        aria-hidden="true"
      >
        <span className="questionnaire-likert-label questionnaire-likert-label-min">
          {minLabel}
        </span>

        <span className="questionnaire-likert-label questionnaire-likert-label-max">
          {maxLabel}
        </span>
      </div>

      <div
        className="questionnaire-likert-options"
        role="radiogroup"
        aria-label={`${minLabel} to ${maxLabel}`}
      >
        {scalePoints.map((point) => (
          <button
            type="button"
            className={`questionnaire-likert-button btn ${
              value === point
                ? "btn-indigo"
                : "btn-outline-secondary"
            }`}
            key={point}
            role="radio"
            aria-checked={value === point}
            aria-label={`${point} of ${points}${
              point === 1
                ? `, ${minLabel}`
                : point === points
                  ? `, ${maxLabel}`
                  : ""
            }`}
            onClick={() => onChange(point)}
          >
            {point}
          </button>
        ))}
      </div>
    </div>
  );
}
