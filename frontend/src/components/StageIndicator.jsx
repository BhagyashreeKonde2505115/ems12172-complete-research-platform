const stages = [
  {
    name: "Discover",
    description: "Clarify your goal, context and possible directions.",
  },
  {
    name: "Develop",
    description: "Expand the strongest ideas and compare useful alternatives.",
  },
  {
    name: "Refine",
    description: "Identify weaknesses and improve clarity, feasibility and quality.",
  },
  {
    name: "Consolidate",
    description: "Bring the strongest elements together into a clear final outcome.",
  },
];

export default function StageIndicator({ stage }) {
  return (
    <div className="stage-list" aria-label="Task stages">
      {stages.map((item, index) => {
        const stageNumber = index + 1;
        const isActive = stage === stageNumber;
        const isDone = stage > stageNumber;

        return (
          <div
            key={item.name}
            className={`stage-card ${isActive ? "active" : ""} ${
              isDone ? "done" : ""
            }`}
            aria-current={isActive ? "step" : undefined}
          >
            <span>{isDone ? "✓" : stageNumber}</span>
            <div>
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
