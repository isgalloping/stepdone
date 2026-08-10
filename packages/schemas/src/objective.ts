import { z } from "zod";

export const ObjectiveInputSchema = z.object({
  title: z.string().trim().min(2).max(50),
  analysisTarget: z.string().trim().min(1).max(100),
  useCase: z.enum([
    "向老板汇报",
    "产品立项",
    "营销策划",
    "求职面试",
    "创业研究",
    "其他",
  ]),
  useCaseOther: z.string().trim().max(100).optional(),
  audience: z.enum([
    "自己使用",
    "直属领导",
    "客户",
    "面试官",
    "投资人",
    "团队成员",
    "其他",
  ]),
  audienceOther: z.string().trim().max(100).optional(),
  markets: z.array(z.string().trim().min(1)).min(1),
  deadline: z.string().trim().min(1),
  outputFormats: z
    .array(z.enum(["在线报告", "PDF", "PPT", "竞品对比表"]))
    .min(1),
  knownCompetitors: z.array(z.string().trim().min(1)).max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type ObjectiveInput = z.infer<typeof ObjectiveInputSchema>;
