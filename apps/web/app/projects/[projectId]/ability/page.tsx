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
    skills?: Record<string, number>;
    narrative?: string;
  };
  const p = output.participation;
  const skills = output.skills;
  const skillKeys = skills ? Object.keys(skills) : [];
  const isLoading = steps.isLoading;
  const isGenerating =
    !isLoading &&
    (!run || run.status === "QUEUED" || run.status === "RUNNING");
  const hasData = Boolean(p && skills && skillKeys.length > 0);
  const aiRate = p
    ? Math.round((p.adopted / Math.max(p.decisions + p.edited, 1)) * 100)
    : 0;

  const option = hasData
    ? {
        radar: {
          indicator: skillKeys.map((name) => ({ name, max: 100 })),
        },
        series: [
          {
            type: "radar",
            data: [
              {
                value: skillKeys.map((k) => skills![k] ?? 0),
                name: "本次项目",
              },
            ],
            areaStyle: { opacity: 0.2 },
          },
        ],
      }
    : null;

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={<p>能力报告反映协作过程，不是考试成绩。</p>}
    >
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>能力报告</h1>
        {isLoading || isGenerating ? (
          <p className="sd-muted">能力报告生成中…</p>
        ) : null}
        {!isLoading && !isGenerating && !hasData ? (
          <p className="sd-muted">暂无数据</p>
        ) : null}
        {hasData && p ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10,
              }}
            >
              <div className="sd-card">判断 {p.decisions}</div>
              <div className="sd-card">采用 {p.adopted}</div>
              <div className="sd-card">修改 {p.edited}</div>
              <div className="sd-card">新增资料 {p.sourcesAdded}</div>
              <div className="sd-card">AI 参与度约 {aiRate}%</div>
            </div>
            {option ? (
              <div style={{ height: 320, marginTop: 16 }}>
                <ReactECharts option={option} style={{ height: "100%" }} />
              </div>
            ) : null}
            <p>
              {output.narrative ??
                "下次可以尝试在 AI 推荐竞品前，先独立写出你认为最重要的三个竞品。"}
            </p>
            <Link href="/projects/new" className="sd-btn">
              创建下一个项目
            </Link>
          </>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
