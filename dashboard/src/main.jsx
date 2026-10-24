import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Plotly from "plotly.js-dist-min";
import Papa from "papaparse";
import {
  validateRows,
  filterScores,
  calculateCurve,
  budgetCapacity,
  outcomes,
} from "./analysis.mjs";
import "./style.css";

const format = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const initialFilters = {
  split: "test",
  channel: "All",
  recency: 12,
  minimum: "",
  search: "",
  arm: "womens",
  outcome: "visit",
};
const chartLayout = {
  paper_bgcolor: "#fff",
  plot_bgcolor: "#fff",
  font: { family: "Arial", color: "#294944" },
  margin: { t: 30, l: 65, r: 20, b: 65 },
  legend: { orientation: "h", y: 1.18 },
};
function Chart({ data, layout = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    Plotly.react(
      ref.current,
      data,
      { ...chartLayout, ...layout, autosize: true },
      { responsive: true, displayModeBar: true },
    );
  }, [data, layout]);
  useEffect(() => {
    const node = ref.current;
    return () => { if (node) Plotly.purge(node); };
  }, []);
  return <div className="plot" ref={ref} />;
}
function Metric({ label, value, note }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: "greedy",
  });
  if (result.errors.length)
    throw Error("CSV parsing error: " + result.errors[0].message);
  return result.data;
}

function App() {
  const [report, setReport] = useState(null),
    [bundled, setBundled] = useState([]),
    [scores, setScores] = useState([]);
  const [tab, setTab] = useState("Start & data"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("Loading saved analysis…");
  const [filters, setFilters] = useState(initialFilters),
    [historical, setHistorical] = useState(null),
    [source, setSource] = useState("Bundled Hillstrom scores");
  const [budget, setBudget] = useState("5000"),
    [cost, setCost] = useState("0.10"),
    [page, setPage] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/results/report.json").then((r) => {
        if (!r.ok)
          throw Error(
            "Saved report is missing. Run the numbered Python steps.",
          );
        return r.json();
      }),
      fetch("/results/customer_scores.csv").then((r) => {
        if (!r.ok) throw Error("Saved scores are missing.");
        return r.text();
      }),
    ])
      .then(([r, text]) => {
        const rows = validateRows(parseCSV(text), "scores");
        if (active) {
          setReport(r);
          setBundled(rows);
          setScores(rows);
          setNotice(`Loaded ${format(rows.length)} customer scores.`);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => filterScores(scores, filters),
    [scores, filters],
  );
  const key = `${filters.outcome}_${filters.arm}`;
  const scale = filters.outcome === "spend" ? 1 : 100;
  const unit =
    filters.outcome === "spend" ? "$ per customer" : "percentage points";
  const ranked = useMemo(
    () => [...filtered].sort((a, b) => b[key] - a[key]),
    [filtered, key],
  );
  const average = filtered.length
    ? filtered.reduce((sum, r) => sum + r[key], 0) / filtered.length
    : null;
  const exploratory = useMemo(
    () =>
      source === "Bundled Hillstrom scores" && filters.split === "test"
        ? calculateCurve(filtered, filters.outcome, filters.arm)
        : null,
    [filtered, filters, source],
  );
  const capacity = budgetCapacity(
    budget === "" ? NaN : Number(budget),
    cost === "" ? NaN : Number(cost),
    filtered.length,
  );
  const channels = useMemo(
    () => ["All", ...new Set(scores.map((r) => r.channel))],
    [scores],
  );
  function change(name, value) {
    setFilters((f) => ({
      ...f,
      [name]: value,
      ...(name === "outcome" ? { minimum: "" } : {}),
    }));
    setPage(0);
  }
  function reset() {
    setScores(bundled);
    setSource("Bundled Hillstrom scores");
    setFilters(initialFilters);
    setPage(0);
    setError("");
    setNotice("Bundled scores restored.");
  }
  async function upload(event, kind) {
    const file = event.target.files[0];
    if (!file) return;
    setError("");
    try {
      if (file.size > 25_000_000) throw Error("Use a CSV smaller than 25 MB.");
      const rows = validateRows(parseCSV(await file.text()), kind);
      if (kind === "historical") {
        setHistorical({ name: file.name, rows });
        setNotice(
          `Historical preview: ${format(rows.length)} rows. Model scores and saved evaluation remain unchanged.`,
        );
      } else {
        setScores(rows);
        setSource(file.name);
        setFilters({ ...initialFilters, split: "all" });
        setPage(0);
        setTab("Customer scores");
        setNotice(
          `Loaded ${format(rows.length)} uploaded scores. Historical evaluation still refers to the bundled experiment.`,
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      event.target.value = "";
    }
  }
  function download() {
    const text = Papa.unparse(ranked, { escapeFormulae: true });
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_customer_scores.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const historicalGroups = historical
    ? ["No E-Mail", "Mens E-Mail", "Womens E-Mail"].map((segment) => {
        const rows = historical.rows.filter((r) => r.segment === segment);
        return {
          segment,
          n: rows.length,
          visit: rows.length
            ? rows.reduce((s, r) => s + r.visit, 0) / rows.length
            : null,
        };
      })
    : null;
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span>E</span>EconoCausal
        </div>
        <p className="caption">WEEKS 1–2 · MID-PROJECT</p>
        <nav>
          {[
            "Start & data",
            "Causal graph",
            "Customer scores",
            "Uplift evidence",
            "Causal audit",
            "How to use",
          ].map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </nav>
        <p className="aside-note">
          A guided email experiment
          <br />
          Learn → estimate → check
        </p>
      </aside>
      <main>
        <header>
          <div className="eyebrow">CAUSAL MACHINE LEARNING</div>
          <h1>
            {tab === "Start & data" ? "Learn what the email changes." : tab}
          </h1>
          <p>
            Men’s email or women’s email, compared with no email. Effects are
            estimates for similar customers.
          </p>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <p className="status" role="status">
          {notice} Saved model evidence always describes the bundled Hillstrom experiment.
        </p>
        {!report ? (
          <section className="card">Loading the saved project…</section>
        ) : (
          <>
            {tab === "Start & data" && (
              <>
                <div className="metrics">
                  <Metric
                    label="Historical customers"
                    value={format(report.eda.rows)}
                    note="Three randomized email groups"
                  />
                  <Metric
                    label="Missing values"
                    value={Object.values(report.eda.missing_values).reduce(
                      (a, b) => a + b,
                      0,
                    )}
                    note="Required source columns checked"
                  />
                  <Metric
                    label="Purchase rate"
                    value={(report.eda.purchase_rate * 100).toFixed(2) + "%"}
                    note={`${report.eda.purchases} purchases; use visits as primary outcome`}
                  />
                  <Metric
                    label="Identical records"
                    value={format(report.eda.identical_rows)}
                    note="Kept because true customer IDs are absent"
                  />
                </div>
                <div className="grid">
                  <section className="card">
                    <h2>1. Upload historical campaign data</h2>
                    <p>
                      A raw campaign CSV lets you inspect the records and
                      response rates before modeling.
                    </p>
                    <label className="upload">
                      Upload historical CSV
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => upload(e, "historical")}
                      />
                    </label>
                    <small>
                      Required: recency, history, mens, womens, newbie,
                      zip_code, channel, segment, visit, conversion, spend.
                    </small>
                    <p>
                      Upload validates and previews the file. Training is a
                      separate Python step; this screen does not claim new
                      predictions for an untrained upload.
                    </p>
                  </section>
                  <section className="card">
                    <h2>2. Set a planning budget</h2>
                    <div className="controls">
                      <label>
                        Budget ($)
                        <input
                          aria-label="Budget ($)"
                          type="number"
                          min="0"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                        />
                      </label>
                      <label>
                        Assumed cost per email ($)
                        <input
                          aria-label="Assumed cost per email ($)"
                          type="number"
                          min="0.001"
                          step="0.01"
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                        />
                      </label>
                    </div>
                    <p>
                      {capacity === null
                        ? "Enter a nonnegative budget and a positive cost."
                        : `This budget can cover up to ${format(capacity)} of the ${format(filtered.length)} currently filtered customers.`}
                    </p>
                    <small>
                      Week 1 planning only. No customer allocation is performed.
                      $0.10 is an editable assumption; optimal allocation
                      belongs to Week 3.
                    </small>
                  </section>
                </div>
                <section className="card">
                  <h2>
                    {historical
                      ? `Uploaded preview: ${historical.name}`
                      : "Observed response in the supplied dataset"}
                  </h2>
                  {historicalGroups ? (
                    <Chart
                      data={[
                        {
                          type: "bar",
                          x: historicalGroups.map((g) => g.segment),
                          y: historicalGroups.map((g) =>
                            g.visit === null ? null : g.visit * 100,
                          ),
                          name: "Visit rate",
                          marker: { color: "#176b68" },
                        },
                      ]}
                      layout={{ yaxis: { title: { text: "Visit rate (%)" } } }}
                    />
                  ) : (
                    <Chart
                      data={["visit_rate", "purchase_rate"].map((y, i) => ({
                        type: "bar",
                        name: i ? "Purchase rate" : "Visit rate",
                        x: report.eda.groups.map((g) => g.segment),
                        y: report.eda.groups.map((g) => g[y] * 100),
                      }))}
                      layout={{
                        barmode: "group",
                        yaxis: { title: { text: "Response (%)" } },
                      }}
                    />
                  )}
                  {historical && (
                    <p>
                      <button onClick={() => {setHistorical(null); setNotice("Bundled historical preview restored.");}}>Clear uploaded preview</button>{" "}{historical.rows.length.toLocaleString()} uploaded rows.{" "}
                      {historicalGroups
                        .map((g) => `${g.segment}: ${format(g.n)}`)
                        .join(" · ")}
                    </p>
                  )}
                </section>
                <section className="card">
                  <h2>From EDA to model-ready inputs</h2><details><summary>View the EDA distributions and response charts</summary><img className="evidence-image" src="/results/eda.png" alt="EDA: spending distribution, recency, response rates and average spend" /><img className="evidence-image" src="/results/eda_interest_effects.png" alt="Exploratory prior-interest subgroup differences" /></details><p>Past spending is skewed; purchases are rare. We retain valid high spend and duplicate-looking rows. Treatment and post-campaign outcomes stay outside the feature matrix.</p>
                  <ul>
                    {report.preprocessing.decisions.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <p>
                    Training: {format(report.preprocessing.train_rows)}{" "}
                    customers. Test: {format(report.preprocessing.test_rows)}{" "}
                    customers. The model does not learn from test outcomes. Added features: log past spending, recency bands, and prior-interest count. The encoder is fitted on training rows only.
                  </p>
                </section>
              </>
            )}
            {tab === "Causal graph" && (
              <>
                <div className="grid">
                  <section className="card">
                    <h2>The real randomized experiment</h2>
                    <img className="evidence-image" src="/results/hillstrom_visit_dag.png" alt="Randomized causal graph: baseline features and email assignment point to visits" /><div className="dag">
                      Email assignment → Visit / Purchase / Spend
                      <br />
                      <br />
                      Customer details → Visit / Purchase / Spend
                    </div>
                    <p>
                      Email assignment was randomized. Customer details predict
                      response and may change the size of the effect, but do not
                      determine assignment in this DAG.
                    </p>
                    <p>
                      Treatment: segment. Main outcome: visit. Other outcomes:
                      conversion and spend.
                    </p>
                  </section>
                  <section className="card">
                    <h2>A mock shop with confounding</h2>
                    <img className="evidence-image" src="/results/mock_retail_dag.png" alt="Mock retail graph: past spending affects offer and future spending" /><div className="dag">
                      Past spending → Offer
                      <br />
                      Past spending → Future spending
                      <br />
                      Offer → Future spending
                    </div>
                    <p>
                      The shop sends more offers to big spenders. Big spenders
                      also buy more without an offer. Past spending is a
                      confounder because it influences both sides.
                    </p>
                  </section>
                </div>
                <section className="card">
                  <h2>Mock example with known truth</h2>
                  <div className="metrics">
                    <Metric
                      label="True offer effect"
                      value={
                        "$" + format(report.causal_graph.mock.known_true_effect)
                      }
                      note="Chosen in synthetic data generation"
                    />
                    <Metric
                      label="Simple group difference"
                      value={
                        "$" + format(report.causal_graph.mock.naive_difference)
                      }
                      note="Includes differences in past spending"
                    />
                    <Metric
                      label="DoWhy adjusted estimate"
                      value={
                        "$" +
                        format(report.causal_graph.mock.dowhy_adjusted_effect)
                      }
                      note="Adjusts for observed past spending"
                    />
                  </div>
                  <p>
                    The mock example explains confounding. It is never mixed
                    into the Hillstrom model or test results.
                  </p>
                </section>
                <section className="card">
                  <h2>Propensity matching diagnostic</h2>
                  {report.matching.map((m) => (
                    <p key={m.arm}>
                      <b>{m.arm}</b>: {format(m.matched_treated)} matches.
                      Unique controls: {format(m.unique_controls)}. Effective control sample size: {format(m.control_ESS)}. Largest standardized imbalance:{" "}
                      {m.max_imbalance_before.toFixed(3)} before and{" "}
                      {m.max_imbalance_after.toFixed(3)} after.
                    </p>
                  ))}
                  {report.matching.map(m => <details key={m.arm}><summary>{m.arm}: balance of all baseline features</summary><Chart data={[
                    {type:"scatter",mode:"markers",name:"Before",x:m.balance.map(b=>Math.abs(b.smd_before)),y:m.balance.map(b=>b.feature)},
                    {type:"scatter",mode:"markers",name:"After",x:m.balance.map(b=>Math.abs(b.smd_after)),y:m.balance.map(b=>b.feature)}
                  ]} layout={{margin:{l:175,r:25,t:35,b:55},xaxis:{title:{text:"Absolute SMD, fixed denominator"}}}} /></details>)}
                  <p>
                    The same pre-match standard deviation is used before and after matching. Reused controls retain their matching weights. The randomized groups are already balanced. Matching is
                    included as a diagnostic and need not improve their balance.
                  </p>
                </section>
              </>
            )}
            {tab === "Customer scores" && (
              <>
                <section className="card">
                  <div className="card-head">
                    <div>
                      <h2>Explore customer effects</h2>
                      <small>
                        {source} · {format(scores.length)} loaded rows
                      </small>
                    </div>
                    <label className="upload">
                      Upload scored CSV
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => upload(e, "scores")}
                      />
                    </label>
                  </div>
                  <div className="filters">
                    <label>
                      Outcome
                      <select
                        value={filters.outcome}
                        onChange={(e) => change("outcome", e.target.value)}
                      >
                        {outcomes.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Email comparison
                      <select
                        value={filters.arm}
                        onChange={(e) => change("arm", e.target.value)}
                      >
                        <option value="womens">Women’s vs no email</option>
                        <option value="mens">Men’s vs no email</option>
                      </select>
                    </label>
                    <label>
                      Population
                      <select
                        value={filters.split}
                        onChange={(e) => change("split", e.target.value)}
                      >
                        <option value="test">Test customers</option>
                        <option value="train">Training customers</option>
                        <option value="all">All loaded customers</option>
                        <option value="new">New scored customers</option>
                      </select>
                    </label>
                    <label>
                      Channel
                      <select
                        value={filters.channel}
                        onChange={(e) => change("channel", e.target.value)}
                      >
                        {channels.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Maximum recency (months)
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={filters.recency}
                        onChange={(e) => change("recency", e.target.value)}
                      />
                    </label>
                    <label>
                      Minimum effect ({filters.outcome === "spend" ? "$" : "pp"}
                      )
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Any effect"
                        value={filters.minimum}
                        onChange={(e) => change("minimum", e.target.value)}
                      />
                    </label>
                    <label>
                      Search row ID
                      <input
                        placeholder="row_000123"
                        value={filters.search}
                        onChange={(e) => change("search", e.target.value)}
                      />
                    </label>
                  </div>
                  <button onClick={reset}>Reset to bundled test data</button>
                  <p>
                    All filters update the count, effect chart and table
                    together. Training/all-row views are descriptive, not
                    independent evaluation.
                  </p>
                </section>
                <div className="metrics">
                  <Metric
                    label="Matching customers"
                    value={format(filtered.length)}
                    note="All filters applied"
                  />
                  <Metric
                    label="Mean predicted effect"
                    value={
                      average === null
                        ? "No matching rows"
                        : format(average * scale)
                    }
                    note={unit}
                  />
                  <Metric
                    label="Positive estimated effects"
                    value={format(filtered.filter((r) => r[key] > 0).length)}
                    note="Predictions, not confirmed persuadable people"
                  />
                </div>
                <section className="card">
                  <h2>Effect distribution for filtered customers</h2>
                  <Chart
                    data={[
                      {
                        type: "histogram",
                        x: filtered.map((r) => r[key] * scale),
                        nbinsx: 40,
                        marker: { color: "#176b68" },
                        name: "Customers",
                      },
                    ]}
                    layout={{
                      xaxis: {
                        title: { text: "Estimated effect (" + unit + ")" },
                      },
                      yaxis: { title: { text: "Customers" } },
                    }}
                  />
                  {filtered.length === 0 && (
                    <p>
                      No customers match. Clear the search or loosen the
                      filters.
                    </p>
                  )}
                </section>
                {exploratory && (
                  <section className="card">
                    <h2>Exploratory uplift for this filtered test group</h2>
                    <Chart
                      data={[
                        {
                          type: "scatter",
                          mode: "lines",
                          name: "Model ranking",
                          x: exploratory.x,
                          y: exploratory.gain,
                        },
                        {
                          type: "scatter",
                          mode: "lines",
                          name: "Random targeting",
                          x: exploratory.x,
                          y: exploratory.random,
                          line: { dash: "dash" },
                        },
                      ]}
                      layout={{
                        xaxis: {
                          title: { text: "Fraction targeted" },
                          tickformat: ".0%",
                        },
                        yaxis: {
                          title: {
                            text: "Incremental outcome per eligible customer",
                          },
                        },
                      }}
                    />
                    <p>
                      {format(exploratory.n)} customers in this email/control
                      comparison. Qini area: {exploratory.qini.toFixed(5)}. This
                      filtered chart is exploratory and has no confidence
                      interval. Repeatedly searching filters can find chance
                      patterns.
                    </p>
                  </section>
                )}
                <section className="card">
                  <div className="card-head">
                    <h2>Customer scores</h2>
                    <button onClick={download} disabled={!ranked.length}>
                      Download filtered scores
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Row ID</th>
                          <th>Channel</th>
                          <th>Recency</th>
                          <th>
                            Estimated effect (
                            {filters.outcome === "spend" ? "$" : "pp"})
                          </th>
                          <th>Split</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.slice(page * 25, (page + 1) * 25).map((r) => (
                          <tr key={r.customer_id}>
                            <td>{r.customer_id}</td>
                            <td>{r.channel}</td>
                            <td>{r.recency}</td>
                            <td>{(r[key] * scale).toFixed(3)}</td>
                            <td>{r.split}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <span>
                      Page {page + 1} of{" "}
                      {Math.max(1, Math.ceil(ranked.length / 25))}
                    </span>
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      disabled={(page + 1) * 25 >= ranked.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                  <small>
                    For example, +5 pp means an estimated five-percentage-point
                    increase for similar customers. It does not guarantee this
                    particular customer visits.
                  </small>
                </section>
              </>
            )}
            {tab === "Uplift evidence" && (
              <section className="card">
                <div className="card-head">
                  <h2>Double ML: held-out ranking evidence</h2>
                  <label>
                    Outcome
                    <select
                      value={filters.outcome}
                      onChange={(e) => change("outcome", e.target.value)}
                    >
                      {outcomes.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p>
                  Three EconML causal forests estimate visits, purchases and spending using two Random Forest helpers and cross-fitting. These results always refer to the original 19,200-row test
                  set. Customer filters and uploads do not replace this
                  evidence.
                </p>
                <Chart
                  data={Object.entries(report.uplift[filters.outcome]).flatMap(
                    ([arm, c]) => [
                      {
                        type: "scatter",
                        mode: "lines",
                        name: arm + " ranking",
                        x: c.fraction,
                        y: c.gain,
                      },
                      {
                        type: "scatter",
                        mode: "lines",
                        name: arm + " random",
                        x: c.fraction,
                        y: c.random,
                        line: { dash: "dash" },
                      },
                    ],
                  )}
                  layout={{
                    xaxis: {
                      title: { text: "Fraction targeted" },
                      tickformat: ".0%",
                    },
                    yaxis: {
                      title: {
                        text: "Incremental outcome per eligible customer",
                      },
                    },
                  }}
                />
                <h3>Qini-style excess gain over random</h3>
                <Chart data={Object.entries(report.uplift[filters.outcome]).map(([arm,c]) => ({
                  type: "scatter", mode: "lines", name: arm,
                  x: c.fraction, y: c.gain.map((g,i) => g-c.random[i])
                }))} layout={{xaxis:{title:{text:"Fraction targeted"},tickformat:".0%"},
                  yaxis:{title:{text:"Gain minus random gain"},zeroline:true}}} />
                <div className="grid">
                  {Object.entries(report.uplift[filters.outcome]).map(
                    ([arm, c]) => (
                      <div key={arm}>
                        <h3>{arm} email</h3>
                        <p>
                          Qini: {c.qini.toFixed(6)}
                          <br />
                          95% interval: [
                          {c.qini_ci95.map((x) => x.toFixed(6)).join(", ")}]
                          <br />
                          <b>{c.finding}</b>
                        </p>
                      </div>
                    ),
                  )}
                </div>
                <p>
                  The random line is the expected gain from randomly ordering
                  this same population. A positive Qini area measures extra gain
                  from ranking. A confidence interval crossing zero leaves the
                  ranking advantage uncertain.
                </p>
                <small>
                  1,000 bootstrap samples; conditional on the fitted model. Visit
                  is primary. Purchase and spending are secondary; all six
                  comparisons are reported. Intervals are exploratory, unadjusted for multiple comparisons, and exclude retraining uncertainty. The earlier EDA used the full dataset.
                </small>
              </section>
            )}
            {tab === "Causal audit" && (
              <>
                <section className="card"><h2>What this audit can tell us</h2>
                  <p>The exact three-arm models were reloaded and their held-out score exports verified. Repeated DoWhy checks below refit smaller pairwise models for visits only. They do not refute every final-model customer score.</p>
                  <p>Random column and subset tests should stay near the original estimate. Shuffled email should move near zero. Large diagnostic p-values do not prove causality. Each check uses 30 perturbations.</p>
                  <p>Randomization supports causal interpretation; refutations can reveal weaknesses but cannot eliminate every possible hidden confounder.</p>
                </section>
                {report.audit.map((a) => (
                  <section className="card" key={a.arm}>
                    <h2>{a.arm}: DoWhy checks</h2>
                    {a.checks.some(c => c.p_value !== null && c.p_value < 0.05) && <div className="error" role="note">Stability needs review: at least one diagnostic p-value is below 0.05. Read the changed estimate and test scope; this is not a blanket causal verdict.</div>}
                    <p>
                      {a.scope} Original estimated visit effect:{" "}
                      {(a.dml_effect * 100).toFixed(3)} pp.
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Check</th>
                            <th>Original effect</th>
                            <th>Changed-data effect</th><th>Expected reference</th><th>Diagnostic p-value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.checks.map((c) => (
                            <tr key={c.test}>
                              <td>{c.test.replaceAll("_", " ")}</td>
                              <td>{(c.original * 100).toFixed(3)} pp</td>
                              <td>{(c.after_change * 100).toFixed(3)} pp</td><td>{(c.expected_reference * 100).toFixed(3)} pp</td><td>{c.p_value === null ? "Unavailable" : c.p_value.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <details>
                      <summary>Read full test outputs and p-values</summary>
                      {a.checks.map((c) => (
                        <pre key={c.test}>{c.details}</pre>
                      ))}
                    </details>
                    <h3>Assumed hidden-confounder stress scenarios</h3>
                    <p>{a.sensitivity_scope}</p>
                    <Chart
                      data={[
                        {
                          type: "scatter",
                          mode: "lines+markers",
                          x: a.sensitivity.map(
                            (s) => 100 * s.assumed_flip_probability,
                          ),
                          y: a.sensitivity.map((s) => 100 * s.perturbed),
                          name: "Perturbed average effect",
                        },
                        {
                          type: "scatter",
                          mode: "lines",
                          x: a.sensitivity.map(
                            (s) => 100 * s.assumed_flip_probability,
                          ),
                          y: a.sensitivity.map((s) => 100 * s.original),
                          name: "Original average effect",
                          line: { dash: "dash" },
                        },
                      ]}
                      layout={{
                        xaxis: {
                          title: { text: "Assumed label-flip probability (%)" },
                        },
                        yaxis: { title: { text: "Average visit effect (pp)" } },
                      }}
                    />
                    <p>
                      <b>{a.conclusion}</b>
                    </p>
                  </section>
                ))}
              </>
            )}
            {tab === "How to use" && (
              <section className="card">
                <h2>A five-minute explanation for friends</h2><p><a href="/INTERVIEW_GUIDE.md" target="_blank" rel="noreferrer">Open the full project and interview guide</a></p>
                <ol>
                  <li>
                    <b>Start & data:</b> “These are 64,000 customers. Uploading
                    a raw CSV checks the file and shows group visit rates. It
                    does not retrain the model.”
                  </li>
                  <li>
                    <b>Budget:</b> “If one email costs $0.10 and I have $100, I
                    can afford at most 1,000 emails. Choosing the optimal
                    recipients is Week 3.”
                  </li>
                  <li>
                    <b>Causal graph:</b> “Past spending can cause both getting
                    an offer and buying more in our mock shop. We must account
                    for it. Hillstrom assigned emails randomly.”
                  </li>
                  <li>
                    <b>Customer scores:</b> “Choose visits, women’s email, test
                    customers, Web channel, recency at most 6 and effect at
                    least 5 pp. Watch the count, histogram and table change.”
                  </li>
                  <li>
                    <b>Interpret a score:</b> “An estimated +5 pp could mean a
                    chance rising from 10% to 15% for similar customers. We
                    cannot observe both possible futures for one person.”
                  </li>
                  <li>
                    <b>Uplift evidence:</b> “Compare the model’s order with a
                    random order. Read the interval as well as the curve. We
                    only claim improvement where the evidence supports it.”
                  </li>
                  <li>
                    <b>Causal audit:</b> “Shuffle emails: the estimate should
                    move near zero. Add irrelevant information or remove some
                    rows: check stability. These checks do not prove all hidden
                    influences are gone.”
                  </li>
                  <li>
                    <b>Upload scored CSV:</b> “Load the Python-generated
                    customer scores, including all six effect columns. The
                    browser filters and charts them locally. Uploaded scores do
                    not replace our independent saved evaluation.”
                  </li>
                  <li>
                    <b>Reset / download:</b> “Reset restores the original test
                    customers. Download saves every matching score, not just the
                    25 visible rows.”
                  </li>
                </ol>
                <p>
                  Read the numbered notebooks in order: EDA → preprocessing →
                  causal graph → matching → Double ML → audit → dashboard
                  export.
                </p>
              </section>
            )}
          </>
        )}
        <footer>
          Week 1 · Week 2 · Mid-project review — Python, DoWhy, EconML, React
          and Plotly
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
