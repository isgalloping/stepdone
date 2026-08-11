export type MentorStepKey =
  | "plan"
  | "competitors"
  | "sources"
  | "dimensions"
  | "matrix"
  | "decisions"
  | "preview"
  | "report"
  | "quality"
  | "ability";

export type MentorQuestion = {
  id: string;
  question: string;
  options: Array<{ id: string; label: string }>;
};

const SCRIPTS: Record<MentorStepKey, MentorQuestion[]> = {
  plan: [
    {
      id: "plan_scope",
      question: "这个计划的范围是否够你向老板汇报？",
      options: [
        { id: "ok", label: "够用，继续" },
        { id: "narrow", label: "需要再收窄" },
      ],
    },
    {
      id: "plan_focus",
      question: "你更希望计划先强调交付物，还是先强调竞品对比？",
      options: [
        { id: "deliverables", label: "先交付物" },
        { id: "competitors", label: "先竞品对比" },
      ],
    },
  ],
  competitors: [
    {
      id: "competitors_count",
      question: "当前竞品数量是否落在 3～5 个舒适区？",
      options: [
        { id: "ok", label: "刚好" },
        { id: "too_many", label: "偏多，想精简" },
      ],
    },
  ],
  sources: [
    {
      id: "sources_trust",
      question: "资料里是否已有足够 HIGH 可信度来源支撑结论？",
      options: [
        { id: "ok", label: "够用" },
        { id: "need_more", label: "还要补" },
      ],
    },
  ],
  dimensions: [
    {
      id: "dimensions_boss",
      question: "面向老板时，是否保留了「商业模式」和「市场机会」？",
      options: [
        { id: "yes", label: "已保留" },
        { id: "add", label: "还要补上" },
      ],
    },
  ],
  matrix: [
    {
      id: "matrix_diff",
      question: "矩阵里最醒目的差异，是否值得写进判断页？",
      options: [
        { id: "yes", label: "值得" },
        { id: "later", label: "先看看再说" },
      ],
    },
  ],
  decisions: [
    {
      id: "decisions_confirm",
      question: "AI 候选判断里，哪条最接近你真正想写的结论？",
      options: [
        { id: "adopt", label: "接近，准备确认" },
        { id: "rewrite", label: "要改写后再确认" },
      ],
    },
    {
      id: "decisions_risk",
      question: "这条结论是否需要标注不确定性或证据缺口？",
      options: [
        { id: "yes", label: "需要标注" },
        { id: "no", label: "证据够硬" },
      ],
    },
  ],
  preview: [
    {
      id: "preview_value",
      question: "预览内容是否已体现你愿意付费解锁的价值？",
      options: [
        { id: "yes", label: "已体现" },
        { id: "not_yet", label: "还不够" },
      ],
    },
  ],
  report: [
    {
      id: "report_tone",
      question: "报告语气是否适合直接发给老板？",
      options: [
        { id: "ok", label: "可以直接发" },
        { id: "soften", label: "再克制一点" },
      ],
    },
    {
      id: "report_action",
      question: "结尾是否留下一条可执行的下一步建议？",
      options: [
        { id: "yes", label: "有" },
        { id: "add", label: "还要补" },
      ],
    },
  ],
  quality: [
    {
      id: "quality_blockers",
      question: "高风险质量问题是否已处理到可交付程度？",
      options: [
        { id: "ready", label: "可以交付" },
        { id: "fix", label: "还要修" },
      ],
    },
  ],
  ability: [
    {
      id: "ability_read",
      question: "能力报告是否按「协作过程」而非「考试成绩」来阅读？",
      options: [
        { id: "yes", label: "是的" },
        { id: "reframe", label: "需要换个角度看" },
      ],
    },
  ],
};

export function getMentorScript(step: MentorStepKey): MentorQuestion[] {
  return SCRIPTS[step] ?? [];
}

/** Index of the next unanswered question, or -1 when done. */
export function nextMentorIndex(
  answeredIds: string[],
  step: MentorStepKey,
): number {
  const answered = new Set(answeredIds);
  const script = getMentorScript(step);
  return script.findIndex((q) => !answered.has(q.id));
}

export const MENTOR_STEP_KEYS = Object.keys(SCRIPTS) as MentorStepKey[];

export function isMentorStepKey(value: string): value is MentorStepKey {
  return value in SCRIPTS;
}
