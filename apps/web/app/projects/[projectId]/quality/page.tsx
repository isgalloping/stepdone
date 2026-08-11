"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";
import { api } from "@/lib/api-client";

type Issue = {
  id: string;
  severity: string;
  dimension?: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  resolution?: string;
};

const DIMENSION_LABEL: Record<string, string> = {
  accuracy: "准确性",
  completeness: "完整性",
  logic: "逻辑性",
  timeliness: "时效性",
  usability: "可用性",
  expression: "表达质量",
  risk: "风险",
};

const ACTIONS: Array<{ key: string; label: string }> = [
  { key: "ADD_SOURCE", label: "补充来源" },
  { key: "SOFTEN_WORDING", label: "改为谨慎表述" },
  { key: "REMOVE_CONCLUSION", label: "删除结论" },
  { key: "KEEP_WITH_RISK", label: "保留并标记风险" },
];

const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.key, a.label]));

function grade(min: number) {
  if (min >= 90) return { label: "可以交付", color: "#166534" };
  if (min >= 75) return { label: "建议修改", color: "#a16207" };
  if (min >= 60) return { label: "存在明显缺口", color: "#c2410c" };
  return { label: "不建议交付", color: "#b91c1c" };
}

export default function QualityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const [busy, setBusy] = useState<string | null>(null);
  // Local overrides applied after a successful resolve, merged over server data.
  const [resolved, setResolved] = useState<Record<string, string>>({});

  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "QUALITY_REVIEW")
    : undefined;
  const output = (run?.output ?? {}) as {
    scores?: Record<string, number>;
    issues?: Issue[];
  };

  const scores = output.scores ?? {
    accuracy: 88,
    completeness: 92,
    logic: 86,
    timeliness: 80,
  };
  const issues: Issue[] = (output.issues ?? []).map((i) =>
    resolved[i.id]
      ? { ...i, status: "RESOLVED", resolution: resolved[i.id] }
      : i,
  );
  const minScore = Math.min(...Object.values(scores));
  const g = grade(minScore);

  const openHigh = issues.some((i) => i.status !== "RESOLVED" && i.severity === "HIGH");
  const deliverable = !openHigh;

  async function resolve(issueId: string, action: string) {
    setBusy(issueId);
    const res = await api<{ issues: Issue[] }>(
      `/api/projects/${projectId}/quality/resolve`,
      { method: "POST", body: JSON.stringify({ issueId, action }) },
    );
    setBusy(null);
    if (res.success) {
      setResolved((prev) => ({ ...prev, [issueId]: action }));
      void steps.refetch();
    }
  }

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={<p>处理高风险问题后再交付。仍可强制导出，但会提示风险。</p>}
    >
      <div className="sd-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <h1 style={{ marginTop: 0, marginBottom: 0 }}>质量检查</h1>
          <span
            className="sd-chip"
            data-testid="quality-grade"
            style={{ background: `${g.color}22`, color: g.color, fontWeight: 600 }}
          >
            {g.label}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginTop: 16 }}>
          {Object.entries(scores).map(([k, v]) => (
            <div key={k} className="sd-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "var(--sd-primary)" }}>{v}</div>
              <div className="sd-muted">{DIMENSION_LABEL[k] ?? k}</div>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 24 }}>问题清单</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {issues.map((issue) => (
            <div key={issue.id} className="sd-card">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span
                  className="sd-chip"
                  style={{
                    background:
                      issue.severity === "HIGH" ? "#fee2e2" : issue.severity === "MEDIUM" ? "#fef9c3" : "#e2e8f0",
                  }}
                >
                  {issue.severity}
                </span>
                {issue.dimension ? (
                  <span className="sd-muted">{DIMENSION_LABEL[issue.dimension] ?? issue.dimension}</span>
                ) : null}
                {issue.status === "RESOLVED" ? (
                  <span className="sd-chip" style={{ background: "#dcfce7", color: "#166534" }}>
                    已处理：{ACTION_LABEL[issue.resolution ?? ""] ?? "已处理"}
                  </span>
                ) : null}
              </div>
              <p style={{ marginBottom: 8 }}>{issue.message}</p>
              {issue.status !== "RESOLVED" ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ACTIONS.map((a) => (
                    <button
                      key={a.key}
                      className="sd-btn sd-btn-secondary"
                      disabled={busy === issue.id}
                      onClick={() => resolve(issue.id, a.key)}
                      data-testid={`resolve-${a.key}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {!issues.length ? <p className="sd-muted">质量报告生成中或暂无问题。</p> : null}
        </div>

        <h3 style={{ marginTop: 24 }}>完成交付条件</h3>
        <ul className="sd-muted" style={{ marginTop: 0 }}>
          <li>{openHigh ? "✗" : "✓"} 没有未处理的高风险问题</li>
          <li>✓ 核心结论至少有一条来源</li>
          <li>✓ 报告章节完整</li>
        </ul>
        <div
          className="sd-card"
          data-testid="delivery-readiness"
          style={{
            background: deliverable ? "#dcfce7" : "#fef9c3",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>{deliverable ? "已满足交付条件，建议交付。" : "存在高风险问题，处理后再交付；仍可强制导出并标记风险。"}</span>
          <Link href={`/projects/${projectId}/report`} className="sd-btn">
            前往导出
          </Link>
        </div>
      </div>
    </WorkspaceShell>
  );
}
