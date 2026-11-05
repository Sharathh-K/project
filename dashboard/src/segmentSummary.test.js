import { describe, expect, it } from "vitest";
import { buildSegmentSummaries } from "./segmentSummary.js";

describe("buildSegmentSummaries", () => {
  it("summarizes uplift by customer dimensions and five ordered numeric bands", () => {
    const allocations = Array.from({ length: 10 }, (_, index) => ({
      zip_code: index < 5 ? "Urban" : "Rural",
      channel: index % 2 ? "Web" : "Phone",
      newbie: index < 3 ? 1 : 0,
      recency: index,
      history: index * 10,
      ite_mens: index / 100,
      ite_womens: index / 200,
      assigned_arm: index < 4 ? "Mens E-Mail" : "No E-Mail",
    }));

    const summaries = buildSegmentSummaries(allocations);
    const urban = summaries.find((summary) => summary.key === "zip_code").groups.find((group) => group.label === "Urban");
    const recency = summaries.find((summary) => summary.key === "recency").groups;

    expect(summaries).toHaveLength(5);
    expect(urban).toMatchObject({ customers: 5, selected: 4, mens: 0.02, womens: 0.01 });
    expect(recency).toHaveLength(5);
    expect(recency.map((group) => group.customers)).toEqual([2, 2, 2, 2, 2]);
    expect(summaries.find((summary) => summary.key === "newbie").groups.map((group) => group.label))
      .toEqual(["New customer", "Returning customer"]);
  });

  it("returns empty groups when no allocations are present", () => {
    expect(buildSegmentSummaries([]).every((summary) => summary.groups.length === 0)).toBe(true);
  });
});
