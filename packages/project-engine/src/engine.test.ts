import { describe, it, expect } from "vitest";
import { assertCanStartNode, getTemplateV1 } from "./engine";

describe("assertCanStartNode", () => {
  const report = getTemplateV1().steps.find((s) => s.code === "GENERATE_REPORT")!;

  it("blocks GENERATE_REPORT without entitlement", () => {
    expect(() =>
      assertCanStartNode({
        projectStatus: "ACTIVE",
        previousStepStatus: "SUCCEEDED",
        node: report,
        hasPaidEntitlement: false,
      }),
    ).toThrow(/ENTITLEMENT_REQUIRED/);
  });

  it("allows GENERATE_REPORT with entitlement when previous succeeded", () => {
    expect(() =>
      assertCanStartNode({
        projectStatus: "ACTIVE",
        previousStepStatus: "SUCCEEDED",
        node: report,
        hasPaidEntitlement: true,
      }),
    ).not.toThrow();
  });
});
