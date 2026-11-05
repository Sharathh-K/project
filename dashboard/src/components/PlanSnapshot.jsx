import { formatCurrency, formatNumber } from "../format.js";

function barWidth(value, total) {
  return total > 0 ? `${(value / total) * 100}%` : "0%";
}

export default function PlanSnapshot({ result, onOpenPlanner, onOpenInsights }) {
  if (!result) return null;
  const { summary, allocations } = result.data;
  const noEmail = Math.max(0, summary.n_customers - summary.mens_emails - summary.womens_emails);
  const usedPercent = summary.budget > 0
    ? Math.min(100, Math.max(0, summary.total_cost / summary.budget * 100))
    : 0;

  return (
    <section className="overview-section plan-snapshot-section">
      <div className="overview-section-heading">
        <div>
          <p className="eyebrow">LATEST PLAN SNAPSHOT</p>
          <h2>Budget and arm allocation</h2>
        </div>
      </div>
      <div className="snapshot-metrics">
        <div className="snapshot-budget">
          <div className="snapshot-label">
            <strong>Budget used</strong>
            <span>{formatCurrency(summary.total_cost)} of {formatCurrency(summary.budget)} ({usedPercent.toFixed(1)}%)</span>
          </div>
          <div
            className="snapshot-progress"
            role="img"
            aria-label={`Budget used: ${usedPercent.toFixed(1)} percent`}
          >
            <span style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
        <div className="snapshot-arms">
          <strong>Customer allocation</strong>
          <div
            className="arm-split-bar"
            role="img"
            aria-label={`${formatNumber(summary.mens_emails)} Mens e-mails, ${formatNumber(summary.womens_emails)} Womens e-mails, ${formatNumber(noEmail)} no e-mail`}
          >
            <span className="arm-split-mens" style={{ width: barWidth(summary.mens_emails, summary.n_customers) }} />
            <span className="arm-split-womens" style={{ width: barWidth(summary.womens_emails, summary.n_customers) }} />
            <span className="arm-split-none" style={{ width: barWidth(noEmail, summary.n_customers) }} />
          </div>
          <ul className="arm-split-legend">
            <li><span className="legend-dot arm-split-mens" />Mens: {formatNumber(summary.mens_emails)}</li>
            <li><span className="legend-dot arm-split-womens" />Womens: {formatNumber(summary.womens_emails)}</li>
            <li><span className="legend-dot arm-split-none" />No e-mail: {formatNumber(noEmail)}</li>
          </ul>
          <span className="visually-hidden">{formatNumber(allocations.length)} allocation rows</span>
        </div>
      </div>
      <div className="snapshot-actions">
        <button type="button" className="button button-primary" onClick={onOpenPlanner}>
          Open campaign planner <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="button button-quiet" onClick={onOpenInsights}>
          View insights <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
