import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatNumber, formatUplift } from "../format.js";
import { buildPlanSummary } from "../planSummary.js";
import { ALLOCATION_FILTERS, matchesAllocationFilter } from "../allocationFilters.js";
import {
  downloadCsv,
  downloadExcel,
  downloadPdf,
  getLocalDateString,
  isExportDisabled,
} from "../exportTable.js";

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
    label: "Best-arm uplift",
    title: "Best-arm uplift = the larger of the Mens and Womens estimates. The optimizer can assign the cheaper Mens e-mail even when the Womens estimate is slightly higher, so revenue uses the assigned arm's estimate.",
    value: bestArmUplift,
    render: (row) => formatUplift(bestArmUplift(row)),
  },
  {
    key: "expected_revenue",
    label: "Est. revenue (assigned arm)",
    title: "Best-arm uplift = the larger of the Mens and Womens estimates. The optimizer can assign the cheaper Mens e-mail even when the Womens estimate is slightly higher, so revenue uses the assigned arm's estimate.",
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

export default function Results({ result, page, setPage, drift, onExported }) {
  const { data, valuePerConversion } = result;
  const allocations = data.allocations;
  const [showCompletionToast, setShowCompletionToast] = useState(true);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState("expected_revenue");
  const [sortDirection, setSortDirection] = useState("descending");
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowCompletionToast(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredAllocations = useMemo(() => allocations.filter((row) => {
    const matchesSearch = !search.trim()
      || String(row.customer_id).toLowerCase().includes(search.trim().toLowerCase());
    return matchesAllocationFilter(row, filterColumn, filterValue) && matchesSearch;
  }), [allocations, filterColumn, filterValue, search]);
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
  const planSummary = buildPlanSummary(summary, valuePerConversion);
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

  async function handleExport(type) {
    setExporting(type);
    setExportError("");
    await Promise.resolve();
    const extension = type === "excel" ? "xlsx" : type;
    const fileName = `econocausal_allocations_${getLocalDateString()}.${extension}`;
    const exportOptions = {
      rows: sortedAllocations,
      summary,
      planSummary,
      costMens: result.costMens,
      costWomens: result.costWomens,
      valuePerConversion,
      drift,
    };
    try {
      if (type === "csv") downloadCsv(sortedAllocations, fileName);
      if (type === "excel") await downloadExcel(exportOptions, fileName);
      if (type === "pdf") await downloadPdf(exportOptions, fileName);
      onExported?.();
    } catch (error) {
      setExportError(`Could not create the ${type.toUpperCase()} file: ${error.message}`);
    } finally {
      setExporting("");
    }
  }

  const noRows = isExportDisabled(sortedAllocations);
  const pdfTooltip = sortedAllocations.length > 1000
    ? `PDF shows the first 1,000 of ${formatNumber(sortedAllocations.length)} rows. Use CSV or Excel for the full list.`
    : `Download PDF (${formatNumber(sortedAllocations.length)} rows)`;

  return (
    <section className="results-section" aria-live="polite">
      {showCompletionToast && (
        <div className="optimization-toast" role="status">
          Optimization complete
        </div>
      )}
      <div className="optimization-complete-slot">Optimization complete</div>
      <div className="section-heading results-heading">
        <div>
          <h2>Your campaign plan</h2>
        </div>
        <span className="result-count">{formatNumber(summary.n_customers)} customers analyzed</span>
      </div>

      <article className="plan-summary-card">
        <h3>Plan summary</h3>
        <ul>
          {planSummary.map((sentence) => <li key={sentence}>{sentence}</li>)}
        </ul>
      </article>

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
            <p>Search or filter customers. Best-arm uplift is the larger of the Mens and Womens estimates; estimated revenue uses the assigned arm, which may be different when e-mail costs differ.</p>
          </div>
          <div className="allocation-tools">
            <span className="table-count">{formatNumber(filteredAllocations.length)} customers</span>
            <label className="arm-filter filter-stage">
              <span>Filter column</span>
              <select
                value={filterColumn}
                onChange={(event) => {
                  setFilterColumn(event.target.value);
                  setFilterValue("");
                  setPage(1);
                }}
                aria-label="Choose a customer feature to filter"
              >
                <option value="">Choose a column</option>
                {ALLOCATION_FILTERS.map((filter) => (
                  <option key={filter.key} value={filter.key}>{filter.label}</option>
                ))}
              </select>
            </label>
            <label className="arm-filter filter-stage">
              <span>Feature value</span>
              <select
                value={filterValue}
                disabled={!filterColumn}
                onChange={(event) => {
                  setFilterValue(event.target.value);
                  setPage(1);
                }}
                aria-label="Choose a value for the selected customer feature"
              >
                <option value="">{filterColumn ? "All values" : "Choose a column first"}</option>
                {ALLOCATION_FILTERS.find((filter) => filter.key === filterColumn)?.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
            <div className="download-group" role="group" aria-label="Download filtered and sorted allocations">
              <span>Download</span>
              <button
                type="button"
                title={`Download CSV (${formatNumber(sortedAllocations.length)} rows)`}
                aria-label={`Download CSV (${formatNumber(sortedAllocations.length)} rows)`}
                disabled={noRows || Boolean(exporting)}
                onClick={() => handleExport("csv")}
              >
                {exporting === "csv" ? "Preparing…" : "CSV"}
              </button>
              <button
                type="button"
                title={`Download Excel (${formatNumber(sortedAllocations.length)} rows)`}
                aria-label={`Download Excel (${formatNumber(sortedAllocations.length)} rows)`}
                disabled={noRows || Boolean(exporting)}
                onClick={() => handleExport("excel")}
              >
                {exporting === "excel" ? "Preparing…" : "Excel"}
              </button>
              <button
                type="button"
                title={pdfTooltip}
                aria-label={pdfTooltip}
                disabled={noRows || Boolean(exporting)}
                onClick={() => handleExport("pdf")}
              >
                {exporting === "pdf" ? "Preparing…" : "PDF"}
              </button>
            </div>
          </div>
        </div>
        {exportError && <p className="export-error" role="alert">{exportError}</p>}

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
                        <span title={column.title}>
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
                        </span>
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
