import type { NodeCode } from "@stepdone/domain";
import type { NodeResult } from "@stepdone/agent-core";

export type FixtureContext = {
  projectTitle: string;
  analysisTarget: string;
  metadata: Record<string, unknown>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runFixture(
  nodeCode: NodeCode,
  ctx: FixtureContext,
): Promise<NodeResult<unknown>> {
  const delay =
    nodeCode === "RESEARCH_SOURCES"
      ? 2000
      : nodeCode === "EXPORT"
        ? 1500
        : 800;
  await sleep(delay);

  const target = ctx.analysisTarget || "目标产品";

  switch (nodeCode) {
    case "CREATE_PLAN":
      return {
        type: "waiting_user",
        prompt: {
          question: "请确认项目计划后开始",
          options: ["确认计划并开始", "修改项目目标"],
        },
        partialOutput: {
          goal: `分析 3～5 款与「${target}」相关的竞品，形成面向汇报的竞品报告。`,
          deliverables: [
            "竞品对比矩阵",
            "核心差异分析",
            "产品机会建议",
            "PDF报告",
          ],
          steps: [
            {
              code: "DEFINE_OBJECTIVE",
              title: "明确目标",
              aiResponsibility: "澄清需求",
              userResponsibility: "确认用途和标准",
            },
            {
              code: "CREATE_PLAN",
              title: "制定计划",
              aiResponsibility: "生成分析框架",
              userResponsibility: "调整项目范围",
            },
            {
              code: "SELECT_COMPETITORS",
              title: "选择竞品",
              aiResponsibility: "推荐候选竞品",
              userResponsibility: "确认 3～5 个竞品",
            },
            {
              code: "RESEARCH_SOURCES",
              title: "搜集资料",
              aiResponsibility: "搜索、整理、引用",
              userResponsibility: "检查来源",
            },
            {
              code: "USER_JUDGMENT",
              title: "形成判断",
              aiResponsibility: "生成对比矩阵",
              userResponsibility: "选择重要结论",
            },
            {
              code: "GENERATE_PREVIEW",
              title: "成果交付",
              aiResponsibility: "生成、检查、导出",
              userResponsibility: "修改和确认",
            },
          ],
          estimatedMinutes: 45,
        },
      };
    case "SELECT_COMPETITORS":
      return {
        type: "waiting_user",
        prompt: {
          question: "请确认本次重点分析的竞品",
          options: ["确认这组竞品"],
        },
        partialOutput: {
          competitors: [
            {
              name: target,
              website: "https://example.com",
              positioning: "分析对象本身",
              recommendationReason: "你指定的分析对象",
              matchScore: 98,
              confidence: "HIGH",
            },
            {
              name: "竞品 Alpha",
              website: "https://alpha.example.com",
              positioning: "同赛道主流产品",
              recommendationReason: "市场份额接近",
              matchScore: 86,
              confidence: "HIGH",
            },
            {
              name: "竞品 Beta",
              website: "https://beta.example.com",
              positioning: "差异化挑战者",
              recommendationReason: "功能重叠度高",
              matchScore: 78,
              confidence: "MEDIUM",
            },
            {
              name: "竞品 Gamma",
              website: "https://gamma.example.com",
              positioning: "垂直场景切入",
              recommendationReason: "适合对照机会",
              matchScore: 72,
              confidence: "MEDIUM",
            },
          ],
          uncertainties: ["部分竞品公开定价可能已过期"],
        },
      };
    case "RESEARCH_SOURCES":
      return {
        type: "completed",
        output: {
          sources: [
            {
              title: `${target} 官网产品定位`,
              publisher: "官网",
              url: "https://example.com/about",
              credibility: "HIGH",
              summary: "官方产品定位与核心能力说明",
            },
            {
              title: "行业公开评测摘要",
              publisher: "媒体",
              url: "https://news.example.com/review",
              credibility: "MEDIUM",
              summary: "第三方功能与体验对比",
            },
            {
              title: "定价页快照",
              publisher: "官网",
              url: "https://example.com/pricing",
              credibility: "HIGH",
              summary: "公开套餐与价格",
            },
            {
              title: "用户口碑汇总",
              publisher: "社区",
              url: "https://forum.example.com/thread",
              credibility: "MEDIUM",
              summary: "常见好评与槽点",
            },
            {
              title: "竞品 Alpha 功能列表",
              publisher: "官网",
              url: "https://alpha.example.com/features",
              credibility: "HIGH",
              summary: "核心功能清单",
            },
            {
              title: "市场机会短评",
              publisher: "研究机构",
              url: "https://research.example.com/note",
              credibility: "LOW",
              summary: "趋势判断，需交叉验证",
            },
          ],
          completed: 6,
          total: 6,
        },
      };
    case "SELECT_DIMENSIONS":
      return {
        type: "waiting_user",
        prompt: {
          question: "请确认比较维度（至少 4 个，并标记 2 个最重要）",
        },
        partialOutput: {
          dimensions: [
            { name: "产品定位", reason: "决定对比起点" },
            { name: "目标用户", reason: "影响结论受众" },
            { name: "核心功能", reason: "产品差异主轴" },
            { name: "价格", reason: "商业决策常见关注点" },
            { name: "商业模式", reason: "适合老板汇报" },
            { name: "市场机会", reason: "输出可行动建议" },
          ],
        },
      };
    case "BUILD_MATRIX":
      return {
        type: "completed",
        output: {
          rows: [
            {
              dimension: "产品定位",
              cells: [
                {
                  competitor: target,
                  fact: "协作套件",
                  conclusion: "综合型",
                  confidence: "HIGH",
                },
                {
                  competitor: "竞品 Alpha",
                  fact: "团队效率工具",
                  conclusion: "效率导向",
                  confidence: "HIGH",
                },
                {
                  competitor: "竞品 Beta",
                  fact: "轻量沟通",
                  conclusion: "沟通优先",
                  confidence: "MEDIUM",
                },
              ],
            },
            {
              dimension: "价格",
              cells: [
                {
                  competitor: target,
                  fact: "按席位订阅",
                  conclusion: "中高价",
                  confidence: "MEDIUM",
                },
                {
                  competitor: "竞品 Alpha",
                  fact: "免费+增值",
                  conclusion: "获客强",
                  confidence: "HIGH",
                },
                {
                  competitor: "竞品 Beta",
                  fact: "低价套餐",
                  conclusion: "价格敏感",
                  confidence: "MEDIUM",
                },
              ],
            },
          ],
        },
      };
    case "USER_JUDGMENT":
      return {
        type: "waiting_user",
        prompt: {
          question: "请对以下观察形成你的判断",
          options: ["同意", "部分同意", "不同意", "修改结论"],
        },
        partialOutput: {
          judgments: [
            {
              id: "j1",
              observation: `${target} 在综合协作能力上更完整`,
              evidence: ["官网功能列表", "公开评测"],
              risk: "来源有限",
            },
            {
              id: "j2",
              observation: "竞品 Alpha 在免费获客上更激进",
              evidence: ["定价页"],
              risk: "可能已过期",
            },
            {
              id: "j3",
              observation: "差异主要体现在工作流深度而非单点功能",
              evidence: ["评测摘要"],
              risk: "需要用户确认",
            },
          ],
        },
      };
    case "GENERATE_PREVIEW":
      return {
        type: "completed",
        output: {
          coverTitle: `${ctx.projectTitle}（初稿预览）`,
          toc: ["项目背景", "竞品清单", "对比矩阵", "核心结论", "资料来源"],
          summary: `围绕「${target}」完成竞品分析初稿，完整结论需解锁后查看。`,
          qualityScore: 82,
          lockedSections: ["完整对比矩阵", "全部核心判断", "市场机会", "PDF导出"],
        },
      };
    case "GENERATE_REPORT":
      return {
        type: "completed",
        output: {
          type: "document",
          blocks: [
            { id: "b1", type: "heading", level: 1, text: ctx.projectTitle },
            {
              id: "b2",
              type: "paragraph",
              text: `本报告分析 ${target} 及其主要竞品的定位、功能与机会。`,
            },
            {
              id: "b3",
              type: "paragraph",
              text: "核心判断：产品差异主要体现在工作流深度与商业模式。",
            },
            { id: "b4", type: "citation", sourceId: "src_demo", text: "来源引用" },
          ],
        },
      };
    case "QUALITY_REVIEW":
      return {
        type: "completed",
        output: {
          scores: {
            accuracy: 88,
            completeness: 92,
            logic: 86,
            timeliness: 80,
            usability: 90,
            expression: 87,
            risk: 78,
          },
          issues: [
            {
              id: "q1",
              severity: "HIGH",
              dimension: "accuracy",
              message: `结论「${target} 的用户规模最大」缺少可靠来源`,
              status: "OPEN",
            },
            {
              id: "q2",
              severity: "MEDIUM",
              dimension: "timeliness",
              message: "部分定价信息来源时效性一般",
              status: "OPEN",
            },
            {
              id: "q3",
              severity: "LOW",
              dimension: "expression",
              message: "个别段落表述可更简洁",
              status: "OPEN",
            },
          ],
        },
      };
    case "ABILITY_REPORT":
      return {
        type: "completed",
        output: {
          participation: {
            decisions: 3,
            adopted: 2,
            edited: 1,
            sourcesAdded: 0,
          },
          narrative: "你在范围确认与关键判断上保持了主动，建议下次先独立列出候选竞品。",
        },
      };
    case "EXPORT":
      return {
        type: "completed",
        output: {
          format: "PDF",
          samplePath: "/samples/sample-report.pdf",
        },
      };
    default:
      return {
        type: "completed",
        output: { ok: true, nodeCode },
      };
  }
}
