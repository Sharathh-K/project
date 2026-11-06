import { formatNumber } from "../format.js";

function qualityStatusText(quality) {
  if (quality.status === "rejected") return `File rejected (${formatNumber(quality.issueCount)} issues)`;
  if (quality.status === "review") return `Review recommended (${formatNumber(quality.warningCount)} warnings)`;
  return "Ready to run";
}

function distributionRows(items, valueLabel) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return items.map((item) => ({
    label: item.label,
    count: item.count,
    share: item.share,
    width: (item.count / max) * 100,
    value: valueLabel(item),
  }));
}

function Distribution({ title, items, valueLabel = (item) => `${(item.share * 100).toFixed(1)}%` }) {
  const rows = distributionRows(items, valueLabel);
  return (
    <div className="quality-distribution">
      <h4>{title}</h4>
      {rows.length ? rows.map((row, index) => (
        <div className="quality-bar-row" key={`${row.label}-${index}`}>
          <span>{row.label}</span>
          <span
            className="quality-bar-track"
            role="img"
            aria-label={`${row.label}: ${formatNumber(row.count)} rows, ${row.value}`}
          >
            <span className="quality-bar-fill" style={{ width: `${row.width}%` }} />
          </span>
          <small>{row.value} ({formatNumber(row.count)})</small>
        </div>
      )) : <p className="quality-empty">No values available.</p>}
    </div>
  );
}

function ColumnProfile({ column }) {
  const range = column.detectedType === "numeric"
    ? `${column.min} / ${column.median} / ${column.max}`
    : column.categories.map((item) => `${item.value} (${(item.share * 100).toFixed(1)}%)`).join(", ") || "—";
  return (
    <tr>
      <td>{column.column}</td>
      <td>{column.role}</td>
      <td>{column.detectedType}</td>
      <td>{formatNumber(column.missing)} ({column.missingPercent.toFixed(2)}%)</td>
      <td>{range}</td>
    </tr>
  );
}

export default function DataQualityReport({ quality, onOpenPlanner }) {
  if (!quality) {
    return (
      <section className="overview-section data-quality-section" id="data-quality-report">
        <div className="overview-section-heading">
          <div>
            <p className="eyebrow">DATA QUALITY</p>
            <h2>Review your customer file</h2>
          </div>
        </div>
        <div className="quality-empty-state">
          <p>Upload a customer CSV in the Campaign planner to see a data quality report</p>
          <button type="button" className="button button-primary" onClick={onOpenPlanner}>
            Open campaign planner <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    );
  }

  const statusClass = quality.status === "rejected"
    ? "quality-status-fail"
    : quality.status === "review"
      ? "quality-status-warn"
      : "quality-status-pass";
  return (
    <section className="overview-section data-quality-section" id="data-quality-report">
      <div className="overview-section-heading">
        <div>
          <p className="eyebrow">DATA QUALITY</p>
          <h2>Review your customer file</h2>
          <p>{formatNumber(quality.rowCount)} parsed customer rows · {quality.headers.length} columns</p>
        </div>
        <span className={`quality-status-chip ${statusClass}`}>
          <span aria-hidden="true">{quality.status === "ready" ? "✓" : quality.status === "review" ? "!" : "×"}</span>
          {qualityStatusText(quality)}
        </span>
      </div>

      <ul className="quality-checklist" aria-label="Data quality checks">
        {quality.checks.map((check) => (
          <li className={`quality-check quality-check-${check.status}`} key={check.id}>
            <span aria-hidden="true">{check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "×"}</span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {quality.validationError && (
        <p className="quality-validation-error" role="alert">
          CSV validation error: {quality.validationError}
        </p>
      )}
      {quality.outcomeColumns.length > 0 && (
        <p className="quality-outcome-note">
          Post-campaign outcomes ({quality.outcomeColumns.join(", ")}) are ignored and never sent to the API.
        </p>
      )}

      <div className="quality-table-wrap">
        <table className="quality-table">
          <thead>
            <tr>
              <th scope="col">Column</th>
              <th scope="col">Role</th>
              <th scope="col">Detected type</th>
              <th scope="col">Missing</th>
              <th scope="col">Min / median / max or top categories</th>
            </tr>
          </thead>
          <tbody>
            {quality.columns.map((column) => <ColumnProfile key={column.column} column={column} />)}
          </tbody>
        </table>
      </div>

      <div className="quality-distribution-grid">
        <Distribution title="ZIP code" items={quality.distributions.zip_code} />
        <Distribution title="Channel" items={quality.distributions.channel} />
        <Distribution title="Newbie" items={quality.distributions.newbie} />
        <Distribution title="Recency · five buckets" items={quality.distributions.recency} valueLabel={(item) => `${formatNumber(item.count)} rows`} />
        <Distribution title="History · five buckets" items={quality.distributions.history} valueLabel={(item) => `${formatNumber(item.count)} rows`} />
      </div>
    </section>
  );
}
