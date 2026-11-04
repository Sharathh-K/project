function driftRows(data) {
  return [...(data.features ?? []), ...(data.predictions ?? [])];
}

export default function DriftBanner({ drift }) {
  if (!drift || drift.status === "idle") return null;

  if (drift.status === "checking") {
    return (
      <div className="drift-banner drift-checking" role="status">
        <span aria-hidden="true">◌</span>
        <p>Checking your data against the training data...</p>
      </div>
    );
  }

  if (drift.status === "unavailable") {
    return (
      <div className="drift-banner drift-unavailable" role="status">
        <span aria-hidden="true">i</span>
        <p>Drift check unavailable: {drift.error}</p>
      </div>
    );
  }

  const { data } = drift;
  const role = data.status === "alert" ? "alert" : "status";
  const flagged = driftRows(data).filter((row) => row.status !== "ok");
  const rows = driftRows(data);
  const headline = data.messages?.[0] ?? "Drift check completed.";

  return (
    <div className={`drift-banner drift-${data.status}`} role={role}>
      <span className="drift-icon" aria-hidden="true">
        {data.status === "ok" ? "✓" : data.status === "watch" ? "!" : data.status === "alert" ? "!" : "i"}
      </span>
      <div className="drift-content">
        <p>{headline}</p>
        {data.status === "watch" && flagged.length > 0 && (
          <p>
            Flagged features: {flagged.map((row) => `${row.feature} (PSI ${Number(row.psi).toFixed(2)}, ${row.status})`).join("; ")}.
          </p>
        )}
        {data.status === "alert" && (
          <p>Uplift estimates and the allocation may be unreliable; review the data before acting on the plan.</p>
        )}
        {data.status === "insufficient_data" && data.messages?.length === 0 && (
          <p>At least 500 rows are needed for a reliable drift check.</p>
        )}
        {rows.length > 0 && (
          <details>
            <summary>Details</summary>
            <p>
              Population Stability Index: how much a feature's distribution changed versus the training data.
            </p>
            <ul>
              {rows.map((row) => (
                <li key={`${row.type}-${row.feature}`}>
                  {row.feature} ({row.type}): PSI {Number(row.psi).toFixed(2)} — {row.status}
                </li>
              ))}
            </ul>
            <p>
              Thresholds: watch ≥ {Number(data.thresholds?.watch ?? 0.1).toFixed(2)}, alert ≥{" "}
              {Number(data.thresholds?.alert ?? 0.25).toFixed(2)}.
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
