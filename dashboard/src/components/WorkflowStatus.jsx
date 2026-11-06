const STATUS_LABELS = {
  done: "Done",
  current: "Current",
  waiting: "Waiting",
  unavailable: "Unavailable",
  "needs-review": "Needs review",
};

function WorkflowStep({ number, label, status }) {
  return (
    <li className={`workflow-step workflow-${status}`}>
      <span className="workflow-icon" aria-hidden="true">
        {status === "done" ? "✓" : status === "needs-review" ? "!" : status === "unavailable" ? "—" : number}
      </span>
      <div>
        <strong>{label}</strong>
        <span className="workflow-state">{STATUS_LABELS[status]}</span>
      </div>
    </li>
  );
}

export function getWorkflowStatuses({ customers, quality, drift, result, exported }) {
  const acceptedUpload = customers.length > 0;
  const uploadStatus = acceptedUpload
    ? "done"
    : quality?.status === "rejected"
      ? "needs-review"
      : "current";
  const driftStatus = drift.status === "checking"
    ? "current"
    : drift.status === "unavailable"
      ? "unavailable"
      : drift.status === "done"
        ? drift.data?.status === "ok"
          ? "done"
          : "needs-review"
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

  return { uploadStatus, driftStatus, optimizationStatus, exportStatus };
}

export default function WorkflowStatus({ customers, quality, drift, result, exported }) {
  const { uploadStatus, driftStatus, optimizationStatus, exportStatus } = getWorkflowStatuses({
    customers,
    quality,
    drift,
    result,
    exported,
  });

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
