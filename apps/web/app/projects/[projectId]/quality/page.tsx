"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";

type Issue = {
  id: string;
  severity: string;
  message: string;
  status: "OPEN" | "RESOLVED";
};

export default function QualityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const run = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "QUALITY_REVIEW")
    : undefined;
  const output = (run?.output ?? {}) as {
    scores?: Record<string, number>;
    issues?: Issue[];
  };
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    if (output.issues?.length) setIssues(output.issues);
  }, [output.issues]);

  const scores = output.scores ?? {
    accuracy: 88,
    completeness: 92,
    logic: 86,
    timeliness: 80,
  };

  return (
    <WorkspaceShell projectId={projectId} mentor={<p>处理高风险问题后再交付。仍可强制导出，但会提示风险。</p>}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>质量检查</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {Object.entries(scores).map(([k, v]) => (
            <div key={k} className="sd-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--sd-primary)" }}>{v}</div>
              <div className="sd-muted">{k}</div>
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
                onClick={() =>
                  setIssues((prev) =>
                    prev.map((i) =>
                      i.id === issue.id ? { ...i, status: "RESOLVED" } : i,
                    ),
                  )
                }
              >
                {issue.status === "RESOLVED" ? "已处理" : "修改表述"}
              </button>
            </div>
          ))}
          {!issues.length ? <p className="sd-muted">质量报告生成中或暂无问题。</p> : null}
        </div>
      </div>
    </WorkspaceShell>
  );
}
