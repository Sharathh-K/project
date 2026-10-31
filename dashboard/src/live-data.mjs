import Papa from "papaparse";
export const baselineFields = [
  "recency",
  "history",
  "mens",
  "womens",
  "newbie",
  "zip_code",
  "channel",
];
export function parseLiveCSV(text) {
  const parsed = Papa.parse(text, {
    header: true,
    // IDs are labels: "001" and "1" must stay different.
    dynamicTyping: (field) =>
      baselineFields.includes(field) &&
      !["zip_code", "channel"].includes(field),
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length) throw Error(parsed.errors[0].message);
  return parsed.data;
}
export function baselineRows(data) {
  if (!data.length || data.length > 5000)
    throw Error("Choose 1–5,000 customers.");
  return data.map((row, i) =>
    Object.fromEntries([
      ["customer_id", String(row.customer_id ?? "").trim() || `upload_${i}`],
      ...baselineFields.map((field) => [field, row[field]]),
    ]),
  );
}
