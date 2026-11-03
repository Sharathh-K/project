import { useState } from "react";
import { formatCurrency, formatNumber, formatUplift } from "../format.js";

const PAGE_SIZE = 25;

export default function Results({ result, page, setPage }) {
  const { data, valuePerConversion } = result;
  const allocations = data.allocations;
  const [selectedArm, setSelectedArm] = useState("All arms");
  const [selectedZip, setSelectedZip] = useState("All ZIP codes");
  const [selectedChannel, setSelectedChannel] = useState("All channels");
  const [upliftFilter, setUpliftFilter] = useState("All uplift");
  const [search, setSearch] = useState("");
  const filteredAllocations = allocations.filter((row) => {
    const matchesArm = selectedArm === "All arms" || row.assigned_arm === selectedArm;
    const matchesZip = selectedZip === "All ZIP codes" || row.zip_code === selectedZip;
    const matchesChannel = selectedChannel === "All channels" || row.channel === selectedChannel;
    const matchesUplift = upliftFilter === "All uplift"
      || (upliftFilter === "Positive uplift" ? row.expected_uplift > 0 : row.expected_uplift <= 0);
    const matchesSearch = !search.trim()
      || String(row.customer_id).toLowerCase().includes(search.trim().toLowerCase());
    return matchesArm && matchesZip && matchesChannel && matchesUplift && matchesSearch;
  });
  const pageCount = Math.max(1, Math.ceil(filteredAllocations.length / PAGE_SIZE));
  const visibleRows = filteredAllocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = data.summary;
  const costDifference = summary.cost_saving_vs_blanket_mens;
  const noEmailCount = allocations.filter((row) => row.assigned_arm === "No E-Mail").length;

  return (
    <section className="results-section" aria-live="polite">
      <div className="section-heading results-heading">
        <div>
          <p className="eyebrow">Optimization complete</p>
          <h2>Your campaign plan</h2>
        </div>
        <span className="result-count">{formatNumber(summary.n_customers)} customers analyzed</span>
      </div>

      <div className="result-grid">
        <article className="result-card result-card-primary">
          <span className="result-label">Planned spend</span>
          <strong>{formatCurrency(summary.total_cost)}</strong>
          <span>of {formatCurrency(summary.budget)} budget</span>
        </article>
        <article className="result-card">
          <span className="result-label">Estimated extra revenue</span>
          <strong>{formatCurrency(summary.total_expected_revenue)}</strong>
          <span>Model estimate, not a guarantee</span>
        </article>
        <article className="result-card">
          <span className="result-label">Customers selected</span>
          <strong>{formatNumber(summary.n_persuadables)} / {formatNumber(summary.n_customers)}</strong>
          <span>Selected out of total customers</span>
        </article>
        <article className="result-card">
          <span className="result-label">No e-mail</span>
          <strong>{formatNumber(noEmailCount)}</strong>
          <span>Customers not assigned an e-mail</span>
        </article>
        <article className="result-card">
          <span className="result-label">{costDifference >= 0 ? "Saved vs. all Mens" : "More than all Mens"}</span>
          <strong>{formatCurrency(Math.abs(costDifference))}</strong>
          <span>Compared with e-mailing everyone</span>
        </article>
      </div>

      <div className="allocation-card">
        <div className="allocation-header">
          <div>
            <h3>Customer explorer</h3>
            <p>Search customers and filter their assigned arm, ZIP code, channel, or estimated uplift.</p>
          </div>
          <div className="allocation-tools">
            <span className="table-count">{formatNumber(filteredAllocations.length)} customers</span>
            <label className="arm-filter">
              <span>Arm</span>
              <select
                value={selectedArm}
                onChange={(event) => {
                  setSelectedArm(event.target.value);
                  setPage(1);
                }}
              >
                <option>All arms</option>
                <option>Mens E-Mail</option>
                <option>Womens E-Mail</option>
                <option>No E-Mail</option>
              </select>
            </label>
            <label className="arm-filter">
              <span>ZIP</span>
              <select value={selectedZip} onChange={(event) => { setSelectedZip(event.target.value); setPage(1); }}>
                <option>All ZIP codes</option>
                <option>Urban</option>
                <option>Suburban</option>
                <option>Rural</option>
              </select>
            </label>
            <label className="arm-filter">
              <span>Channel</span>
              <select value={selectedChannel} onChange={(event) => { setSelectedChannel(event.target.value); setPage(1); }}>
                <option>All channels</option>
                <option>Phone</option>
                <option>Web</option>
                <option>Multichannel</option>
              </select>
            </label>
            <label className="arm-filter">
              <span>Uplift</span>
              <select value={upliftFilter} onChange={(event) => { setUpliftFilter(event.target.value); setPage(1); }}>
                <option>All uplift</option>
                <option>Positive uplift</option>
                <option>Zero or negative</option>
              </select>
            </label>
            <label className="customer-search">
              <span className="visually-hidden">Search customer ID</span>
              <input
                type="search"
                placeholder="Search customer ID"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
          </div>
        </div>

        {filteredAllocations.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Recommendation</th>
                    <th>ZIP / channel</th>
                    <th>Est. uplift</th>
                    <th>Est. revenue</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.customer_id}-${index}`}>
                      <td className="customer-id">{row.customer_id}</td>
                      <td>
                        <span className={`arm-tag ${
                          row.assigned_arm === "Mens E-Mail"
                            ? "arm-mens"
                            : row.assigned_arm === "Womens E-Mail"
                              ? "arm-womens"
                              : "arm-none"
                        }`}>
                          {row.assigned_arm}
                        </span>
                      </td>
                      <td>{row.zip_code} / {row.channel}</td>
                      <td>{formatUplift(row.expected_uplift)}</td>
                      <td>{formatCurrency(row.expected_revenue)}</td>
                      <td>{formatCurrency(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-pagination">
              <span>
                Showing {formatNumber((page - 1) * PAGE_SIZE + 1)}–
                {formatNumber(Math.min(page * PAGE_SIZE, filteredAllocations.length))} of {formatNumber(filteredAllocations.length)}
              </span>
              <div className="pagination-controls">
                <button type="button" className="button button-quiet" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  Previous
                </button>
                <span>Page {page} of {pageCount}</span>
                <button type="button" className="button button-quiet" onClick={() => setPage(page + 1)} disabled={page >= pageCount}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-allocations">
            No customers match this e-mail arm.
          </div>
        )}
      </div>

      <p className="results-disclaimer">
        Results use estimated individual treatment effects and your e-mail cost assumptions. Revenue per conversion uses
        {` ${formatCurrency(valuePerConversion)} `}as entered. Predicted revenue is an estimate; this plan is not evidence
        that uplift targeting outperforms random targeting.
      </p>
    </section>
  );
}
