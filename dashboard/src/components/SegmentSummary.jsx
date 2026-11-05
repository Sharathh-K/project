import { buildSegmentSummaries } from "../segmentSummary.js";
import { formatNumber, formatUplift } from "../format.js";

function SegmentTable({ label, groups }) {
  return (
    <article className="segment-table-card">
      <h3>{label}</h3>
      {groups.length ? (
        <div className="quality-table-wrap">
          <table className="quality-table">
            <thead>
              <tr>
                <th scope="col">Segment</th>
                <th scope="col">Customers</th>
                <th scope="col">Selected</th>
                <th scope="col">Avg. Mens uplift</th>
                <th scope="col">Avg. Womens uplift</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.label}>
                  <th scope="row">{group.label}</th>
                  <td>{formatNumber(group.customers)}</td>
                  <td>{formatNumber(group.selected)}</td>
                  <td>{formatUplift(group.mens)}</td>
                  <td>{formatUplift(group.womens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="workspace-muted">No segment data is available for this dimension.</p>}
    </article>
  );
}

export default function SegmentSummary({ result, onOpenPlanner }) {
  const allocations = result?.data?.allocations;
  if (!allocations?.length) {
    return (
      <section className="workspace-card" aria-labelledby="segment-summary-heading">
        <div className="workspace-card-heading">
          <div>
            <p className="eyebrow">PLAN EXPLORER</p>
            <h2 id="segment-summary-heading">Segments</h2>
            <p>Compare average estimated uplift across customer groups in the latest plan.</p>
          </div>
        </div>
        <div className="workspace-empty-state">
          <p>Run an optimization to see segment summaries from the latest plan.</p>
          <button type="button" className="button button-secondary" onClick={onOpenPlanner}>
            Open campaign planner <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    );
  }

  const summaries = buildSegmentSummaries(allocations);
  return (
    <section className="workspace-card" aria-labelledby="segment-summary-heading">
      <div className="workspace-card-heading">
        <div>
          <p className="eyebrow">PLAN EXPLORER</p>
          <h2 id="segment-summary-heading">Segments</h2>
          <p>Average estimated Mens and Womens uplift across the latest plan’s customer groups.</p>
        </div>
        <span className="result-count">{formatNumber(allocations.length)} customers</span>
      </div>
      <p className="segment-caveat" role="note">
        Subgroup averages are descriptive model estimates. Small-group differences can be noise and should not be treated as causal proof or guaranteed individual outcomes.
      </p>
      <div className="segment-table-grid">
        {summaries.map(({ key, ...summary }) => <SegmentTable key={key} {...summary} />)}
      </div>
    </section>
  );
}
