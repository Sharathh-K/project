import { useMemo, useState } from "react";
import { formatCurrency, formatNumber, formatUplift } from "../format.js";

const PAGE_SIZE = 25;

function bestArmUplift(row) {
  return Math.max(row.ite_mens ?? 0, row.ite_womens ?? 0);
}

const TABLE_COLUMNS = [
  { key: "customer_id", label: "Customer ID", value: (row) => row.customer_id },
  { key: "zip_code", label: "ZIP", value: (row) => row.zip_code },
  { key: "channel", label: "Channel", value: (row) => row.channel },
  {
    key: "newbie",
    label: "Newbie",
    value: (row) => row.newbie,
    render: (row) => (row.newbie ? "Yes" : "No"),
  },
  {
    key: "expected_uplift",
    label: "Est. uplift",
    value: bestArmUplift,
    render: (row) => formatUplift(bestArmUplift(row)),
  },
  {
    key: "expected_revenue",
    label: "Est. revenue",
    value: (row) => row.expected_revenue,
    render: (row) => formatCurrency(row.expected_revenue),
  },
  {
    key: "cost",
    label: "Cost",
    value: (row) => row.cost,
    render: (row) => formatCurrency(row.cost),
  },
  {
    key: "ite_mens",
    label: "Mens ITE",
    value: (row) => row.ite_mens,
    render: (row) => formatUplift(row.ite_mens),
  },
  {
    key: "ite_womens",
    label: "Womens ITE",
    value: (row) => row.ite_womens,
    render: (row) => formatUplift(row.ite_womens),
  },
  {
    key: "assigned_arm",
    label: "Recommendation",
    value: (row) => row.assigned_arm,
    render: (row) => (
      <span className={`arm-tag ${
        row.assigned_arm === "Mens E-Mail"
          ? "arm-mens"
          : row.assigned_arm === "Womens E-Mail"
            ? "arm-womens"
            : "arm-none"
      }`}>
        {row.assigned_arm}
      </span>
    ),
  },
];

export default function Results({ result, page, setPage }) {
  const { data, valuePerConversion } = result;
  const allocations = data.allocations;
  const [selectedArm, setSelectedArm] = useState("All arms");
  const [selectedZip, setSelectedZip] = useState("All ZIP codes");
  const [selectedChannel, setSelectedChannel] = useState("All channels");
  const [upliftFilter, setUpliftFilter] = useState("All uplift");
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState("customer_id");
  const [sortDirection, setSortDirection] = useState("ascending");
  const filteredAllocations = useMemo(() => allocations.filter((row) => {
    const matchesArm = selectedArm === "All arms" || row.assigned_arm === selectedArm;
    const matchesZip = selectedZip === "All ZIP codes" || row.zip_code === selectedZip;
    const matchesChannel = selectedChannel === "All channels" || row.channel === selectedChannel;
    const uplift = bestArmUplift(row);
    const matchesUplift = upliftFilter === "All uplift"
      || (upliftFilter === "Positive uplift" ? uplift > 0 : uplift <= 0);
    const matchesSearch = !search.trim()
      || String(row.customer_id).toLowerCase().includes(search.trim().toLowerCase());
    return matchesArm && matchesZip && matchesChannel && matchesUplift && matchesSearch;
  }), [allocations, selectedArm, selectedZip, selectedChannel, upliftFilter, search]);
  const sortedAllocations = useMemo(() => {
    const column = TABLE_COLUMNS.find((item) => item.key === sortColumn);
    const direction = sortDirection === "ascending" ? 1 : -1;
    return [...filteredAllocations].sort((a, b) => {
      const aValue = column.value(a);
      const bValue = column.value(b);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * direction;
    });
  }, [filteredAllocations, sortColumn, sortDirection]);
  const pageCount = Math.max(1, Math.ceil(filteredAllocations.length / PAGE_SIZE));
  const visibleRows = sortedAllocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = data.summary;
  const costDifference = summary.cost_saving_vs_blanket_mens;
  const noEmailCount = allocations.filter((row) => row.assigned_arm === "No E-Mail").length;

  function sortBy(columnKey) {
    if (sortColumn === columnKey) {
      setSortDirection((current) => current === "ascending" ? "descending" : "ascending");
    } else {
      setSortColumn(columnKey);
      setSortDirection("ascending");
    }
    setPage(1);
  }

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
            <p>Search or filter customers. Est. uplift is the best of both arm estimates, including customers not selected within budget.</p>
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
                    {TABLE_COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        aria-sort={sortColumn === column.key ? sortDirection : "none"}
                      >
                        <button
                          type="button"
                          className="sort-button"
                          onClick={() => sortBy(column.key)}
                          aria-label={`Sort by ${column.label}`}
                        >
                          {column.label}
                          <span aria-hidden="true">
                            {sortColumn === column.key
                              ? sortDirection === "ascending" ? " ↑" : " ↓"
                              : " ↕"}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.customer_id}-${index}`}>
                      {TABLE_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={column.key === "customer_id" ? "customer-id" : undefined}
                        >
                          {column.render ? column.render(row) : column.value(row)}
                        </td>
                      ))}
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
            No customers match these filters.
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
