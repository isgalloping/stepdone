import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NODE_STEPS: Array<{
  code: string;
  title: string;
  sequence: number;
  requiresUserInput: boolean;
  requiresUserDecision: boolean;
  requiresPayment: boolean;
  uiStep: number;
}> = [
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
];

const SKILL_DIMENSIONS = [
  { code: "GOAL_DEFINITION", name: "目标定义", description: "澄清用途与成功标准" },
  { code: "INFORMATION_RETRIEVAL", name: "信息检索", description: "寻找与筛选公开资料" },
  { code: "FACT_CHECKING", name: "事实核查", description: "核对来源与可信度" },
  { code: "COMPARATIVE_ANALYSIS", name: "比较分析", description: "识别关键差异" },
  { code: "STRUCTURED_EXPRESSION", name: "结构化表达", description: "组织可汇报的结论" },
  { code: "AI_COLLABORATION", name: "AI协作", description: "有效使用并修正 AI 建议" },
];

async function main() {
  const template = await prisma.projectTemplate.upsert({
    where: { code: "competitor-analysis" },
    update: { name: "竞品分析" },
    create: { code: "competitor-analysis", name: "竞品分析" },
  });

  const version = await prisma.projectTemplateVersion.upsert({
    where: {
      templateId_version: { templateId: template.id, version: 1 },
    },
    update: { status: "PUBLISHED" },
    create: {
      templateId: template.id,
      version: 1,
      status: "PUBLISHED",
      definition: { code: "competitor-analysis", version: 1 },
    },
  });

  for (const step of NODE_STEPS) {
    await prisma.projectTemplateStep.upsert({
      where: {
        templateVersionId_code: {
          templateVersionId: version.id,
          code: step.code,
        },
      },
      update: {
        title: step.title,
        sequence: step.sequence,
        requiresUserInput: step.requiresUserInput,
        requiresUserDecision: step.requiresUserDecision,
        requiresPayment: step.requiresPayment,
        uiStep: step.uiStep,
      },
      create: {
        templateVersionId: version.id,
        ...step,
      },
    });
  }

  await prisma.product.upsert({
    where: { code: "STANDARD_PROJECT" },
    update: { priceFen: 2900, name: "标准项目", active: true },
    create: {
      code: "STANDARD_PROJECT",
      name: "标准项目",
      priceFen: 2900,
      description: "完整分析报告、引用、质量检查、PDF、能力报告",
      active: true,
    },
  });

  await prisma.product.upsert({
    where: { code: "PRO_PROJECT" },
    update: { priceFen: 5900, name: "专业项目", active: true },
    create: {
      code: "PRO_PROJECT",
      name: "专业项目",
      priceFen: 5900,
      description: "标准全部内容 + PPTX + 重试与重生成",
      active: true,
    },
  });

  for (const dim of SKILL_DIMENSIONS) {
    await prisma.skillDimension.upsert({
      where: { code: dim.code },
      update: { name: dim.name, description: dim.description },
      create: dim,
    });
  }

  console.log("Seed complete: competitor-analysis@1, products, skill dimensions");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
