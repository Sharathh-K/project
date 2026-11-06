import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { formatCurrency } from "../format.js";

const Plot = createPlotlyComponent(Plotly);

const PLOT_CONFIG = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
};

function marginalLabel(value) {
  return value == null ? "—" : `${value.toFixed(2)}×`;
}

export default function BudgetScenarioPlot({ scenarios, isDark }) {
  const colors = isDark
    ? { panel: "#111827", text: "#cbd5e1", muted: "#94a3b8", grid: "#273449", line: "#4adeb3", point: "#6ee7c0" }
    : { panel: "#ffffff", text: "#687977", muted: "#7c8986", grid: "#edf1ef", line: "#187967", point: "#167968" };
  const trace = {
    x: scenarios.map((scenario) => scenario.budget),
    y: scenarios.map((scenario) => scenario.total_expected_revenue),
    customdata: scenarios.map((scenario) => [
      scenario.total_cost,
      scenario.selected_customers,
      scenario.mens_emails,
      scenario.womens_emails,
      marginalLabel(scenario.marginal_revenue_per_budget_dollar),
    ]),
    type: "scatter",
    mode: "lines+markers",
    name: "Budget scenario",
    fill: "tozeroy",
    fillcolor: isDark ? "rgba(74, 222, 179, 0.09)" : "rgba(22, 121, 104, 0.08)",
    line: { color: colors.line, width: 3, shape: "spline", smoothing: 0.6 },
    marker: {
      color: colors.point,
      size: 11,
      line: { color: colors.panel, width: 2.5 },
    },
    hovertemplate: [
      "<b>Budget:</b> $%{x:,.2f}",
      "<b>Est. extra revenue:</b> $%{y:,.2f}",
      "<b>Planned spend:</b> $%{customdata[0]:,.2f}",
      "<b>Customers selected:</b> %{customdata[1]:,.0f}",
      "<b>Mens / Womens:</b> %{customdata[2]:,.0f} / %{customdata[3]:,.0f}",
      "<b>Marginal return:</b> %{customdata[4]}",
      "<extra></extra>",
    ].join("<br>"),
  };
  const layout = {
    autosize: true,
    margin: { l: 75, r: 25, t: 16, b: 65 },
    paper_bgcolor: colors.panel,
    plot_bgcolor: colors.panel,
    font: { family: "Segoe UI, Arial, sans-serif", size: 11, color: colors.text },
    xaxis: {
      title: { text: "Budget limit ($)", standoff: 12 },
      gridcolor: colors.grid,
      zeroline: false,
      tickprefix: "$",
      tickformat: ",.0f",
      automargin: true,
      showspikes: true,
      spikemode: "across",
      spikesnap: "cursor",
      spikecolor: colors.muted,
      spikethickness: 1,
    },
    yaxis: {
      title: { text: "Estimated extra revenue ($)", standoff: 10 },
      gridcolor: colors.grid,
      zeroline: true,
      zerolinecolor: colors.grid,
      tickprefix: "$",
      tickformat: ",.0f",
      rangemode: "tozero",
      automargin: true,
      showspikes: true,
      spikemode: "across",
      spikesnap: "cursor",
      spikecolor: colors.muted,
      spikethickness: 1,
    },
    hovermode: "x",
    hoverlabel: {
      bgcolor: isDark ? "#1e293b" : "#ffffff",
      bordercolor: isDark ? "#475569" : "#dce5e1",
      font: { color: isDark ? "#f8fafc" : "#203331", size: 11 },
      align: "left",
    },
    dragmode: "pan",
    showlegend: false,
  };

  return (
    <figure className="scenario-curve">
      <Plot
        data={[trace]}
        layout={layout}
        config={PLOT_CONFIG}
        revision={isDark ? 1 : 0}
        useResizeHandler
        style={{ width: "100%", height: "340px" }}
      />
      <figcaption>
        Hover over a point for its budget, estimated revenue, spend, and customer count. For example, the zero-budget point is {formatCurrency(0)} budget and {formatCurrency(0)} estimated extra revenue.
      </figcaption>
    </figure>
  );
}
