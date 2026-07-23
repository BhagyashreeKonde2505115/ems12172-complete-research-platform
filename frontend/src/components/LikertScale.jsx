export default function LikertScale({
  value,
  onChange,
  points = 7,
  minLabel = "Strongly disagree",
  maxLabel = "Strongly agree",
  name = "likert-scale",
  disabled = false,
}) {
  const safePoints = Math.max(2, Number(points) || 7);

  const scalePoints = Array.from(
    { length: safePoints },
    (_, index) => index + 1
  );

  function handleKeyDown(event, point) {
    if (disabled) return;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(safePoints, point + 1));
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(1, point - 1));
    }

    if (event.key === "Home") {
      event.preventDefault();
      onChange(1);
    }

    if (event.key === "End") {
      event.preventDefault();
      onChange(safePoints);
    }
  }

  return (
    <div
      className="questionnaire-likert"
      style={{ "--likert-points": safePoints }}
    >
      <div
        className="questionnaire-likert-grid questionnaire-likert-labels"
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
        className="questionnaire-likert-grid questionnaire-likert-options"
        role="radiogroup"
        aria-label={`${minLabel} to ${maxLabel}`}
      >
        {scalePoints.map((point) => {
          const selected = Number(value) === point;

          return (
            <label
              className={`questionnaire-likert-choice ${
                selected ? "selected" : ""
              } ${disabled ? "disabled" : ""}`}
              key={point}
            >
              <input
                type="radio"
                name={name}
                value={point}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(point)}
                onKeyDown={(event) => handleKeyDown(event, point)}
                aria-label={`${point} of ${safePoints}${
                  point === 1
                    ? `, ${minLabel}`
                    : point === safePoints
                      ? `, ${maxLabel}`
                      : ""
                }`}
              />

              <span className="questionnaire-likert-circle">
                {point}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
