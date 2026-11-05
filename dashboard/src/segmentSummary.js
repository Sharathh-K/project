const DIMENSIONS = [
  { key: "zip_code", label: "ZIP code" },
  { key: "channel", label: "Channel" },
  { key: "newbie", label: "New customer" },
];

function summarizeGroups(groups) {
  return [...groups.entries()]
    .map(([label, rows]) => ({
      label,
      customers: rows.length,
      selected: rows.filter((row) => row.assigned_arm !== "No E-Mail").length,
      mens: rows.reduce((sum, row) => sum + (row.ite_mens ?? 0), 0) / rows.length,
      womens: rows.reduce((sum, row) => sum + (row.ite_womens ?? 0), 0) / rows.length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
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

function bandGroups(rows, key, label) {
  const sorted = rows
    .filter((row) => Number.isFinite(Number(row[key])))
    .sort((a, b) => Number(a[key]) - Number(b[key]));
  if (!sorted.length) return [];

  const bandCount = Math.min(5, sorted.length);
  const groups = Array.from({ length: bandCount }, (_, index) => {
    const start = Math.floor(index * sorted.length / bandCount);
    const end = Math.floor((index + 1) * sorted.length / bandCount);
    const members = sorted.slice(start, end);
    const first = Number(members[0][key]);
    const last = Number(members[members.length - 1][key]);
    const range = first === last ? String(first) : `${first}–${last}`;
    return [`${label} band ${index + 1} (${range})`, members];
  });
  return summarizeGroups(new Map(groups));
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
    { key: "recency", label: "Recency bands", groups: bandGroups(rows, "recency", "Recency") },
    { key: "history", label: "History bands", groups: bandGroups(rows, "history", "History") },
  ];
}
