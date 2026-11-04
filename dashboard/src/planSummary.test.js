import { describe, expect, it } from "vitest";
import { buildPlanSummary } from "./planSummary.js";

function makeSummary(overrides = {}) {
  return {
    total_cost: 319.95,
    blanket_mens_cost: 1280,
    cost_saving_vs_blanket_mens: 960.05,
    mens_emails: 3199,
    womens_emails: 0,
    n_persuadables: 3199,
    n_customers: 12800,
    total_expected_revenue: 2264.217,
    ...overrides,
  };
}

describe("buildPlanSummary", () => {
  it("summarizes savings, allocation, extra purchases and the honest caveat", () => {
    const sentences = buildPlanSummary(makeSummary(), 113.83);

    expect(sentences).toHaveLength(4);
    expect(sentences[0]).toContain("costs $319.95 instead of $1,280.00");
    expect(sentences[0]).toContain("saving $960.05");
    expect(sentences[1]).toContain("3,199 Mens e-mails and 0 Womens e-mails");
    expect(sentences[1]).toContain("to 3,199 of 12,800 customers (25.0%)");
    expect(sentences[2]).toContain("about 20 extra purchases");
    expect(sentences[2]).toContain("$113.83 per conversion");
    expect(sentences[3]).toContain("model estimates");
    expect(sentences.join(" ")).not.toMatch(/\bguaranteed\b|\bwill\b/i);
  });

  it("says no customers were selected and nothing is spent", () => {
    const [cost, allocation] = buildPlanSummary(makeSummary({
      total_cost: 0,
      cost_saving_vs_blanket_mens: 1280,
      mens_emails: 0,
      womens_emails: 0,
      n_persuadables: 0,
      total_expected_revenue: 0,
    }), 113.83);

    expect(cost).toContain("saving $1,280.00");
    expect(allocation).toContain("No customers were selected and nothing is spent");
    expect(allocation).toContain("12,800 customers remain");
  });

  it("handles zero savings and negative savings", () => {
    const [zeroSaving] = buildPlanSummary(makeSummary({
      total_cost: 1280,
      cost_saving_vs_blanket_mens: 0,
    }), 113.83);
    const [negativeSaving] = buildPlanSummary(makeSummary({
      total_cost: 1290,
      cost_saving_vs_blanket_mens: -10,
    }), 113.83);

    expect(zeroSaving).toContain("saving $0.00");
    expect(negativeSaving).toContain("$10.00 more than the $1,280.00");
  });

  it("uses singular labels for one customer and rounds fractional expected purchases", () => {
    const sentences = buildPlanSummary(makeSummary({
      total_cost: 0.1,
      blanket_mens_cost: 0.1,
      cost_saving_vs_blanket_mens: 0,
      mens_emails: 1,
      womens_emails: 0,
      n_persuadables: 1,
      n_customers: 1,
      total_expected_revenue: 5.25,
    }), 10);

    expect(sentences[1]).toContain("1 Mens e-mail and 0 Womens e-mails");
    expect(sentences[1]).toContain("1 of 1 customer (100.0%)");
    expect(sentences[2]).toContain("0.5 extra purchases");
  });

  it("uses singular purchase wording when a rounded estimate is one", () => {
    const [, , sentence] = buildPlanSummary(makeSummary({
      total_expected_revenue: 9.9,
    }), 10);
    expect(sentence).toContain("1.0 extra purchase");
  });

  it("reports actual spend when budget is not fully used", () => {
    const [sentence] = buildPlanSummary(makeSummary({
      total_cost: 75,
      blanket_mens_cost: 300,
      cost_saving_vs_blanket_mens: 225,
    }), 113.83);

    expect(sentence).toContain("This plan costs $75.00");
    expect(sentence).not.toContain("$100.00 budget");
  });
});
