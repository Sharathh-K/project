import { describe, expect, it } from "vitest";
import { profileCustomerRows, profileCustomerText, REQUIRED_COLUMNS } from "./dataQuality.js";

const validRow = (overrides = {}) => ({
  recency: "5",
  history: "120.5",
  mens: "1",
  womens: "0",
  newbie: "0",
  zip_code: "Urban",
  channel: "Web",
  customer_id: "C-1",
  ...overrides,
});

describe("customer data quality profiling", () => {
  it("counts empty required cells per column and reports their percentages", () => {
    const report = profileCustomerRows(
      REQUIRED_COLUMNS,
      [validRow({ recency: "" }), validRow({ recency: "3", history: "" })],
    );

    expect(report.checks.find((item) => item.id === "empty-recency")).toMatchObject({
      status: "fail",
      detail: "1 (50.00%)",
    });
    expect(report.checks.find((item) => item.id === "empty-history").detail).toBe("1 (50.00%)");
    expect(report.status).toBe("rejected");
  });

  it("reports invalid values in each column with CSV row examples", () => {
    const fields = [...REQUIRED_COLUMNS];
    const report = profileCustomerRows(fields, [
      validRow({ recency: "nope", mens: "2", zip_code: "Metro" }),
      validRow({ history: "-1", channel: "Store" }),
    ]);

    expect(report.checks.find((item) => item.id === "invalid-recency").detail)
      .toContain("example CSV rows 2");
    expect(report.checks.find((item) => item.id === "invalid-mens").detail)
      .toContain("example CSV rows 2");
    expect(report.checks.find((item) => item.id === "invalid-history").detail)
      .toContain("example CSV rows 3");
    expect(report.checks.find((item) => item.id === "invalid-zip_code").status).toBe("fail");
    expect(report.checks.find((item) => item.id === "invalid-channel").status).toBe("fail");
  });

  it("finds duplicate customer IDs and fully duplicated rows", () => {
    const duplicate = validRow({ customer_id: "DUP" });
    const report = profileCustomerRows(
      [...REQUIRED_COLUMNS, "customer_id"],
      [duplicate, { ...duplicate }, validRow({ customer_id: "OTHER" })],
    );

    expect(report.checks.find((item) => item.id === "duplicate-ids")).toMatchObject({
      status: "warn",
      detail: "Repeated IDs on rows 3",
    });
    expect(report.checks.find((item) => item.id === "duplicate-rows")).toMatchObject({
      status: "warn",
      detail: "Repeated rows 3",
    });
    expect(report.status).toBe("review");
  });

  it("flags ignored post-campaign outcome columns without sending them", () => {
    const report = profileCustomerRows(
      [...REQUIRED_COLUMNS, "segment", "visit", "conversion", "spend"],
      [validRow()],
    );

    expect(report.outcomeColumns).toEqual(["segment", "visit", "conversion", "spend"]);
    expect(report.checks.find((item) => item.id === "ignored-columns").detail)
      .toContain("conversion (post-campaign outcome: ignored and never sent to the API)");
  });

  it("warns when fewer than 500 rows are available for drift checking", () => {
    const report = profileCustomerRows(REQUIRED_COLUMNS, [validRow()]);

    expect(report.checks.find((item) => item.id === "drift-minimum").status).toBe("warn");
    expect(report.warningCount).toBe(1);
    expect(report.status).toBe("review");
  });

  it("returns a rejected-file quality report with all row problems", () => {
    const report = profileCustomerText(
      "recency,history,mens,womens,newbie,zip_code,channel,Customer ID,extra\n" +
      ",-3,2,0,0,Metro,Store,C-1,x\n" +
      "4,20,0,1,0,Urban,Web,C-1,x\n",
    );

    expect(report.status).toBe("rejected");
    expect(report.checks.find((item) => item.id === "empty-recency").detail).toBe("1 (50.00%)");
    expect(report.checks.find((item) => item.id === "invalid-history").detail).toContain("example CSV rows 2");
    expect(report.checks.find((item) => item.id === "invalid-mens").detail).toContain("example CSV rows 2");
    expect(report.checks.find((item) => item.id === "invalid-zip_code").status).toBe("fail");
    expect(report.checks.find((item) => item.id === "duplicate-ids").status).toBe("warn");
    expect(report.ignoredColumns).toContain("extra");
  });
});
