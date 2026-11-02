import Papa from "papaparse";

const REQUIRED_COLUMNS = [
  "recency",
  "history",
  "mens",
  "womens",
  "newbie",
  "zip_code",
  "channel",
];
const MAX_ROWS = 100_000;
const ZIP_CODES = new Set(["Urban", "Suburban", "Rural"]);
const CHANNELS = new Set(["Phone", "Web", "Multichannel"]);

function parseNumber(value, field, rowNumber, { integer = false, binary = false } = {}) {
  const parsed = Number(value);
  if (!value.trim() || !Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: "${field}" must be a number.`);
  }
  if (parsed < 0 || (integer && !Number.isInteger(parsed)) || (binary && parsed !== 0 && parsed !== 1)) {
    const requirement = binary ? "0 or 1" : integer ? "a non-negative whole number" : "a non-negative number";
    throw new Error(`Row ${rowNumber}: "${field}" must be ${requirement}.`);
  }
  return parsed;
}

function parseCustomer(row, rowNumber) {
  const customer = {
    recency: parseNumber(row.recency ?? "", "recency", rowNumber, { integer: true }),
    history: parseNumber(row.history ?? "", "history", rowNumber),
    mens: parseNumber(row.mens ?? "", "mens", rowNumber, { integer: true, binary: true }),
    womens: parseNumber(row.womens ?? "", "womens", rowNumber, { integer: true, binary: true }),
    newbie: parseNumber(row.newbie ?? "", "newbie", rowNumber, { integer: true, binary: true }),
    zip_code: row.zip_code?.trim() ?? "",
    channel: row.channel?.trim() ?? "",
  };

  if (!ZIP_CODES.has(customer.zip_code)) {
    throw new Error(`Row ${rowNumber}: "zip_code" must be Urban, Suburban, or Rural.`);
  }
  if (!CHANNELS.has(customer.channel)) {
    throw new Error(`Row ${rowNumber}: "channel" must be Phone, Web, or Multichannel.`);
  }

  const customerId = row.customer_id?.trim() || row["Customer ID"]?.trim();
  if (customerId) customer.customer_id = customerId;

  if (row.history_floor?.trim()) {
    customer.history_floor = parseNumber(row.history_floor, "history_floor", rowNumber, {
      integer: true,
      binary: true,
    });
  }

  return customer;
}

export async function parseCustomerCsv(file) {
  if (!file || !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Choose a CSV file to continue.");
  }

  const text = await file.text();
  const { data, errors, meta } = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  if (errors.length) {
    throw new Error(`Could not read the CSV: ${errors[0].message}`);
  }

  const columns = meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length) {
    throw new Error(`Missing required CSV columns: ${missing.join(", ")}.`);
  }
  if (!data.length) {
    throw new Error("The CSV has headers but no customer rows.");
  }
  if (data.length > MAX_ROWS) {
    throw new Error(`The API accepts at most ${MAX_ROWS.toLocaleString()} customer rows.`);
  }

  return data.map((row, index) => parseCustomer(row, index + 2));
}
