import test from "node:test";
import assert from "node:assert/strict";
import { parseLiveCSV, baselineRows } from "./live-data.mjs";
test("Live CSV preserves distinct leading-zero IDs and excludes outcome columns", () => {
  const csv =
    "customer_id,recency,history,mens,womens,newbie,zip_code,channel,visit\n001,3,100,1,0,0,Urban,Web,1\n1,4,200,0,1,1,Rural,Phone,0";
  const rows = baselineRows(parseLiveCSV(csv));
  assert.deepEqual(
    rows.map((r) => r.customer_id),
    ["001", "1"],
  );
  assert.equal(rows[0].history, 100);
  assert.equal("visit" in rows[0], false);
});
test("Live upload supplies optional row IDs and enforces batch limits", () => {
  assert.equal(
    baselineRows([{ customer_id: "  " }])[0].customer_id,
    "upload_0",
  );
  assert.throws(() => baselineRows([]));
  assert.throws(() => baselineRows(Array(5001).fill({})));
});
