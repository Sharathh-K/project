export const ALLOCATION_FILTERS = [
  {
    key: "assigned_arm",
    label: "Recommendation",
    options: ["Mens E-Mail", "Womens E-Mail", "No E-Mail"].map((value) => ({ value, label: value })),
  },
  {
    key: "zip_code",
    label: "ZIP",
    options: ["Urban", "Suburban", "Rural"].map((value) => ({ value, label: value })),
  },
  {
    key: "channel",
    label: "Channel",
    options: ["Phone", "Web", "Multichannel"].map((value) => ({ value, label: value })),
  },
  {
    key: "newbie",
    label: "Newbie",
    options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  },
  {
    key: "uplift",
    label: "Best-arm uplift",
    options: [
      { value: "positive", label: "Positive" },
      { value: "nonpositive", label: "Zero or negative" },
    ],
  },
];

export function matchesAllocationFilter(row, column, value) {
  if (!column || !value) return true;
  if (column === "newbie") return value === "yes" ? Boolean(row.newbie) : !row.newbie;
  if (column === "uplift") {
    const bestUplift = Math.max(row.ite_mens ?? 0, row.ite_womens ?? 0);
    return value === "positive" ? bestUplift > 0 : bestUplift <= 0;
  }
  return row[column] === value;
}
