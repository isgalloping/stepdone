"use client";

import { useParams, useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";
import { api } from "@/lib/api-client";
import { useState } from "react";

export default function PlanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const plan = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "CREATE_PLAN")
    : undefined;
  const output = (plan?.output ?? {}) as {
    goal?: string;
    deliverables?: string[];
    steps?: Array<{ title: string; aiResponsibility: string; userResponsibility: string }>;
    estimatedMinutes?: number;
    prompt?: { question: string };
  };
  const ready = plan?.status === "WAITING_USER" || Boolean(output.goal);

  async function confirm() {
    setLoading(true);
    const res = await api(`/api/projects/${projectId}/steps/CREATE_PLAN/decision`, {
      method: "POST",
      body: JSON.stringify({ action: "CONFIRM_PLAN" }),
    });
    setLoading(false);
    if (res.success) router.push(`/projects/${projectId}/competitors`);
  }

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={
        <p>
          {output.prompt?.question ??
            "计划生成后，请确认范围再开始。你仍可稍后调整关注点。"}
        </p>
      }
    >
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>你的项目计划已生成</h1>
        {!ready ? (
          <p className="sd-muted" data-testid="plan-loading">
            正在生成项目计划…
          </p>
        ) : (
          <div data-testid="plan-ready">
            <h3>项目目标</h3>
            <p>{output.goal}</p>
            <h3>预计成果</h3>
            <ul>
              {(output.deliverables ?? []).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <h3>六个项目步骤</h3>
            <ol>
              {(output.steps ?? []).map((s) => (
                <li key={s.title} style={{ marginBottom: 8 }}>
                  <strong>{s.title}</strong>
                  <div className="sd-muted">
                    AI：{s.aiResponsibility} · 你：{s.userResponsibility}
                  </div>
                </li>
              ))}
            </ol>
            <p className="sd-muted">预计约 {output.estimatedMinutes ?? 45} 分钟</p>
            <button
              className="sd-btn"
              onClick={confirm}
              disabled={loading || plan?.status !== "WAITING_USER"}
              data-testid="confirm-plan"
            >
              {loading ? "提交中…" : "确认计划并开始"}
            </button>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
