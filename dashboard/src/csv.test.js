import { describe, expect, it } from "vitest";
import { parseCustomerCsv } from "./csv.js";

function csvFile(contents, name = "customers.csv") {
  return new File([contents], name, { type: "text/csv" });
}

describe("parseCustomerCsv", () => {
  it("maps the project dataset headers and ignores post-campaign outcome columns", async () => {
    const [customer] = await parseCustomerCsv(csvFile(
      "recency,history,mens,womens,zip_code,newbie,channel,segment,visit,conversion,spend,Customer ID,history_floor\n" +
      "1,456.0,0,1,Suburban,0,Web,No E-Mail,0,0,0.0,C-43252,0",
    ));

    expect(customer).toEqual({
      recency: 1,
      history: 456,
      mens: 0,
      womens: 1,
      newbie: 0,
      zip_code: "Suburban",
      channel: "Web",
      customer_id: "C-43252",
      history_floor: 0,
    });
    expect(customer).not.toHaveProperty("conversion");
  });

  it("accepts a customer_id and lets the API derive a missing history_floor", async () => {
    const [customer] = await parseCustomerCsv(csvFile(
      "customer_id,recency,history,mens,womens,newbie,zip_code,channel\n" +
      "cust-1,2,29.99,1,0,1,Urban,Phone",
    ));

    expect(customer.customer_id).toBe("cust-1");
    expect(customer).not.toHaveProperty("history_floor");
  });

  it("rejects a CSV missing model features", async () => {
    await expect(
      parseCustomerCsv(csvFile("recency,history,mens\n1,42,0")),
    ).rejects.toThrow("Missing required CSV columns: womens, newbie, zip_code, channel.");
  });

  it("identifies invalid row values before sending them to the API", async () => {
    await expect(
      parseCustomerCsv(csvFile(
        "recency,history,mens,womens,newbie,zip_code,channel\n" +
        "1,42,2,0,0,Urban,Phone",
      )),
    ).rejects.toThrow('Row 2: "mens" must be 0 or 1.');
  });

  it("rejects non-CSV files", async () => {
    await expect(parseCustomerCsv(csvFile("data", "customers.txt"))).rejects.toThrow(
      "Choose a CSV file to continue.",
    );
  });
});
