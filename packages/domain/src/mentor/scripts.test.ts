import { describe, expect, it } from "vitest";
import { getMentorScript, nextMentorIndex } from "./scripts";
import { assertMentorIntent, mentorReply } from "./intents";

describe("mentor scripts", () => {
  it("has at least one question per core step", () => {
    for (const step of [
      "plan",
      "competitors",
      "sources",
      "decisions",
      "report",
    ] as const) {
      expect(getMentorScript(step).length).toBeGreaterThan(0);
    }
  });

  it("returns -1 when all answered", () => {
    const qs = getMentorScript("plan");
    expect(nextMentorIndex(qs.map((q) => q.id), "plan")).toBe(-1);
  });

  it("returns 0 when none answered", () => {
    expect(nextMentorIndex([], "plan")).toBe(0);
  });

  it("advances after the first answer", () => {
    const qs = getMentorScript("plan");
    expect(nextMentorIndex([qs[0]!.id], "plan")).toBe(1);
  });
});

describe("mentor intents", () => {
  it("rejects unknown intents", () => {
    expect(() => assertMentorIntent("delete_all")).toThrow(/VALIDATION_ERROR/);
  });

  it("returns rewrite suggestion with selection", () => {
    expect(mentorReply("rewrite", "市场份额上升")).toContain("市场份额上升");
  });
});
