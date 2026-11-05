const STATUS_LABELS = {
  done: "Done",
  current: "Current",
  waiting: "Waiting",
};

function WorkflowStep({ number, label, status }) {
  return (
    <li className={`workflow-step workflow-${status}`}>
      <span className="workflow-icon" aria-hidden="true">
        {status === "done" ? "✓" : number}
      </span>
      <div>
        <strong>{label}</strong>
        <span className="workflow-state">{STATUS_LABELS[status]}</span>
      </div>
    </li>
  );
}

export default function WorkflowStatus({ customers, quality, drift, result, exported }) {
  const hasUpload = Boolean(quality);
  const acceptedUpload = customers.length > 0;
  const uploadStatus = acceptedUpload
    ? "done"
    : hasUpload
      ? "current"
      : "current";
  const driftStatus = drift.status === "checking"
    ? "current"
    : drift.status === "done" || drift.status === "unavailable"
      ? "done"
      : "waiting";
  const optimizationStatus = result
    ? "done"
    : acceptedUpload
      ? "current"
      : "waiting";
  const exportStatus = exported
    ? "done"
    : result
      ? "current"
      : "waiting";

  return (
    <section className="overview-section workflow-section">
      <div className="overview-section-heading">
        <div>
          <p className="eyebrow">WORKFLOW STATUS</p>
          <h2>Campaign progress</h2>
        </div>
      </div>
      <ol className="workflow-list">
        <WorkflowStep number="1" label="Upload data" status={uploadStatus} />
        <WorkflowStep number="2" label="Drift check" status={driftStatus} />
        <WorkflowStep number="3" label="Run optimization" status={optimizationStatus} />
        <WorkflowStep number="4" label="Export plan" status={exportStatus} />
      </ol>
    </section>
  );
}
