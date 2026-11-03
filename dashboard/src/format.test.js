import { describe, expect, it } from "vitest";
import { defaultBudgetForCustomerCount, formatCurrency } from "./format.js";

describe("campaign formatting", () => {
  it("suggests a budget of $0.025 per uploaded customer", () => {
    expect(defaultBudgetForCustomerCount(1)).toBe("0.03");
    expect(defaultBudgetForCustomerCount(12_800)).toBe("320.00");
    expect(defaultBudgetForCustomerCount(0)).toBe("0.00");
  });

  it("formats the revenue-per-conversion assumption as currency", () => {
    expect(formatCurrency(125.5)).toBe("$125.50");
  });
});
