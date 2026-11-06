import { describe, expect, it } from "vitest";
import { buildSegmentSummaries } from "./segmentSummary.js";

describe("buildSegmentSummaries", () => {
  it("groups band boundaries into non-overlapping fixed ranges and reports selection rates", () => {
    const allocations = [3, 4, 6, 7, 9, 10, 12].map((recency, index) => ({
      zip_code: index < 5 ? "Urban" : "Rural",
      channel: index % 2 ? "Web" : "Phone",
      newbie: index < 3 ? 1 : 0,
      recency,
      history: [99.99, 100, 249.99, 250, 499.99, 500, 1000][index],
      ite_mens: index / 100,
      ite_womens: index / 200,
      assigned_arm: index < 4 ? "Mens E-Mail" : "No E-Mail",
    }));

    const summaries = buildSegmentSummaries(allocations);
    const urban = summaries.find((summary) => summary.key === "zip_code").groups.find((group) => group.label === "Urban");
    const recency = summaries.find((summary) => summary.key === "recency").groups;
    const history = summaries.find((summary) => summary.key === "history").groups;

    expect(summaries).toHaveLength(5);
    expect(urban).toMatchObject({
      customers: 5,
      selected: 4,
      selectedPercent: 80,
      isSmallGroup: true,
      mens: 0.02,
      womens: 0.01,
    });
    expect(recency.map(({ label, customers }) => [label, customers])).toEqual([
      ["Recency 1–3", 1],
      ["Recency 4–6", 2],
      ["Recency 7–9", 2],
      ["Recency 10–12", 2],
    ]);
    expect(history.map(({ label, customers }) => [label, customers])).toEqual([
      ["History $0–<$100", 1],
      ["History $100–<$250", 2],
      ["History $250–<$500", 2],
      ["History $500–<$1,000", 1],
      ["History $1,000+", 1],
    ]);
    expect(summaries.find((summary) => summary.key === "newbie").groups.map((group) => group.label))
      .toEqual(["New customer", "Returning customer"]);
  });

  it("returns empty groups when no allocations are present", () => {
    expect(buildSegmentSummaries([]).every((summary) => summary.groups.length === 0)).toBe(true);
  });

  it("keeps numeric values outside the fixed bands visible", () => {
    const summaries = buildSegmentSummaries([{
      recency: 13,
      history: 5000,
      zip_code: "Rural",
      channel: "Web",
      newbie: 0,
      ite_mens: 0,
      ite_womens: 0,
      assigned_arm: "No E-Mail",
    }]);

    expect(summaries.find((summary) => summary.key === "recency").groups[0].label)
      .toBe("Recency outside 1–12");
    expect(summaries.find((summary) => summary.key === "history").groups[0].label)
      .toBe("History $1,000+");
  });
});
