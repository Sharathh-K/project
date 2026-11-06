const DIMENSIONS = [
  { key: "zip_code", label: "ZIP code" },
  { key: "channel", label: "Channel" },
  { key: "newbie", label: "New customer" },
];

const SMALL_GROUP_SIZE = 30;
const RECENCY_BANDS = [
  { label: "Recency 1–3", min: 1, maxExclusive: 4 },
  { label: "Recency 4–6", min: 4, maxExclusive: 7 },
  { label: "Recency 7–9", min: 7, maxExclusive: 10 },
  { label: "Recency 10–12", min: 10, maxExclusive: 13 },
];
const HISTORY_BANDS = [
  { label: "History $0–<$100", min: 0, maxExclusive: 100 },
  { label: "History $100–<$250", min: 100, maxExclusive: 250 },
  { label: "History $250–<$500", min: 250, maxExclusive: 500 },
  { label: "History $500–<$1,000", min: 500, maxExclusive: 1000 },
  { label: "History $1,000+", min: 1000, maxExclusive: Infinity },
];

function summarizeGroups(groups, sort = true) {
  const summaries = [...groups.entries()]
    .map(([label, rows]) => {
      const selected = rows.filter((row) => row.assigned_arm !== "No E-Mail").length;
      return {
        label,
        customers: rows.length,
        selected,
        selectedPercent: selected / rows.length * 100,
        isSmallGroup: rows.length < SMALL_GROUP_SIZE,
        mens: rows.reduce((sum, row) => sum + (row.ite_mens ?? 0), 0) / rows.length,
        womens: rows.reduce((sum, row) => sum + (row.ite_womens ?? 0), 0) / rows.length,
      };
    });
  return sort
    ? summaries.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    : summaries;
}

function categoricalGroups(rows, key, labelValue = (row) => row[key]) {
  const groups = new Map();
  for (const row of rows) {
    const label = labelValue(row);
    if (label == null || label === "") continue;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  }
  return summarizeGroups(groups);
}

function fixedBandGroups(rows, key, bands, outsideLabel) {
  const groups = new Map(bands.map((band) => [band.label, []]));
  const outside = [];
  for (const row of rows) {
    const value = Number(row[key]);
    if (!Number.isFinite(value)) continue;
    const band = bands.find(({ min, maxExclusive }) => value >= min && value < maxExclusive);
    if (band) groups.get(band.label).push(row);
    else outside.push(row);
  }
  if (outside.length) groups.set(outsideLabel, outside);
  return summarizeGroups(new Map([...groups].filter(([, members]) => members.length)), false);
}

export function buildSegmentSummaries(allocations) {
  const rows = allocations ?? [];
  return [
    ...DIMENSIONS.map(({ key, label }) => ({
      key,
      label,
      groups: categoricalGroups(rows, key, key === "newbie"
        ? (row) => row.newbie ? "New customer" : "Returning customer"
        : (row) => row[key]),
    })),
    { key: "recency", label: "Recency bands", groups: fixedBandGroups(rows, "recency", RECENCY_BANDS, "Recency outside 1–12") },
    { key: "history", label: "History bands", groups: fixedBandGroups(rows, "history", HISTORY_BANDS, "History outside defined ranges") },
  ];
}
