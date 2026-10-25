import { useEffect, useMemo, useState } from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

const Plot = createPlotlyComponent(Plotly);

// Raw file from your Anushka branch (repo is public).
const DATA_URL =
  "https://raw.githubusercontent.com/Sharathh-K/project/Anushka/EconoCausal/results/ite_results_visit.csv";

const TEAL = "#0f9d8a";
const GREY = "#94a3b8";
const ARMS = ["Mens E-Mail", "Womens E-Mail"];

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const idx = Object.fromEntries(head.split(",").map((c, i) => [c, i]));
  return lines.map((line) => {
    const p = line.split(",");
    return {
      arm: p[idx.arm],
      split: p[idx.split],
      treatment: Number(p[idx.treatment]),
      y: Number(p[idx.visit]),
      ite: Number(p[idx.ite_pred]),
    };
  });
}

// Qini curve: customers sorted by predicted ITE (highest first).
// Q(k) = visits_treated(k) - visits_control(k) * n_treated(k) / n_control(k)
function qiniCurve(rows, points = 60) {
  const s = [...rows].sort((a, b) => b.ite - a.ite);
  const n = s.length;
  const step = Math.max(1, Math.floor(n / points));
  let nt = 0, nc = 0, yt = 0, yc = 0;
  const xs = [0];
  const ys = [0];
  s.forEach((r, i) => {
    if (r.treatment === 1) { nt += 1; yt += r.y; } else { nc += 1; yc += r.y; }
    if ((i + 1) % step === 0 || i === n - 1) {
      xs.push(((i + 1) / n) * 100);
      ys.push(nc > 0 ? yt - (yc * nt) / nc : 0);
    }
  });
  return { xs, ys };
}

// Area between the model curve and the random-targeting line (x as 0..1).
function areaOverRandom(xs, ys) {
  const end = ys[ys.length - 1];
  let area = 0;
  for (let i = 1; i < xs.length; i++) {
    const w = (xs[i] - xs[i - 1]) / 100;
    const m0 = ys[i - 1] - end * (xs[i - 1] / 100);
    const m1 = ys[i] - end * (xs[i] / 100);
    area += (w * (m0 + m1)) / 2;
  }
  return area;
}

// Actual uplift (percentage points) in each predicted-ITE decile.
function decileUplift(rows) {
  const s = [...rows].sort((a, b) => b.ite - a.ite);
  const size = s.length / 10;
  return Array.from({ length: 10 }, (_, d) => {
    const g = s.slice(Math.round(d * size), Math.round((d + 1) * size));
    const t = g.filter((r) => r.treatment === 1);
    const c = g.filter((r) => r.treatment === 0);
    const mean = (a) => (a.length ? a.reduce((x, r) => x + r.y, 0) / a.length : 0);
    return { decile: d + 1, uplift: (mean(t) - mean(c)) * 100 };
  });
}

export default function UpliftCharts() {
  const [rows, setRows] = useState([]);
  const [arm, setArm] = useState(ARMS[0]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then((t) => {
        setRows(parseCsv(t));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const test = useMemo(
    () => rows.filter((r) => r.arm === arm && r.split === "test"),
    [rows, arm]
  );
  const qini = useMemo(() => (test.length ? qiniCurve(test) : null), [test]);
  const deciles = useMemo(() => (test.length ? decileUplift(test) : []), [test]);

  if (status === "loading") return <p>Loading ITE results...</p>;
  if (status === "error")
    return <p>Could not load the ITE file. Check the DATA_URL path and branch.</p>;
  if (!qini) return <p>No test rows found for this e-mail type.</p>;

  const end = qini.ys[qini.ys.length - 1];
  const layout = {
    margin: { t: 40, r: 20, b: 50, l: 60 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: { orientation: "h", y: -0.25 },
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label>
          E-mail type:{" "}
          <select value={arm} onChange={(e) => setArm(e.target.value)}>
            {ARMS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <span style={{ marginLeft: 16 }}>
          Test customers: {test.length.toLocaleString()} | Area over random:{" "}
          {areaOverRandom(qini.xs, qini.ys).toFixed(1)}
        </span>
      </div>

      <Plot
        data={[
          { x: qini.xs, y: qini.ys, type: "scatter", mode: "lines", name: "Causal model (DML)", line: { color: TEAL, width: 3 } },
          { x: [0, 100], y: [0, end], type: "scatter", mode: "lines", name: "Random targeting", line: { color: GREY, dash: "dash" } },
        ]}
        layout={{
          ...layout,
          title: "Qini curve: model vs random rollout",
          xaxis: { title: "% of customers targeted (highest predicted ITE first)" },
          yaxis: { title: "Extra visits vs control (Qini)" },
        }}
        style={{ width: "100%", height: 380 }}
        useResizeHandler
      />

      <Plot
        data={[
          { x: deciles.map((d) => d.decile), y: deciles.map((d) => d.uplift), type: "bar", marker: { color: TEAL }, name: "Actual uplift" },
        ]}
        layout={{
          ...layout,
          title: "Actual uplift by predicted-ITE decile (1 = highest)",
          xaxis: { title: "Decile", dtick: 1 },
          yaxis: { title: "Visit uplift (percentage points)" },
        }}
        style={{ width: "100%", height: 340 }}
        useResizeHandler
      />
    </div>
  );
}
