import { describe, expect, it } from "vitest";
import { getWorkflowStatuses } from "./WorkflowStatus.jsx";

const initialState = {
  customers: [],
  quality: null,
  drift: { status: "idle", data: null },
  result: null,
  exported: false,
};

describe("getWorkflowStatuses", () => {
  it("marks rejected uploads for review", () => {
    expect(getWorkflowStatuses({
      ...initialState,
      quality: { status: "rejected" },
    }).uploadStatus).toBe("needs-review");
  });

  it.each([
    ["unavailable", null, "unavailable"],
    ["done", { status: "alert" }, "needs-review"],
    ["done", { status: "watch" }, "needs-review"],
    ["done", { status: "insufficient_data" }, "needs-review"],
    ["done", { status: "ok" }, "done"],
  ])("maps drift status %s / %s to %s", (status, data, expected) => {
    expect(getWorkflowStatuses({
      ...initialState,
      customers: [{ customer_id: "1" }],
      drift: { status, data },
    }).driftStatus).toBe(expected);
  });
});
