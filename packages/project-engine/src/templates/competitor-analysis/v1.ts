import type { NodeCode } from "@stepdone/domain";

export type TemplateStepDef = {
  code: NodeCode;
  title: string;
  sequence: number;
  requiresUserInput: boolean;
  requiresUserDecision: boolean;
  requiresPayment: boolean;
  uiStep: 1 | 2 | 3 | 4 | 5 | 6;
};

export function getCompetitorAnalysisV1(): {
  code: "competitor-analysis";
  version: 1;
  steps: TemplateStepDef[];
} {
  return {
    code: "competitor-analysis",
    version: 1,
    steps: [
      {
        code: "DEFINE_OBJECTIVE",
        title: "明确目标",
        sequence: 1,
        requiresUserInput: true,
        requiresUserDecision: false,
        requiresPayment: false,
        uiStep: 1,
      },
      {
        code: "CREATE_PLAN",
        title: "制定计划",
        sequence: 2,
        requiresUserInput: false,
        requiresUserDecision: true,
        requiresPayment: false,
        uiStep: 2,
      },
      {
        code: "SELECT_COMPETITORS",
        title: "选择竞品",
        sequence: 3,
        requiresUserInput: false,
        requiresUserDecision: true,
        requiresPayment: false,
        uiStep: 3,
      },
      {
        code: "RESEARCH_SOURCES",
        title: "搜集资料",
        sequence: 4,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: false,
        uiStep: 4,
      },
      {
        code: "SELECT_DIMENSIONS",
        title: "选择比较维度",
        sequence: 5,
        requiresUserInput: false,
        requiresUserDecision: true,
        requiresPayment: false,
        uiStep: 5,
      },
      {
        code: "BUILD_MATRIX",
        title: "生成对比矩阵",
        sequence: 6,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: false,
        uiStep: 5,
      },
      {
        code: "USER_JUDGMENT",
        title: "形成关键判断",
        sequence: 7,
        requiresUserInput: false,
        requiresUserDecision: true,
        requiresPayment: false,
        uiStep: 5,
      },
      {
        code: "GENERATE_PREVIEW",
        title: "生成成果预览",
        sequence: 8,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: false,
        uiStep: 6,
      },
      {
        code: "PAYMENT_GATE",
        title: "付费闸门",
        sequence: 9,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: true,
        uiStep: 6,
      },
      {
        code: "GENERATE_REPORT",
        title: "生成完整报告",
        sequence: 10,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: true,
        uiStep: 6,
      },
      {
        code: "QUALITY_REVIEW",
        title: "质量检查",
        sequence: 11,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: true,
        uiStep: 6,
      },
      {
        code: "FINAL_CONFIRMATION",
        title: "最终确认",
        sequence: 12,
        requiresUserInput: false,
        requiresUserDecision: true,
        requiresPayment: true,
        uiStep: 6,
      },
      {
        code: "EXPORT",
        title: "导出成果",
        sequence: 13,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: true,
        uiStep: 6,
      },
      {
        code: "ABILITY_REPORT",
        title: "能力报告",
        sequence: 14,
        requiresUserInput: false,
        requiresUserDecision: false,
        requiresPayment: true,
        uiStep: 6,
      },
    ],
  };
}
