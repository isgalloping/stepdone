const ALLOWED = new Set(["rewrite", "shorten", "explain_source"]);

export type MentorAskIntent = "rewrite" | "shorten" | "explain_source";

export function assertMentorIntent(intent: string): asserts intent is MentorAskIntent {
  if (!ALLOWED.has(intent)) {
    throw new Error("VALIDATION_ERROR: invalid intent");
  }
}

export function mentorReply(intent: string, selection = ""): string {
  assertMentorIntent(intent);
  if (intent === "rewrite") {
    return `建议改写：将表述更克制。原文片段：${selection || "（未选中）"}`;
  }
  if (intent === "shorten") {
    return "建议缩短：保留核心差异与一条行动建议。";
  }
  return "该结论可对照资料页中可信度 HIGH 的来源复核时效。";
}

export function isMentorAskStep(step: string): boolean {
  return step === "decisions" || step === "report";
}
