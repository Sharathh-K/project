import { useEffect, useMemo, useRef, useState } from "react";
import { getHealth, optimizeCampaign } from "./api.js";
import { parseCustomerCsv } from "./csv.js";

const INITIAL_SETTINGS = {
  budget: "1600",
  costMens: "0.10",
  costWomens: "0.15",
};
const PAGE_SIZE = 25;

function currency(value, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value ?? 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatUplift(value) {
  return `${((value ?? 0) * 100).toFixed(2)} pp`;
}

function StatusBadge({ online }) {
  return (
    <span className={`api-badge ${online ? "is-online" : "is-offline"}`}>
      <span className="status-dot" />
      {online ? "API connected" : "API unavailable"}
    </span>
  );
}

function Field({ id, label, value, onChange, min, step, hint }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="money-input">
        <span aria-hidden="true">$</span>
        <input
          id={id}
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
      </span>
      <span className="field-hint">{hint}</span>
    </label>
  );
}

function Results({ result, page, setPage }) {
  const allocations = result.allocations;
  const [selectedArm, setSelectedArm] = useState("All arms");
  const filteredAllocations = selectedArm === "All arms"
    ? allocations
    : allocations.filter((row) => row.assigned_arm === selectedArm);
  const pageCount = Math.max(1, Math.ceil(filteredAllocations.length / PAGE_SIZE));
  const visibleRows = filteredAllocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = result.summary;
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
          <strong>{currency(summary.total_cost)}</strong>
          <span>of {currency(summary.budget)} budget</span>
        </article>
        <article className="result-card">
          <span className="result-label">Estimated extra revenue</span>
          <strong>{currency(summary.total_expected_revenue)}</strong>
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
          <strong>{currency(Math.abs(costDifference))}</strong>
          <span>Compared with e-mailing everyone</span>
        </article>
      </div>

      <div className="allocation-card">
        <div className="allocation-header">
          <div>
            <h3>Recommended allocations</h3>
            <p>Each customer’s assigned arm, including customers with no e-mail.</p>
          </div>
          <div className="allocation-tools">
            <span className="table-count">{formatNumber(filteredAllocations.length)} customers</span>
            <label className="arm-filter">
              <span>Filter arm</span>
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
                      <td>{formatUplift(row.expected_uplift)}</td>
                      <td>{currency(row.expected_revenue)}</td>
                      <td>{currency(row.cost)}</td>
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
        the API default of $113.83. Predicted revenue is an estimate; this plan is not evidence that uplift targeting
        outperforms random targeting.
      </p>
    </section>
  );
}

export default function App() {
  const fileInput = useRef(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [apiError, setApiError] = useState("");
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [fileError, setFileError] = useState("");
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [page, setPage] = useState(1);

  async function refreshApi() {
    setHealthLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
      setApiOnline(true);
      setApiError("");
    } catch (error) {
      setApiOnline(false);
      setApiError(error.message);
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    refreshApi();
  }, []);

  const settingsError = useMemo(() => {
    for (const [label, value] of [
      ["Budget", settings.budget],
      ["Mens e-mail cost", settings.costMens],
      ["Womens e-mail cost", settings.costWomens],
    ]) {
      if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0) {
        return `${label} must be greater than zero.`;
      }
    }
    return "";
  }, [settings]);

  function updateSetting(name, value) {
    setSettings((current) => ({ ...current, [name]: value }));
  }

  async function loadFile(file) {
    setFileError("");
    setRunError("");
    setResult(null);
    setCustomers([]);
    setFileName(file?.name ?? "");
    setPage(1);
    if (!file) return;

    setIsParsing(true);
    try {
      const parsed = await parseCustomerCsv(file);
      setCustomers(parsed);
    } catch (error) {
      setFileError(error.message);
      setFileName("");
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) loadFile(file);
  }

  async function handleRun(event) {
    event.preventDefault();
    if (!customers.length || settingsError || !apiOnline || isRunning) return;

    setRunError("");
    setResult(null);
    setIsRunning(true);
    try {
      const data = await optimizeCampaign({
        customers,
        budget: Number(settings.budget),
        cost_mens: Number(settings.costMens),
        cost_womens: Number(settings.costWomens),
        include_all: true,
      });
      setResult(data);
      setPage(1);
    } catch (error) {
      setRunError(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="EconoCausal home">
          <span className="brand-mark">E</span>
          <span className="brand-name">Econo<span>Causal</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link" href="#overview"><span className="nav-icon">⌂</span>Overview</a>
          <a className="nav-link nav-link-active" href="#overview"><span className="nav-icon">◫</span>Campaign planner</a>
          <a className="nav-link" href="#methodology"><span className="nav-icon">◉</span>Methodology</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">i</span>
            <p>Recommendations are estimates from an experimental campaign model.</p>
          </div>
          <StatusBadge online={apiOnline} />
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar" id="overview">
          <div className="breadcrumb">Workspace <span>/</span> Campaign planner</div>
          <div className="topbar-right">
            <span className="environment-label">Hillstrom experiment</span>
            <StatusBadge online={apiOnline} />
          </div>
        </header>

        <div className="page-content">
          <section className="page-intro">
            <div>
              <p className="eyebrow">CAMPAIGN WORKSPACE</p>
              <h1>Make every campaign dollar count.</h1>
              <p className="intro-copy">
                Upload your customer data, set your budget, and build an e-mail plan from estimated incremental impact.
              </p>
            </div>
            <div className="intro-stat">
              <span className="stat-icon">↗</span>
              <div>
                <span className="stat-label">Optimization objective</span>
                <strong>Maximize expected revenue</strong>
              </div>
            </div>
          </section>

          {!apiOnline && (
            <div className="api-alert" role="status">
              <strong>API connection required.</strong>{" "}
              {apiError || "Start the FastAPI server to run a campaign plan."}
              <span> The dashboard connects to http://127.0.0.1:8000 by default.</span>{" "}
              <button type="button" className="retry-button" onClick={refreshApi} disabled={healthLoading}>
                {healthLoading ? "Checking…" : "Retry connection"}
              </button>
            </div>
          )}

          <section className="planner-layout" id="planner">
            <div className="planner-main">
              <form className="planner-card" onSubmit={handleRun}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">STEP 1</p>
                    <h2>Upload customer data</h2>
                    <p className="section-copy">CSV files are parsed in your browser before being sent to the API.</p>
                  </div>
                  <span className="step-number">01</span>
                </div>

                <button
                  type="button"
                  className={`upload-zone ${customers.length ? "upload-complete" : ""}`}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    if (file) loadFile(file);
                  }}
                  aria-describedby="upload-help"
                >
                  <span className="upload-icon">{customers.length ? "✓" : "↑"}</span>
                  <span className="upload-title">
                    {isParsing ? "Reading your file…" : customers.length ? fileName : "Choose a CSV file or drag it here"}
                  </span>
                  <span id="upload-help" className="upload-help">
                    {customers.length
                      ? `${formatNumber(customers.length)} validated customer rows`
                      : "CSV format · Up to 100,000 customers"}
                  </span>
                  <span className="browse-button">{customers.length ? "Replace file" : "Browse files"}</span>
                </button>
                <input
                  ref={fileInput}
                  className="visually-hidden"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  aria-label="Choose a customer CSV file"
                />
                {fileError && <p className="form-error" role="alert">{fileError}</p>}

                <div className="schema-hint">
                  <strong>Required columns</strong>
                  <span>recency, history, mens, womens, newbie, zip_code, channel</span>
                  <small>Optional: Customer ID (or customer_id), history_floor. Other columns are ignored.</small>
                </div>

                <div className="form-divider" />
                <div className="section-heading budget-heading">
                  <div>
                    <p className="eyebrow">STEP 2</p>
                    <h2>Set your campaign assumptions</h2>
                    <p className="section-copy">Set your budget and per-e-mail costs. Revenue per conversion uses the API default.</p>
                  </div>
                  <span className="step-number">02</span>
                </div>

                <div className="budget-field">
                  <Field
                    id="budget"
                    label="Total campaign budget"
                    value={settings.budget}
                    onChange={(value) => updateSetting("budget", value)}
                    min="0.01"
                    step="0.01"
                    hint="Maximum total spend across both e-mail types."
                  />
                </div>
                <div className="cost-grid">
                  <Field
                    id="cost-mens"
                    label="Cost per Mens e-mail"
                    value={settings.costMens}
                    onChange={(value) => updateSetting("costMens", value)}
                    min="0.01"
                    step="0.01"
                    hint="Default assumption: $0.10"
                  />
                  <Field
                    id="cost-womens"
                    label="Cost per Womens e-mail"
                    value={settings.costWomens}
                    onChange={(value) => updateSetting("costWomens", value)}
                    min="0.01"
                    step="0.01"
                    hint="Default assumption: $0.15"
                  />
                </div>

                {settingsError && <p className="form-error" role="alert">{settingsError}</p>}
                {runError && <p className="form-error" role="alert">Could not run optimization: {runError}</p>}

                <div className="form-footer">
                  <p>Your data is sent to the configured EconoCausal API for scoring and optimization.</p>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={!customers.length || Boolean(settingsError) || !apiOnline || isRunning || isParsing}
                  >
                    {isRunning ? "Optimizing…" : "Run optimization"}
                    {!isRunning && <span aria-hidden="true">→</span>}
                  </button>
                </div>
              </form>

              {result && <Results result={result} page={page} setPage={setPage} />}
            </div>

            <aside className="planner-aside">
              <section className="aside-card connection-card">
                <div className="aside-card-heading">
                  <span className={`connection-icon ${apiOnline ? "connection-ok" : "connection-down"}`}>
                    {apiOnline ? "✓" : "!"}
                  </span>
                  <div>
                    <h3>API connection</h3>
                    <span className={`connection-text ${apiOnline ? "text-ok" : "text-down"}`}>
                      {apiOnline ? "Connected and ready" : "Waiting for API"}
                    </span>
                  </div>
                </div>
                {health && (
                  <div className="health-details">
                    <span>Model <strong>{health.model}</strong></span>
                    <span>Supported arms <strong>{health.arms?.join(", ")}</strong></span>
                  </div>
                )}
                {!apiOnline && (
                  <>
                    <p className="aside-copy">Start the API with <code>uvicorn api.main:app --reload</code> from the project folder.</p>
                    <button type="button" className="retry-button aside-retry" onClick={refreshApi} disabled={healthLoading}>
                      {healthLoading ? "Checking…" : "Retry connection"}
                    </button>
                  </>
                )}
              </section>

              <section className="aside-card">
                <p className="eyebrow">HOW IT WORKS</p>
                <h3>From customer data to a plan</h3>
                <ol className="steps-list">
                  <li><span>1</span><p><strong>Upload</strong> customer features from a CSV.</p></li>
                  <li><span>2</span><p><strong>Set assumptions</strong> for your budget and unit economics.</p></li>
                  <li><span>3</span><p><strong>Optimize</strong> e-mail assignments within the budget.</p></li>
                </ol>
              </section>

              <section className="assumption-note">
                <span aria-hidden="true">◇</span>
                <p><strong>Keep the evidence in context.</strong> Predicted uplift and revenue are model estimates. E-mail costs and revenue per conversion are assumptions.</p>
              </section>
            </aside>
          </section>

          <section className="methodology-strip" id="methodology">
            <span className="method-icon">↗</span>
            <div>
              <h3>What the optimizer does</h3>
              <p>
                The API estimates each customer’s incremental response to Mens and Womens e-mail, then assigns at most one e-mail per customer
                to maximize estimated extra revenue while keeping total cost within your budget.
                {health?.drift_reference ? " A drift reference is available on the API." : ""}
              </p>
            </div>
            <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">API documentation <span aria-hidden="true">↗</span></a>
          </section>
          <footer className="page-footer">EconoCausal <span>·</span> Decision support from causal estimates, not a guarantee of individual outcomes.</footer>
        </div>
      </main>
    </div>
  );
}
