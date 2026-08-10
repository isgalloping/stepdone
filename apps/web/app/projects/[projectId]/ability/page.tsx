"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function AbilityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "ABILITY_REPORT")
    : undefined;
  const output = (run?.output ?? {}) as {
    participation?: {
      decisions: number;
      adopted: number;
      edited: number;
      sourcesAdded: number;
    };
    narrative?: string;
  };
  const p = output.participation ?? {
    decisions: 3,
    adopted: 2,
    edited: 1,
    sourcesAdded: 0,
  };

  const option = {
    radar: {
      indicator: [
        { name: "目标定义", max: 100 },
        { name: "信息检索", max: 100 },
        { name: "事实核查", max: 100 },
        { name: "比较分析", max: 100 },
        { name: "结构化表达", max: 100 },
        { name: "AI协作", max: 100 },
      ],
    },
    series: [
      {
        type: "radar",
        data: [{ value: [80, 70, 75, 85, 78, 82], name: "本次项目" }],
        areaStyle: { opacity: 0.2 },
      },
    ],
  };

  return (
    <WorkspaceShell projectId={projectId} mentor={<p>能力报告反映协作过程，不是考试成绩。</p>}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>能力报告</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          <div className="sd-card">判断 {p.decisions}</div>
          <div className="sd-card">采用 {p.adopted}</div>
          <div className="sd-card">修改 {p.edited}</div>
          <div className="sd-card">新增资料 {p.sourcesAdded}</div>
        </div>
        <div style={{ height: 320, marginTop: 16 }}>
          <ReactECharts option={option} style={{ height: "100%" }} />
        </div>
        <p>{output.narrative ?? "下次可以尝试在 AI 推荐竞品前，先独立写出你认为最重要的三个竞品。"}</p>
        <Link href="/projects/new" className="sd-btn">
          创建下一个项目
        </Link>
      </div>
    </WorkspaceShell>
  );
}
