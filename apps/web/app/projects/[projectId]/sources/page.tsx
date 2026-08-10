"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { useProjectSteps } from "@/hooks/use-project";
import { api } from "@/lib/api-client";
import { useState } from "react";

export default function SourcesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const steps = useProjectSteps(projectId);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const sources = useQuery({
    queryKey: ["sources", projectId],
    queryFn: async () =>
      api<{
        sources: Array<{
          publicId: string;
          title: string;
          publisher: string | null;
          credibility: string;
          excluded: boolean;
        }>;
      }>(`/api/projects/${projectId}/sources`),
    refetchInterval: 2000,
  });

  const research = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "RESEARCH_SOURCES")
    : undefined;
  const done = research?.status === "SUCCEEDED";
  const list = sources.data?.success ? sources.data.data.sources : [];

  async function continueNext() {
    setLoading(true);
    const res = await api(`/api/projects/${projectId}/steps/RESEARCH_SOURCES/decision`, {
      method: "POST",
      body: JSON.stringify({ action: "CONTINUE" }),
    });
    setLoading(false);
    if (res.success) router.push(`/projects/${projectId}/dimensions`);
  }

  return (
    <WorkspaceShell projectId={projectId} mentor={<p>请检查来源可信度。无法访问的页面不会阻断项目。</p>}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>正在搜集和验证资料</h1>
        <p className="sd-muted">
          {done ? `已完成 ${list.length} 项` : "资料搜集进行中…"}
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {list.map((s) => (
            <div key={s.publicId} style={{ padding: "0.75rem", background: "var(--sd-bg)", borderRadius: 10 }}>
              <strong>{s.title}</strong>
              <div className="sd-muted">
                {s.publisher ?? "未知"} · 可信度 {s.credibility}
              </div>
            </div>
          ))}
        </div>
        <button
          className="sd-btn"
          style={{ width: "100%", marginTop: 16 }}
          disabled={!done || loading}
          onClick={continueNext}
          data-testid="continue-sources"
        >
          继续
        </button>
      </div>
    </WorkspaceShell>
  );
}
