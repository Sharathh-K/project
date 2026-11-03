import { useMemo, useRef, useState } from "react";
import { optimizeCampaign } from "../api.js";
import Results from "../components/Results.jsx";
import { defaultBudgetForCustomerCount, formatCurrency, formatNumber } from "../format.js";
import { parseCustomerCsv } from "../csv.js";

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

export default function Planner({
  customers,
  setCustomers,
  settings,
  setSettings,
  budgetEditedRef,
  result,
  setResult,
  apiOnline,
  apiError,
  health,
  healthLoading,
  onRetry,
}) {
  const fileInput = useRef(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [runError, setRunError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [page, setPage] = useState(1);

  const settingsError = useMemo(() => {
    for (const [label, value] of [
      ["Budget", settings.budget],
      ["Mens e-mail cost", settings.costMens],
      ["Womens e-mail cost", settings.costWomens],
      ["Revenue per conversion", settings.valuePerConversion],
    ]) {
      if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0) {
        return `${label} must be greater than zero.`;
      }
    }
    return "";
  }, [settings]);

  const validCosts = Number(settings.costMens) > 0 && Number(settings.costWomens) > 0;
  const lowestEmailCost = Math.min(Number(settings.costMens), Number(settings.costWomens));
  const budgetCoversAll = customers.length > 0
    && validCosts
    && Number(settings.budget) >= customers.length * lowestEmailCost;

  function updateSetting(name, value) {
    if (name === "budget") budgetEditedRef.current = true;
    setSettings((current) => ({ ...current, [name]: value }));
  }

  async function loadFile(file) {
    setFileError("");
    setRunError("");
    setResult(null);
    setCustomers([]);
    setFileName("");
    setPage(1);
    if (!file) return;

    setIsParsing(true);
    try {
      const parsed = await parseCustomerCsv(file);
      setCustomers(parsed);
      setFileName(file.name);
      if (!budgetEditedRef.current) {
        setSettings((current) => ({
          ...current,
          budget: defaultBudgetForCustomerCount(parsed.length),
        }));
      }
    } catch (error) {
      setFileError(error.message);
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
    const payload = {
      customers,
      budget: Number(settings.budget),
      cost_mens: Number(settings.costMens),
      cost_womens: Number(settings.costWomens),
      value_per_conversion: Number(settings.valuePerConversion),
      include_all: true,
    };

    try {
      const data = await optimizeCampaign(payload);
      setResult({
        data,
        valuePerConversion: payload.value_per_conversion,
      });
      setPage(1);
    } catch (error) {
      setRunError(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      {!apiOnline && (
        <div className="api-alert" role="status">
          <strong>API connection required.</strong>{" "}
          {apiError || "Start the FastAPI server to run a campaign plan."}
          <span> The dashboard connects to http://127.0.0.1:8000 by default.</span>{" "}
          <button type="button" className="retry-button" onClick={onRetry} disabled={healthLoading}>
            {healthLoading ? "Checking…" : "Retry connection"}
          </button>
        </div>
      )}

      <section className="planner-layout">
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
                <p className="section-copy">Set your budget, e-mail costs, and estimated revenue per conversion.</p>
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
                hint={customers.length
                  ? `Suggested from upload: ${formatCurrency(Number(defaultBudgetForCustomerCount(customers.length)))} ($0.025 per customer). Your edits are kept on future uploads.`
                  : "Maximum total spend across both e-mail types."}
              />
              {budgetCoversAll && (
                <p className="budget-context-hint" role="status">
                  Your budget can cover one e-mail to every customer at the lower unit cost ({formatCurrency(lowestEmailCost)} each).
                </p>
              )}
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
              <Field
                id="value-per-conversion"
                label="Revenue per conversion"
                value={settings.valuePerConversion}
                onChange={(value) => updateSetting("valuePerConversion", value)}
                min="0.01"
                step="0.01"
                hint="Default assumption: $113.83"
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
                <button type="button" className="retry-button aside-retry" onClick={onRetry} disabled={healthLoading}>
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
    </>
  );
}
