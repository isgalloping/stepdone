import { describe, expect, it } from "vitest";
import { aggregateParticipation, scoresFromParticipation } from "./ability-aggregate";

describe("ability aggregate", () => {
  it("sums decisions from mentor + judgments", () => {
    const p = aggregateParticipation({
      mentorAnswers: 2,
      judgments: 3,
      userVersions: 1,
      userSources: 1,
    });
    expect(p.decisions).toBe(5);
    expect(p.adopted).toBe(1);
    expect(p.sourcesAdded).toBe(1);
  });

  it("maps participation into skill scores", () => {
    const p = aggregateParticipation({
      mentorAnswers: 2,
      judgments: 3,
      userVersions: 1,
      userSources: 1,
    });
    const skills = scoresFromParticipation(p);
    expect(skills["目标定义"]).toBeGreaterThan(0);
    expect(skills["信息检索"]).toBeGreaterThan(0);
    expect(skills["事实核查"]).toBeGreaterThan(0);
    expect(skills["比较分析"]).toBeGreaterThan(0);
    expect(skills["结构化表达"]).toBeGreaterThan(0);
    expect(skills["AI协作"]).toBeGreaterThan(0);
    for (const score of Object.values(skills)) {
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("maps user versions to adopted and edited", () => {
    const p = aggregateParticipation({
      mentorAnswers: 0,
      judgments: 0,
      userVersions: 2,
      userSources: 0,
    });
    expect(p.adopted).toBe(2);
    expect(p.edited).toBe(2);
    expect(p.decisions).toBe(0);
    expect(p.sourcesAdded).toBe(0);
  });
});
