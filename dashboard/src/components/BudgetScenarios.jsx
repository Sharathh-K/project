import { useEffect, useMemo, useRef, useState } from "react";
import { getBudgetScenarios } from "../api.js";
import { formatCurrency, formatNumber } from "../format.js";

function scenarioBudgets(baseBudget) {
  return [0, 0.5, 1, 1.5, 2].map((multiple) => baseBudget * multiple);
}

function makeChartPoints(scenarios) {
  const maxBudget = Math.max(...scenarios.map((scenario) => scenario.budget), 1);
  const maxRevenue = Math.max(...scenarios.map((scenario) => scenario.total_expected_revenue), 1);
  return scenarios.map((scenario, index) => ({
    ...scenario,
    x: 48 + (scenario.budget / maxBudget) * 504,
    y: 170 - (scenario.total_expected_revenue / maxRevenue) * 140,
    index,
  }));
}

function RevenueCurve({ scenarios }) {
  const points = makeChartPoints(scenarios);
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <figure className="scenario-curve">
      <svg viewBox="0 0 600 210" role="img" aria-labelledby="scenario-chart-title scenario-chart-description" preserveAspectRatio="none">
        <title id="scenario-chart-title">Estimated revenue by budget scenario</title>
        <desc id="scenario-chart-description">
          A line chart of budget limits and their model-estimated extra revenue. Exact values are listed below the chart.
        </desc>
        <line x1="48" y1="170" x2="564" y2="170" className="scenario-axis" />
        <line x1="48" y1="30" x2="48" y2="170" className="scenario-axis" />
        <polyline points={line} className="scenario-curve-line" />
        {points.map((point) => (
          <circle key={point.index} cx={point.x} cy={point.y} r="5" className="scenario-curve-point">
            <title>{`${formatCurrency(point.budget)} budget: ${formatCurrency(point.total_expected_revenue)} estimated extra revenue`}</title>
          </circle>
        ))}
        <text x="48" y="195" className="scenario-axis-label">Budget limit →</text>
        <text x="12" y="25" className="scenario-axis-label">↑ Revenue</text>
      </svg>
      <figcaption>Budget limit compared with estimated incremental revenue; planned spend can be below the limit.</figcaption>
    </figure>
  );
}

function plateauMessage(scenarios) {
  for (let index = 1; index < scenarios.length; index += 1) {
    const previous = scenarios[index - 1];
    const current = scenarios[index];
    const revenueChange = current.total_expected_revenue - previous.total_expected_revenue;
    if (revenueChange <= 0.01) {
      return `Between ${formatCurrency(previous.budget)} and ${formatCurrency(current.budget)}, the model estimates only ${formatCurrency(Math.max(0, revenueChange))} in additional revenue. This is a near-flat step in the tested scenarios, not a guarantee about future campaigns.`;
    }
  }
  return "No near-flat step was detected in the tested budgets. Compare the marginal estimates below; these are model estimates, not guarantees.";
}

export default function BudgetScenarios({ customers, settings, result, apiOnline }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const baseBudget = Number(settings.budget) > 0
    ? Number(settings.budget)
    : Number(result?.data?.summary?.budget) || 1;
  const budgets = useMemo(() => scenarioBudgets(baseBudget), [baseBudget]);

  useEffect(() => {
    requestRef.current += 1;
    setReport(null);
    setError("");
    setLoading(false);
  }, [
    customers,
    settings.budget,
    settings.costMens,
    settings.costWomens,
    settings.valuePerConversion,
  ]);

  async function runScenarios() {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setError("");
    setReport(null);
    setLoading(true);
    try {
      const response = await getBudgetScenarios({
        customers,
        budgets,
        cost_mens: Number(settings.costMens),
        cost_womens: Number(settings.costWomens),
        value_per_conversion: Number(settings.valuePerConversion),
      });
      if (requestId === requestRef.current) setReport(response);
    } catch (requestError) {
      if (requestId === requestRef.current) setError(requestError.message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }

  const scenarios = report?.scenarios ?? [];
  const featuredScenarios = scenarios.length
    ? [scenarios[1], scenarios[2], scenarios[4]].filter(Boolean)
    : [];
  const labels = ["Lower budget", "Current budget", "Higher budget"];

  return (
    <section className="workspace-card" aria-labelledby="budget-scenarios-heading">
      <div className="workspace-card-heading">
        <div>
          <p className="eyebrow">BUDGET PLANNING</p>
          <h2 id="budget-scenarios-heading">Budget scenarios</h2>
          <p>Compare estimated spend and extra revenue while reusing one customer-scoring pass.</p>
        </div>
        <button type="button" className="button button-primary" onClick={runScenarios} disabled={!apiOnline || !customers.length || loading}>
          {loading ? "Comparing…" : "Compare budgets"}
          {!loading && <span aria-hidden="true">→</span>}
        </button>
      </div>

      {!customers.length && <p className="workspace-muted">Upload a valid customer CSV in Campaign planner to compare budget scenarios.</p>}
      {!apiOnline && customers.length > 0 && <p className="workspace-muted" role="status">Connect to the API to compare scenarios.</p>}
      {error && <p className="form-error" role="alert">Could not compare budget scenarios: {error}</p>}

      {scenarios.length > 0 && (
        <div className="scenario-results" aria-live="polite">
          <RevenueCurve scenarios={scenarios} />
          <div className="scenario-card-grid">
            {featuredScenarios.map((scenario, index) => (
              <article className="scenario-card" key={scenario.budget}>
                <span>{labels[index]}</span>
                <strong>{formatCurrency(scenario.total_expected_revenue)}</strong>
                <small>Estimated extra revenue</small>
                <dl>
                  <div><dt>Budget limit</dt><dd>{formatCurrency(scenario.budget)}</dd></div>
                  <div><dt>Planned spend</dt><dd>{formatCurrency(scenario.total_cost)}</dd></div>
                  <div><dt>Selected customers</dt><dd>{formatNumber(scenario.selected_customers)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <p className="scenario-saturation" role="note">{plateauMessage(scenarios)}</p>
          <details className="scenario-details">
            <summary>View all tested budgets and marginal estimates</summary>
            <div className="quality-table-wrap">
              <table className="quality-table">
                <thead>
                  <tr>
                    <th scope="col">Budget limit</th>
                    <th scope="col">Planned spend</th>
                    <th scope="col">Estimated extra revenue</th>
                    <th scope="col">Mens / Womens e-mails</th>
                    <th scope="col">Marginal est. revenue per extra budget dollar</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((scenario) => (
                    <tr key={scenario.budget}>
                      <td>{formatCurrency(scenario.budget)}</td>
                      <td>{formatCurrency(scenario.total_cost)}</td>
                      <td>{formatCurrency(scenario.total_expected_revenue)}</td>
                      <td>{formatNumber(scenario.mens_emails)} / {formatNumber(scenario.womens_emails)}</td>
                      <td>{scenario.marginal_revenue_per_budget_dollar == null
                        ? "—"
                        : `${scenario.marginal_revenue_per_budget_dollar.toFixed(2)}×`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="workspace-caveat">Revenue is a model estimate using the current per-email costs and revenue-per-conversion assumption. It is not a guarantee of campaign results.</p>
        </div>
      )}
    </section>
  );
}
