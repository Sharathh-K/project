import { useEffect, useMemo, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { getEvaluationCurves } from "../api.js";
import { formatNumber } from "../format.js";

const Plot = createPlotlyComponent(Plotly);
const PLOT_CONFIG = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
};

function CurvePlot({ curve, metric, isDark }) {
  const isQini = metric === "qini";
  const data = curve[metric];
  const colors = isDark
    ? { panel: "#111827", text: "#cbd5e1", muted: "#94a3b8", grid: "#273449", line: "#4adeb3", band: "rgba(74, 222, 179, 0.16)" }
    : { panel: "#ffffff", text: "#687977", muted: "#74817f", grid: "#edf1ef", line: "#187967", band: "rgba(35, 128, 104, 0.15)" };
  const firstPoint = isQini ? 0 : 4;
  const x = data.x.slice(firstPoint).map((value) => value * 100);
  const lower = isQini
    ? data.random.slice(firstPoint).map((value, index) => value + data.gap_lower[firstPoint + index])
    : data.lower.slice(firstPoint);
  const upper = isQini
    ? data.random.slice(firstPoint).map((value, index) => value + data.gap_upper[firstPoint + index])
    : data.upper.slice(firstPoint);
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
      fillcolor: colors.band,
      hoverinfo: "skip",
      name: isQini ? "90% CI for advantage over random" : "90% uplift confidence band",
      type: "scatter",
    },
    {
      x,
      y: observed,
      mode: "lines",
      line: { color: colors.line, width: 2.5 },
      name: isQini ? "Model-ranked targeting" : "Observed uplift",
      hovertemplate: "%{x:.0f}% targeted<br>%{y:.2f}<extra></extra>",
      type: "scatter",
    },
    isQini
      ? {
          x,
          y: data.random.slice(firstPoint),
          mode: "lines",
          line: { color: colors.muted, width: 1.5, dash: "dash" },
          name: "Random targeting",
          hovertemplate: "%{x:.0f}% targeted<br>%{y:.2f}<extra></extra>",
          type: "scatter",
        }
      : {
          x: [x[0], x[x.length - 1]],
          y: [data.average, data.average],
          mode: "lines",
          line: { color: colors.muted, width: 1.5, dash: "dash" },
          name: "Average effect (everyone)",
          hovertemplate: "Average: %{y:.2f} pp<extra></extra>",
          type: "scatter",
        },
  ];

  const layout = {
    autosize: true,
    margin: { l: 57, r: 18, t: 12, b: 55 },
    paper_bgcolor: colors.panel,
    plot_bgcolor: colors.panel,
    font: { family: "Segoe UI, Arial, sans-serif", size: 10, color: colors.text },
    xaxis: {
      title: { text: "% of customers e-mailed", standoff: 12 },
      range: [isQini ? 0 : 5, 100],
      gridcolor: colors.grid,
      zeroline: false,
      ticksuffix: "%",
      showspikes: true,
      spikemode: "across",
      spikesnap: "cursor",
      spikecolor: colors.muted,
      spikethickness: 1,
    },
    yaxis: {
      title: { text: isQini ? "Extra conversions per 1,000" : "Observed uplift (pp)", standoff: 10 },
      gridcolor: colors.grid,
      zeroline: true,
      zerolinecolor: colors.grid,
      showspikes: true,
      spikemode: "across",
      spikesnap: "cursor",
      spikecolor: colors.muted,
      spikethickness: 1,
    },
    legend: {
      orientation: "h",
      x: 0,
      y: -0.26,
      font: { size: 9 },
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: isDark ? "#1e293b" : "#ffffff",
      bordercolor: isDark ? "#475569" : "#dce5e1",
      font: { color: isDark ? "#f8fafc" : "#203331", size: 10 },
    },
    dragmode: "pan",
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

function qiniTakeaway(curve) {
  const [lower, upper] = curve.qini.area_ci;
  if (lower > 0) return "Modest evidence ranking beats random targeting.";
  if (upper < 0) return "Evidence suggests ranking trails random targeting.";
  return "No clear evidence ranking beats random targeting.";
}

export default function EvaluationCurves({ active, isDark }) {
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
            The Qini band shows the pointwise 90% interval for advantage over random targeting; its verdict uses
            the 90% interval for total Qini area. Uplift bands show observed-uplift uncertainty.
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
              <p className="evaluation-takeaway">Takeaway: {qiniTakeaway(curve)}</p>
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
              <CurvePlot curve={curve} metric="qini" isDark={isDark} />
            </article>
            <article className="curve-card">
              <h4>Uplift curve</h4>
              <p>Observed conversion uplift among the highest-ranked customers.</p>
              <CurvePlot curve={curve} metric="uplift" isDark={isDark} />
            </article>
          </div>
        </section>
      ))}

      {evaluation && (
        <p className="evaluation-disclaimer">
          These curves describe ranking performance in the held-out experiment, not the outcome of a future campaign.
          The Qini shaded band compares ranked and random targeting point by point; the area interval summarizes that
          gap across the full curve. The uplift reference is the observed average arm effect.
        </p>
      )}
    </section>
  );
}
