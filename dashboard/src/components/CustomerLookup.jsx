import { useState } from "react";
import { predictCustomer } from "../api.js";
import { formatUplift } from "../format.js";

const INITIAL_CUSTOMER = {
  recency: "10",
  history: "100",
  mens: "0",
  womens: "0",
  newbie: "0",
  zip_code: "Urban",
  channel: "Web",
};

function UpliftCard({ label, value, className }) {
  return (
    <article className={`lookup-result-card ${className}`}>
      <span>{label} e-mail</span>
      <strong>{formatUplift(value)}</strong>
      <small>Estimated change in purchase probability</small>
    </article>
  );
}

export default function CustomerLookup({ apiOnline }) {
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setPrediction(null);
    setLoading(true);
    const payload = {
      recency: Number(customer.recency),
      history: Number(customer.history),
      mens: Number(customer.mens),
      womens: Number(customer.womens),
      newbie: Number(customer.newbie),
      zip_code: customer.zip_code,
      channel: customer.channel,
    };
    try {
      const response = await predictCustomer(payload);
      setPrediction(response.results[0]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="workspace-card" aria-labelledby="customer-lookup-heading">
      <div className="workspace-card-heading">
        <div>
          <p className="eyebrow">LIVE MODEL DEMO</p>
          <h2 id="customer-lookup-heading">Customer lookup</h2>
          <p>Enter pre-campaign customer features to compare estimated uplift by e-mail arm.</p>
        </div>
      </div>
      <form className="lookup-form" onSubmit={handleSubmit}>
        <label>
          <span>Recency</span>
          <input type="number" min="0" step="1" value={customer.recency} onChange={(event) => update("recency", event.target.value)} required />
        </label>
        <label>
          <span>History ($)</span>
          <input type="number" min="0" step="0.01" value={customer.history} onChange={(event) => update("history", event.target.value)} required />
        </label>
        <label>
          <span>Mens purchase history</span>
          <select value={customer.mens} onChange={(event) => update("mens", event.target.value)}>
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </label>
        <label>
          <span>Womens purchase history</span>
          <select value={customer.womens} onChange={(event) => update("womens", event.target.value)}>
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </label>
        <label>
          <span>New customer</span>
          <select value={customer.newbie} onChange={(event) => update("newbie", event.target.value)}>
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </label>
        <label>
          <span>ZIP code</span>
          <select value={customer.zip_code} onChange={(event) => update("zip_code", event.target.value)}>
            <option>Urban</option>
            <option>Suburban</option>
            <option>Rural</option>
          </select>
        </label>
        <label>
          <span>Channel</span>
          <select value={customer.channel} onChange={(event) => update("channel", event.target.value)}>
            <option>Phone</option>
            <option>Web</option>
            <option>Multichannel</option>
          </select>
        </label>
        <div className="lookup-submit">
          <button type="submit" className="button button-primary" disabled={!apiOnline || loading}>
            {loading ? "Estimating…" : "Estimate uplift"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </form>

      {!apiOnline && <p className="workspace-muted" role="status">Connect to the API to run a customer estimate.</p>}
      {error && <p className="form-error" role="alert">Could not estimate this customer: {error}</p>}
      {prediction && (
        <div className="lookup-results" aria-live="polite">
          <div className="lookup-result-grid">
            <UpliftCard label="Mens" value={prediction.ite_mens} className="lookup-mens" />
            <UpliftCard label="Womens" value={prediction.ite_womens} className="lookup-womens" />
          </div>
          <p className="lookup-recommendation">
            Model recommendation: <strong>{prediction.best_segment}</strong>
          </p>
          <p className="workspace-caveat">These are model estimates, not guaranteed individual outcomes or a claim that uplift targeting beats random targeting.</p>
        </div>
      )}
    </section>
  );
}
