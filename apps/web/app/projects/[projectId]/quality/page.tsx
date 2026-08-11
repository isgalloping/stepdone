"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { api } from "@/lib/api-client";
import type { QualityIssue } from "@/lib/quality";
import { useProjectSteps } from "@/hooks/use-project";

const SCORE_LABELS: Record<string, string> = {
  accuracy: "准确性",
  completeness: "完整性",
  logic: "逻辑性",
  timeliness: "时效性",
  usability: "可用性",
  expression: "表达",
  risk: "风险控制",
};

export default function QualityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "QUALITY_REVIEW")
    : undefined;
  const [scores, setScores] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await api<{
        scores: Record<string, number>;
        issues: QualityIssue[];
      }>(`/api/projects/${projectId}/quality-check`);
      if (cancelled) return;
      if (res.success) {
        setScores(res.data.scores);
        setIssues(res.data.issues);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, run?.status]);

  async function resolveIssue(issueId: string) {
    setMsg("");
    const res = await api<{
      scores: Record<string, number>;
      issues: QualityIssue[];
    }>(`/api/projects/${projectId}/quality-check`, {
      method: "PATCH",
      body: JSON.stringify({ issueId, status: "RESOLVED" }),
    });
    if (!res.success) {
      setMsg(res.error.message);
      return;
    }
    setScores(res.data.scores);
    setIssues(res.data.issues);
  }

  const displayScores =
    Object.keys(scores).length > 0
      ? scores
      : {
          accuracy: 88,
          completeness: 92,
          logic: 86,
          timeliness: 80,
        };

  return (
    <WorkspaceShell
      projectId={projectId}
      mentor={<p>处理高风险问题后再交付。仍可强制导出，但会提示风险。</p>}
    >
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>质量检查</h1>
        {!run || run.status === "QUEUED" || run.status === "RUNNING" ? (
          <p className="sd-muted">质量检查生成中…</p>
        ) : null}
        {msg ? <p className="sd-muted">{msg}</p> : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {Object.entries(displayScores).map(([k, v]) => (
            <div key={k} className="sd-card" style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: "0 auto 8px",
                  borderRadius: "50%",
                  border: "6px solid var(--sd-primary)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--sd-primary)",
                }}
              >
                {v}
              </div>
              <div className="sd-muted">{SCORE_LABELS[k] ?? k}</div>
            </div>
          ))}
        </div>
        <h3 style={{ marginTop: 24 }}>问题清单</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {issues.map((issue) => (
            <div key={issue.id} className="sd-card">
              <div className="sd-chip">{issue.severity}</div>
              <p>{issue.message}</p>
              <button
                className="sd-btn sd-btn-secondary"
                disabled={issue.status === "RESOLVED"}
                onClick={() => void resolveIssue(issue.id)}
              >
                {issue.status === "RESOLVED" ? "已处理" : "标记为已修改"}
              </button>
            </div>
          ))}
          {!loading && !issues.length ? (
            <p className="sd-muted">质量报告生成中或暂无问题。</p>
          ) : null}
        </div>
      </div>
    </WorkspaceShell>
  );
}
