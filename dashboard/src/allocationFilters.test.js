import { describe, expect, it } from "vitest";
import { ALLOCATION_FILTERS, matchesAllocationFilter } from "./allocationFilters.js";

describe("customer allocation filters", () => {
  it("offers a two-stage field and value selection", () => {
    expect(ALLOCATION_FILTERS.map(({ key }) => key)).toEqual([
      "assigned_arm",
      "zip_code",
      "channel",
      "newbie",
      "uplift",
    ]);
    expect(ALLOCATION_FILTERS.find(({ key }) => key === "zip_code").options)
      .toEqual(["Urban", "Suburban", "Rural"].map((value) => ({ value, label: value })));
  });

  it("matches the selected customer feature", () => {
    expect(matchesAllocationFilter({ zip_code: "Urban" }, "zip_code", "Urban")).toBe(true);
    expect(matchesAllocationFilter({ zip_code: "Rural" }, "zip_code", "Urban")).toBe(false);
    expect(matchesAllocationFilter({ newbie: 1 }, "newbie", "yes")).toBe(true);
    expect(matchesAllocationFilter({ newbie: 0 }, "newbie", "no")).toBe(true);
  });

  it("filters uplift using the larger arm estimate", () => {
    expect(matchesAllocationFilter({ ite_mens: -0.1, ite_womens: 0.3 }, "uplift", "positive")).toBe(true);
    expect(matchesAllocationFilter({ ite_mens: -0.1, ite_womens: 0 }, "uplift", "nonpositive")).toBe(true);
  });
});
