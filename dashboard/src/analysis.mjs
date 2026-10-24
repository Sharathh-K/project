// Small pure functions shared by the dashboard and its tests.
export const features = [
  "recency",
  "history",
  "mens",
  "womens",
  "newbie",
  "zip_code",
  "channel",
];
export const outcomes = ["visit", "conversion", "spend"];
export const arms = ["No E-Mail", "Mens E-Mail", "Womens E-Mail"];
export const scoreColumns = outcomes.flatMap((y) =>
  ["mens", "womens"].map((a) => `${y}_${a}`),
);
const finite = (x) => typeof x === "number" && Number.isFinite(x);

export function validateRows(rows, kind) {
  if (!rows.length || rows.length > 100000)
    throw Error("Use a CSV with 1 to 100,000 rows.");
  const required =
    kind === "historical"
      ? [...features, "segment", ...outcomes]
      : [...features, "customer_id", "split", ...scoreColumns];
  const missing = required.filter((c) => !(c in rows[0]));
  if (missing.length) throw Error("Missing columns: " + missing.join(", "));
  const ids = new Set();
  for (const r of rows) {
    for (const c of required)
      if (r[c] === null || r[c] === undefined || r[c] === "")
        throw Error("Missing required value in " + c);
    for (const c of ["recency", "history", "mens", "womens", "newbie"])
      if (!finite(r[c])) throw Error(c + " must be numeric.");
    if (
      !Number.isInteger(r.recency) ||
      r.recency < 1 ||
      r.recency > 12 ||
      r.history < 0
    )
      throw Error(
        "Check recency (1–12 months) and past spending (nonnegative).",
      );
    for (const c of ["mens", "womens", "newbie"])
      if (![0, 1].includes(r[c])) throw Error(c + " must be 0 or 1.");
    if (kind === "historical") {
      if (!arms.includes(r.segment)) throw Error("Unknown email segment.");
      if (
        ![0, 1].includes(r.visit) ||
        ![0, 1].includes(r.conversion) ||
        !finite(r.spend) ||
        r.spend < 0 ||
        r.conversion > r.visit ||
        r.spend > 0 !== (r.conversion === 1)
      )
        throw Error("Visit, purchase or spending values are inconsistent.");
    } else {
      if (ids.has(String(r.customer_id)))
        throw Error("Customer IDs must be unique.");
      ids.add(String(r.customer_id));
      if (scoreColumns.some((c) => !finite(r[c])))
        throw Error("All six effect columns must contain finite numbers.");
      if (!["train", "test", "new"].includes(r.split))
        throw Error("split must be train, test or new.");
    }
  }
  return rows;
}

export function filterScores(rows, filters) {
  const key = `${filters.outcome}_${filters.arm}`;
  const scale = filters.outcome === "spend" ? 1 : 100;
  return rows.filter(
    (r) =>
      (filters.split === "all" || r.split === filters.split) &&
      (filters.channel === "All" || r.channel === filters.channel) &&
      r.recency <= Number(filters.recency) &&
      (filters.minimum === "" || r[key] * scale >= Number(filters.minimum)) &&
      String(r.customer_id)
        .toLowerCase()
        .includes(filters.search.toLowerCase()),
  );
}

export function calculateCurve(rows, outcome, arm) {
  const armId = arm === "mens" ? 1 : 2;
  const pair = rows.filter(
    (r) => r.split === "test" && [0, armId].includes(r.treatment),
  );
  if (
    !pair.some((r) => r.treatment === 0) ||
    !pair.some((r) => r.treatment === armId)
  )
    return null;
  const ranked = [...pair].sort(
    (a, b) => b[`${outcome}_${arm}`] - a[`${outcome}_${arm}`],
  );
  const x = [0], gain = [0];
  let sum = 0;
  const key = `${outcome}_${arm}`;
  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i];
    sum += 2 * row[outcome] * (row.treatment === armId ? 1 : -1);
    // Equal predictions have no preferred order: retain complete tie groups only.
    if (i === ranked.length - 1 || row[key] !== ranked[i + 1][key]) {
      x.push((i + 1) / ranked.length);
      gain.push(sum / ranked.length);
    }
  }
  const random = x.map(f => f * gain.at(-1));
  let area = 0;
  for (let i = 1; i < x.length; i++)
    area += (x[i] - x[i-1]) * (gain[i]-random[i]+gain[i-1]-random[i-1]) / 2;
  const indices = [...new Set(Array.from({length:101}, (_,i) => Math.floor(i*(x.length-1)/100)))];
  return {n:ranked.length, qini:area, x:indices.map(i=>x[i]),
          gain:indices.map(i=>gain[i]), random:indices.map(i=>random[i])};
}

export function budgetCapacity(budget, cost, customers) {
  if (!finite(budget) || !finite(cost) || budget < 0 || cost <= 0) return null;
  const ratio = budget / cost;
  return Math.min(customers, Math.floor(ratio + 2 * Number.EPSILON * Math.max(1, ratio)));
}
