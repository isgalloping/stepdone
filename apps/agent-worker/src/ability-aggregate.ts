export type ParticipationInput = {
  mentorAnswers: number;
  judgments: number;
  userVersions: number;
  userSources: number;
};

export type Participation = {
  decisions: number;
  adopted: number;
  edited: number;
  sourcesAdded: number;
};

/**
 * Map raw project activity counts into ability-report participation.
 * USER artifact versions cannot yet distinguish adopt vs edit — both fields
 * receive the same count so the UI surfaces non-zero engagement.
 */
export function aggregateParticipation(input: ParticipationInput): Participation {
  return {
    decisions: input.mentorAnswers + input.judgments,
    adopted: input.userVersions,
    edited: input.userVersions,
    sourcesAdded: input.userSources,
  };
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Derive dimension scores (Chinese names) from participation counts. */
export function scoresFromParticipation(
  p: ReturnType<typeof aggregateParticipation>,
): Record<string, number> {
  const base = 55;
  return {
    目标定义: clampScore(base + p.decisions * 5),
    信息检索: clampScore(base + p.sourcesAdded * 10 + p.decisions * 2),
    事实核查: clampScore(base + p.decisions * 3 + p.sourcesAdded * 5),
    比较分析: clampScore(base + p.decisions * 6),
    结构化表达: clampScore(base + p.edited * 8 + p.adopted * 3),
    AI协作: clampScore(base + p.adopted * 10 + p.edited * 4 + p.decisions * 2),
  };
}
