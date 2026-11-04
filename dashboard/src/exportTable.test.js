import { describe, expect, it } from "vitest";
import {
  buildCsv,
  EXPORT_HEADERS,
  isExportDisabled,
  limitPdfRows,
  mapAllocationRows,
} from "./exportTable.js";

const sample = {
  customer_id: "C-1",
  zip_code: "Urban",
  channel: "Web",
  newbie: 1,
  assigned_arm: "Mens E-Mail",
  ite_mens: 0.00345678,
  ite_womens: 0.00456789,
  expected_revenue: 1.234,
  cost: 0.1,
};

describe("allocation exports", () => {
  it("uses the required column order and converts uplifts to percentage points", () => {
    expect(EXPORT_HEADERS).toEqual([
      "Customer ID",
      "ZIP",
      "Channel",
      "Newbie (Yes/No)",
      "Recommendation",
      "Mens uplift (pp)",
      "Womens uplift (pp)",
      "Best-arm uplift (pp)",
      "Est. revenue (assigned arm) ($)",
      "Cost ($)",
    ]);
    expect(mapAllocationRows([sample])[0]).toEqual([
      "C-1",
      "Urban",
      "Web",
      "Yes",
      "Mens E-Mail",
      0.3457,
      0.4568,
      0.4568,
      1.23,
      0.1,
    ]);
  });

  it("builds UTF-8-BOM CSV with RFC 4180 quoting and CRLF records", () => {
    const csv = buildCsv([{ ...sample, customer_id: 'C,"1"\nnext' }]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"C,""1""\nnext"');
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("prefixes formula-like text cells to prevent spreadsheet injection", () => {
    const csv = buildCsv([{ ...sample, customer_id: "=1+1" }]);
    expect(csv).toContain("'=1+1");
    expect(buildCsv([{ ...sample, customer_id: "-123" }])).toContain("\r\n-123,Urban");
  });

  it("limits PDF data to the first 1,000 current-view rows", () => {
    const rows = Array.from({ length: 1200 }, (_, index) => ({ customer_id: String(index) }));
    const limited = limitPdfRows(rows);

    expect(limited.rows).toHaveLength(1000);
    expect(limited.rows[0].customer_id).toBe("0");
    expect(limited.rows[999].customer_id).toBe("999");
    expect(limited.totalRows).toBe(1200);
    expect(limited.truncated).toBe(true);
    expect(limitPdfRows(rows.slice(0, 1000)).truncated).toBe(false);
  });

  it("disables download controls only when the current view has no rows", () => {
    expect(isExportDisabled([])).toBe(true);
    expect(isExportDisabled([sample])).toBe(false);
  });
});
