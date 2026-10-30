import React, { useState } from "react";
import Papa from "papaparse";
const fields = [
  "recency",
  "history",
  "mens",
  "womens",
  "newbie",
  "zip_code",
  "channel",
];
export default function LiveCampaign({
  bundled,
  budget,
  setBudget,
  cost,
  setCost,
}) {
  const [rows, setRows] = useState([]),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function load(data) {
    if (!data.length || data.length > 5000)
      throw Error("Choose 1–5,000 customers.");
    setRows(
      data.map((r, i) =>
        Object.fromEntries([
          ["customer_id", String(r.customer_id ?? `upload_${i}`)],
          ...fields.map((f) => [f, r[f]]),
        ]),
      ),
    );
    setResult(null);
    setError("");
  }
  async function upload(e) {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5e6) throw Error("Maximum upload size is 5 MB.");
      const p = Papa.parse(await f.text(), {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: "greedy",
      });
      if (p.errors.length) throw Error(p.errors[0].message);
      load(p.data);
    } catch (e) {
      setRows([]);
      setResult(null);
      setError(e.message);
    }
  }
  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customers: rows,
          budget: Number(budget),
          email_cost: Number(cost),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail),
        );
      setResult(data);
    } catch (e) {
      setError(
        "Could not complete live scoring. Start the Week 4 API on port 8002 and check the input. " +
          e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const blob = new Blob([Papa.unparse(result.rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "live_campaign.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section>
      <h2>Live scoring & drift</h2>
      <p>
        Upload customers’ characteristics from before the campaign. The API
        checks for changes, predicts email effects and allocates your budget. It
        does not save your upload.
      </p>
      <p>
        Required CSV columns: {fields.join(", ")}. Customer IDs are optional;
        row IDs are created if missing. Outcome and email-assignment columns are
        excluded.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          load(bundled.filter((r) => r.split === "test").slice(0, 1000))
        }
      >
        Use 1,000 held-out sample customers
      </button>{" "}
      <input
        disabled={busy}
        aria-label="Upload new customers"
        type="file"
        accept=".csv"
        onChange={upload}
      />
      <p>
        {rows.length} customers ready. Historical samples demonstrate inference,
        not a new experiment.
      </p>
      <label>
        Budget ($){" "}
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={busy}
          value={budget}
          onChange={(e) => {setBudget(e.target.value); setResult(null);}}
        />
      </label>{" "}
      <label>
        Cost per email ($){" "}
        <input
          type="number"
          min="0.01"
          step="0.01"
          disabled={busy}
          value={cost}
          onChange={(e) => {setCost(e.target.value); setResult(null);}}
        />
      </label>
      <p>
        <button disabled={busy || !rows.length} onClick={run}>
          {busy ? "Checking and scoring…" : "Check drift, score and allocate"}
        </button>{" "}
        <a href="http://127.0.0.1:8002/docs" target="_blank" rel="noreferrer">
          API documentation
        </a>
      </p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <h3>Campaign summary</h3>
          <p>{result.plain_summary}</p>
          <p>{result.warning}</p>
          <h3>Drift check: {result.drift.status.replaceAll("_", " ")}</h3>
          <p>{result.drift.explanation}</p>
          <table>
            <thead>
              <tr>
                <th>Characteristic</th>
                <th>Distance</th>
                <th>Unknown fraction</th>
                <th>Review?</th>
              </tr>
            </thead>
            <tbody>
              {result.drift.metrics.map((m) => (
                <tr key={m.feature}>
                  <td>{m.feature}</td>
                  <td>{m.distance.toFixed(4)}</td>
                  <td>{m.unknown_fraction.toFixed(4)}</td>
                  <td>{m.warning ? "Review" : "Below threshold"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={download}>Download all recommendations</button>
          <h3>First 20 recommendations</h3>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Action</th>
                <th>Predicted extra spend ($)</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.slice(0, 20).map((r) => (
                <tr key={r.customer_id}>
                  <td>{r.customer_id}</td>
                  <td>{r.recommended_action}</td>
                  <td>{r.predicted_incremental_revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <small>Model fingerprint: {result.model_id}</small>
        </>
      )}
    </section>
  );
}
