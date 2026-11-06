const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(`Cannot reach the EconoCausal API at ${API_BASE_URL}. ${error.message}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(`The API returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const detail = body.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `API request failed (HTTP ${response.status}).`,
    );
  }
  return body;
}

export function getHealth() {
  return request("/health");
}

export function getEvaluationCurves() {
  return request("/evaluation/curves");
}

export function predictCustomer(customer) {
  return request("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customers: [customer] }),
  });
}

export function getBudgetScenarios(payload, { signal } = {}) {
  return request("/budget-scenarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

export function optimizeCampaign(payload) {
  return request("/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function checkDrift(customers) {
  return request("/drift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customers }),
  });
}
