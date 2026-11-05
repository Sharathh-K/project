import Papa from "papaparse";

export const REQUIRED_COLUMNS = [
  "recency",
  "history",
  "mens",
  "womens",
  "newbie",
  "zip_code",
  "channel",
];
export const OPTIONAL_COLUMNS = ["customer_id", "Customer ID", "history_floor"];
export const MAX_ROWS = 100_000;
export const MIN_DRIFT_ROWS = 500;

const OUTCOME_COLUMNS = new Set(["segment", "visit", "conversion", "spend"]);
const NUMERIC_RULES = {
  recency: { integer: true },
  history: {},
  mens: { integer: true, binary: true },
  womens: { integer: true, binary: true },
  newbie: { integer: true, binary: true },
  history_floor: { integer: true, binary: true },
};
const ZIP_CODES = new Set(["Urban", "Suburban", "Rural"]);
const CHANNELS = new Set(["Phone", "Web", "Multichannel"]);

function isEmpty(value) {
  return value == null || String(value).trim() === "";
}

function isValidValue(column, value) {
  const text = String(value).trim();
  if (NUMERIC_RULES[column]) {
    const number = Number(text);
    const rule = NUMERIC_RULES[column];
    return Number.isFinite(number)
      && number >= 0
      && (!rule.integer || Number.isInteger(number))
      && (!rule.binary || number === 0 || number === 1);
  }
  if (column === "zip_code") return ZIP_CODES.has(text);
  if (column === "channel") return CHANNELS.has(text);
  return true;
}

function numericValues(values) {
  const present = values.filter((value) => !isEmpty(value));
  if (!present.length || !present.every((value) => Number.isFinite(Number(value)))) return null;
  return present.map(Number);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function columnProfile(column, role, rows, rowCount) {
  const values = rows.map((row) => row[column] ?? "");
  const present = values.filter((value) => !isEmpty(value));
  const missing = rowCount - present.length;
  const numbers = numericValues(values);
  const base = {
    column,
    role,
    detectedType: numbers ? "numeric" : present.length ? "categorical" : "empty",
    missing,
    missingPercent: rowCount ? (missing / rowCount) * 100 : 0,
    min: null,
    median: null,
    max: null,
    categories: [],
  };
  if (numbers) {
    base.min = Math.min(...numbers);
    base.median = median(numbers);
    base.max = Math.max(...numbers);
  } else {
    const counts = new Map();
    for (const value of present) {
      const label = String(value).trim();
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    base.categories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([value, count]) => ({ value, count, share: present.length ? count / present.length : 0 }));
  }
  return base;
}

function categoricalDistribution(rows, column, normalize = false) {
  const values = rows.map((row) => row[column]).filter((value) => !isEmpty(value)).map(String);
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: values.length ? count / values.length : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function numericDistribution(rows, column) {
  const values = numericValues(rows.map((row) => row[column] ?? ""));
  if (!values?.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / 5;
  const bins = Array.from({ length: 5 }, (_, index) => ({
    label: max === min ? String(min) : `${(min + width * index).toFixed(1)}–${(index === 4 ? max : min + width * (index + 1)).toFixed(1)}`,
    count: 0,
  }));
  for (const value of values) {
    const index = max === min ? 0 : Math.min(4, Math.floor((value - min) / width));
    bins[index].count += 1;
  }
  const largest = Math.max(...bins.map((bin) => bin.count), 1);
  return bins.map((bin) => ({ ...bin, share: bin.count / values.length, bar: bin.count / largest }));
}

function requiredCellIssues(fields, rows) {
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
  const emptyByColumn = [];
  const invalidByColumn = [];
  for (const column of REQUIRED_COLUMNS) {
    if (!fields.includes(column)) continue;
    let emptyCount = 0;
    let invalidCount = 0;
    const examples = [];
    rows.forEach((row, index) => {
      const value = row[column] ?? "";
      if (isEmpty(value)) {
        emptyCount += 1;
      } else if (!isValidValue(column, value)) {
        invalidCount += 1;
        if (examples.length < 5) examples.push(index + 2);
      }
    });
    if (emptyCount) emptyByColumn.push({ column, count: emptyCount, percent: rows.length ? emptyCount / rows.length * 100 : 0 });
    if (invalidCount) invalidByColumn.push({ column, count: invalidCount, exampleRows: examples });
  }
  return { missingColumns, emptyByColumn, invalidByColumn };
}

function duplicateReport(fields, rows) {
  const idColumn = fields.includes("customer_id")
    ? "customer_id"
    : fields.includes("Customer ID")
      ? "Customer ID"
      : null;
  const seenIds = new Set();
  const duplicateIdRows = [];
  if (idColumn) {
    rows.forEach((row, index) => {
      const id = String(row[idColumn] ?? "").trim();
      if (!id) return;
      if (seenIds.has(id) && duplicateIdRows.length < 10) duplicateIdRows.push(index + 2);
      seenIds.add(id);
    });
  }
  const seenRows = new Set();
  const duplicateRows = [];
  rows.forEach((row, index) => {
    const key = fields.map((field) => String(row[field] ?? "").trim()).join("\u0000");
    if (seenRows.has(key) && duplicateRows.length < 10) duplicateRows.push(index + 2);
    seenRows.add(key);
  });
  return { idColumn, duplicateIdRows, duplicateRows };
}

function statusCheck(id, label, status, detail = "") {
  return { id, label, status, detail };
}

export function profileCustomerRows(fields, rows, parseErrors = []) {
  const headers = [...new Set(fields)];
  const rowCount = rows.length;
  const { missingColumns, emptyByColumn, invalidByColumn } = requiredCellIssues(headers, rows);
  const { idColumn, duplicateIdRows, duplicateRows } = duplicateReport(headers, rows);
  const optionalPresent = ["customer_id", "history_floor"].filter((column) =>
    headers.includes(column) || (column === "customer_id" && headers.includes("Customer ID")));
  const ignoredColumns = headers.filter((column) =>
    !REQUIRED_COLUMNS.includes(column)
    && !OPTIONAL_COLUMNS.includes(column)
    && column !== "Customer ID");
  const outcomeColumns = ignoredColumns.filter((column) => OUTCOME_COLUMNS.has(column));
  const checks = [];
  const issueCount = missingColumns.length
    + emptyByColumn.reduce((sum, item) => sum + item.count, 0)
    + invalidByColumn.reduce((sum, item) => sum + item.count, 0)
    + (rowCount > MAX_ROWS ? 1 : 0)
    + parseErrors.length;
  const warningCount = duplicateIdRows.length + duplicateRows.length + (rowCount < MIN_DRIFT_ROWS ? 1 : 0);

  checks.push(statusCheck(
    "required-columns",
    "All 7 required columns are present",
    missingColumns.length ? "fail" : "pass",
    missingColumns.length ? `Missing: ${missingColumns.join(", ")}` : REQUIRED_COLUMNS.join(", "),
  ));
  for (const column of REQUIRED_COLUMNS) {
    const empty = emptyByColumn.find((item) => item.column === column);
    checks.push(statusCheck(
      `empty-${column}`,
      `Empty cells in ${column}`,
      empty ? "fail" : "pass",
      empty ? `${empty.count} (${empty.percent.toFixed(2)}%)` : "None",
    ));
    const invalid = invalidByColumn.find((item) => item.column === column);
    checks.push(statusCheck(
      `invalid-${column}`,
      `Invalid values in ${column}`,
      invalid ? "fail" : "pass",
      invalid ? `${invalid.count}; example CSV rows ${invalid.exampleRows.join(", ")}` : "None",
    ));
  }
  checks.push(statusCheck(
    "duplicate-ids",
    "Duplicate customer IDs",
    duplicateIdRows.length ? "warn" : "pass",
    idColumn
      ? duplicateIdRows.length ? `Repeated IDs on rows ${duplicateIdRows.join(", ")}` : `No repeated IDs in ${idColumn}`
      : "No customer ID column provided",
  ));
  checks.push(statusCheck(
    "duplicate-rows",
    "Fully duplicated rows",
    duplicateRows.length ? "warn" : "pass",
    duplicateRows.length ? `Repeated rows ${duplicateRows.join(", ")}` : "None",
  ));
  checks.push(statusCheck(
    "row-limit",
    `Row count within ${MAX_ROWS.toLocaleString()} limit`,
    rowCount > MAX_ROWS ? "fail" : "pass",
    `${rowCount.toLocaleString()} rows`,
  ));
  checks.push(statusCheck(
    "drift-minimum",
    "At least 500 rows for a reliable drift check",
    rowCount < MIN_DRIFT_ROWS ? "warn" : "pass",
    rowCount < MIN_DRIFT_ROWS ? `${rowCount} rows; drift check is less reliable below 500` : `${rowCount.toLocaleString()} rows`,
  ));
  checks.push(statusCheck(
    "optional-columns",
    "Optional columns",
    "pass",
    `${optionalPresent.length ? `Present: ${optionalPresent.join(", ")}.` : "No optional columns provided."} history_floor is derived from history when missing.`,
  ));
  checks.push(statusCheck(
    "ignored-columns",
    "Ignored columns",
    "pass",
    ignoredColumns.length
      ? ignoredColumns.map((column) => OUTCOME_COLUMNS.has(column)
        ? `${column} (post-campaign outcome: ignored and never sent to the API)`
        : column).join(", ")
      : "None",
  ));
  if (parseErrors.length) {
    checks.push(statusCheck("csv-parse", "CSV structure", "fail", parseErrors.map((error) => error.message).join("; ")));
  }

  const profileFields = [...new Set([...headers, ...missingColumns])];
  const columns = profileFields.map((column) => {
    const role = REQUIRED_COLUMNS.includes(column)
      ? "required"
      : OPTIONAL_COLUMNS.includes(column) || column === "Customer ID"
        ? "optional"
        : "ignored";
    return columnProfile(column, role, rows, rowCount);
  });
  const status = issueCount ? "rejected" : warningCount ? "review" : "ready";

  return {
    status,
    issueCount,
    warningCount,
    rowCount,
    headers,
    checks,
    columns,
    ignoredColumns,
    outcomeColumns,
    distributions: {
      zip_code: categoricalDistribution(rows, "zip_code"),
      channel: categoricalDistribution(rows, "channel"),
      newbie: categoricalDistribution(rows, "newbie"),
      recency: numericDistribution(rows, "recency"),
      history: numericDistribution(rows, "history"),
    },
  };
}

export function profileCustomerText(text) {
  const { data, errors, meta } = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  return profileCustomerRows(meta.fields ?? [], data, errors);
}

export async function profileCustomerCsv(file) {
  return profileCustomerText(await file.text());
}
