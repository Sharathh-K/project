import { useEffect, useMemo, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { getEvaluationCurves } from "../api.js";
import { formatNumber } from "../format.js";

const Plot = createPlotlyComponent(Plotly);
const PLOT_CONFIG = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};

function CurvePlot({ curve, metric }) {
  const isQini = metric === "qini";
  const data = curve[metric];
  const firstPoint = isQini ? 0 : 4;
  const x = data.x.slice(firstPoint).map((value) => value * 100);
  const lower = data.lower.slice(firstPoint);
  const upper = data.upper.slice(firstPoint);
  const observed = data.y.slice(firstPoint);
  const traces = [
    {
      x,
      y: lower,
      mode: "lines",
      line: { width: 0 },
      hoverinfo: "skip",
      showlegend: false,
      type: "scatter",
    },
    {
      x,
      y: upper,
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: "rgba(35, 128, 104, 0.15)",
      hoverinfo: "skip",
      name: "90% confidence band",
      type: "scatter",
    },
    {
      x,
      y: observed,
      mode: "lines",
      line: { color: "#187967", width: 2.5 },
      name: isQini ? "Model-ranked targeting" : "Observed uplift",
      hovertemplate: "%{x:.0f}% targeted<br>%{y:.2f}<extra></extra>",
      type: "scatter",
    },
    isQini
      ? {
          x,
          y: data.random.slice(firstPoint),
          mode: "lines",
          line: { color: "#74817f", width: 1.5, dash: "dash" },
          name: "Random targeting",
          hovertemplate: "%{x:.0f}% targeted<br>%{y:.2f}<extra></extra>",
          type: "scatter",
        }
      : {
          x: [x[0], x[x.length - 1]],
          y: [data.average, data.average],
          mode: "lines",
          line: { color: "#74817f", width: 1.5, dash: "dash" },
          name: "Average effect (everyone)",
          hovertemplate: "Average: %{y:.2f} pp<extra></extra>",
          type: "scatter",
        },
  ];

  const layout = {
    autosize: true,
    margin: { l: 57, r: 18, t: 12, b: 55 },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    font: { family: "Segoe UI, Arial, sans-serif", size: 10, color: "#687977" },
    xaxis: {
      title: { text: "% of customers e-mailed", standoff: 12 },
      range: [isQini ? 0 : 5, 100],
      gridcolor: "#edf1ef",
      zeroline: false,
      ticksuffix: "%",
    },
    yaxis: {
      title: { text: isQini ? "Extra conversions per 1,000" : "Observed uplift (pp)", standoff: 10 },
      gridcolor: "#edf1ef",
      zeroline: true,
      zerolinecolor: "#dce5e1",
    },
    legend: {
      orientation: "h",
      x: 0,
      y: -0.26,
      font: { size: 9 },
    },
    hovermode: "x unified",
    showlegend: true,
  };

  return (
    <Plot
      data={traces}
      layout={layout}
      config={PLOT_CONFIG}
      useResizeHandler
      style={{ width: "100%", height: "310px" }}
    />
  );
}

export default function EvaluationCurves({ active }) {
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!active || evaluation) return;
    let cancelled = false;
    setLoading(true);
    getEvaluationCurves()
      .then((data) => {
        if (!cancelled) {
          setEvaluation(data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, evaluation, retryKey]);

  const curveCards = useMemo(() => evaluation?.curves ?? [], [evaluation]);

  function retry() {
    setError("");
    setRetryKey((current) => current + 1);
  }

  return (
    <section className="evaluation-page">
      <div className="evaluation-intro">
        <div>
          <p className="eyebrow">EXPERIMENTAL EVALUATION</p>
          <h2>Uplift and Qini curves</h2>
          <p>
            Ranked targeting is evaluated on the held-out randomized experiment using observed conversions.
            Shaded bands are 90% customer-bootstrap intervals; they are uncertainty estimates, not guarantees.
          </p>
        </div>
        {evaluation && (
          <span className="result-count">
            {formatNumber(evaluation.n_test_customers)} test customers · {evaluation.bootstrap_samples} bootstrap samples
          </span>
        )}
      </div>

      {loading && <div className="evaluation-message">Calculating evaluation curves from the held-out experiment…</div>}
      {error && (
        <div className="evaluation-error" role="alert">
          Could not load the evaluation curves: {error}{" "}
          <button type="button" className="retry-button" onClick={retry}>Retry</button>
        </div>
      )}

      {curveCards.map((curve) => (
        <section className="arm-evaluation" key={curve.arm}>
          <div className="arm-evaluation-heading">
            <div>
              <p className="eyebrow">{curve.arm.toUpperCase()} VS. {curve.control.toUpperCase()}</p>
              <h3>{curve.arm} evaluation</h3>
            </div>
            <div className="qini-summary">
              <span>Qini area</span>
              <strong>{curve.qini.area.toFixed(2)}</strong>
              <small>90% CI {curve.qini.area_ci[0].toFixed(2)}–{curve.qini.area_ci[1].toFixed(2)}</small>
            </div>
          </div>
          <div className="curve-grid">
            <article className="curve-card">
              <h4>Qini curve</h4>
              <p>Cumulative incremental conversions vs. random targeting.</p>
              <CurvePlot curve={curve} metric="qini" />
            </article>
            <article className="curve-card">
              <h4>Uplift curve</h4>
              <p>Observed conversion uplift among the highest-ranked customers.</p>
              <CurvePlot curve={curve} metric="uplift" />
            </article>
          </div>
        </section>
      ))}

      {evaluation && (
        <p className="evaluation-disclaimer">
          These curves describe ranking performance in the held-out experiment, not the outcome of a future campaign.
          Random targeting is the Qini reference line; the uplift reference is the observed average arm effect.
        </p>
      )}
    </section>
  );
}
