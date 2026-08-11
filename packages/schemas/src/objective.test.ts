import { describe, it, expect } from "vitest";
import { ObjectiveInputSchema } from "./objective";

const valid = {
  title: "智能记账App竞品分析",
  analysisTarget: "飞书",
  useCase: "向老板汇报" as const,
  audience: "直属领导" as const,
  markets: ["中国大陆"],
  deadline: "一周内",
  outputFormats: ["PDF" as const],
};

describe("ObjectiveInputSchema", () => {
  it("rejects title shorter than 2", () => {
    const r = ObjectiveInputSchema.safeParse({ ...valid, title: "a" });
    expect(r.success).toBe(false);
  });

  it("accepts valid payload", () => {
    const r = ObjectiveInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });
});
