import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Papa from "papaparse";
import { performance } from "node:perf_hooks";
import {
  validateRows,
  filterScores,
  calculateCurve,
  budgetCapacity,
} from "./analysis.mjs";
const source = Papa.parse(
  fs.readFileSync(
    new URL("../public/results/customer_scores.csv", import.meta.url),
    "utf8",
  ),
  { header: true, dynamicTyping: true, skipEmptyLines: true },
).data;
const report = JSON.parse(
  fs.readFileSync(
    new URL("../public/results/report.json", import.meta.url),
    "utf8",
  ),
);
const base = {
  split: "test",
  channel: "All",
  recency: 12,
  minimum: "",
  search: "",
  arm: "womens",
  outcome: "visit",
};

test("64,000 scores load and 19,200 independent test rows are selected", () => {
  assert.equal(validateRows(source, "scores").length, 64000);
  assert.equal(filterScores(source, base).length, 19200);
});
test("filters and chart use exactly the same population at full scale", () => {
  const start = performance.now();
  const filtered = filterScores(source, {
    ...base,
    channel: "Web",
    recency: 6,
    minimum: 5,
  });
  assert.ok(filtered.length > 0 && filtered.length < 19200);
  assert.ok(
    filtered.every(
      (r) =>
        r.channel === "Web" &&
        r.recency <= 6 &&
        r.visit_womens >= 0.05 &&
        r.split === "test",
    ),
  );
  const curve = calculateCurve(filtered, "visit", "womens");
  assert.equal(
    curve.n,
    filtered.filter((r) => [0, 2].includes(r.treatment)).length,
  );
  console.log(
    `64,000-row filter and curve: ${(performance.now() - start).toFixed(1)} ms; ${filtered.length} matching rows.`,
  );
});
test("JavaScript curves reproduce all six Python results", () => {
  const rows = filterScores(source, base);
  for (const outcome of ["visit", "conversion", "spend"])
    for (const arm of ["mens", "womens"]) {
      const calculated = calculateCurve(rows, outcome, arm);
      assert.ok(
        Math.abs(calculated.qini - report.uplift[outcome][arm].qini) < 1e-9,
      );
    }
});
test("no matches and single-arm groups do not invent uplift", () => {
  assert.equal(
    filterScores(source, { ...base, search: "nonexistent" }).length,
    0,
  );
  assert.equal(
    calculateCurve(
      source.filter((r) => r.treatment === 0),
      "visit",
      "mens",
    ),
    null,
  );
});
test("budget capacity obeys a strict integer email limit", () => {
  assert.equal(budgetCapacity(100, 0.1, 19200), 1000);
  assert.equal(budgetCapacity(0.25, 0.1, 19200), 2);
  assert.equal(budgetCapacity(5000, 0.1, 19200), 19200);
  assert.equal(budgetCapacity(0, 0.1, 19200), 0);
  assert.equal(budgetCapacity(10, 0, 19200), null);
  assert.equal(budgetCapacity(NaN, 0.1, 19200), null);
});
test("malformed uploads and duplicate IDs are rejected", () => {
  assert.throws(() => validateRows([], "historical"));
  assert.throws(() => validateRows([{ bad: 1 }], "historical"));
  assert.throws(() => validateRows([source[0], source[0]], "scores"));
  const bad = { ...source[0], visit_womens: Infinity };
  assert.throws(() => validateRows([bad], "scores"));
});
test("raw historical dataset validates separately from scored data", () => {
  const raw = Papa.parse(
    fs.readFileSync(
      new URL("../../data/raw/hillstrom.csv", import.meta.url),
      "utf8",
    ),
    { header: true, dynamicTyping: true, skipEmptyLines: true },
  ).data;
  assert.equal(validateRows(raw, "historical").length, 64000);
  assert.throws(() => validateRows(raw, "scores"));
});

test("equal scores cannot receive an arbitrary ranking advantage", () => {
  const tied = source.filter(r => r.split === "test").map(r => ({...r, visit_mens: 1}));
  assert.ok(Math.abs(calculateCurve(tied,"visit","mens").qini) < 1e-12);
});

test("budget arithmetic handles decimals without a fixed overspend allowance", () => {
  assert.equal(budgetCapacity(0.3,0.1,100),3);
  assert.equal(budgetCapacity(0.0999999999,0.1,100),0);
});
