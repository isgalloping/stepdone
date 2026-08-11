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
  const [retrying, setRetrying] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

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

  const entitlements = useQuery({
    queryKey: ["entitlements"],
    queryFn: async () =>
      api<{ entitlements: Array<{ type: string; remaining: number }> }>(
        "/api/entitlements",
      ),
  });

  const research = steps.data?.success
    ? steps.data.data.runs.find((r) => r.nodeCode === "RESEARCH_SOURCES")
    : undefined;
  const done = research?.status === "SUCCEEDED";
  const list = sources.data?.success ? sources.data.data.sources : [];
  const canResearchRetry =
    entitlements.data?.success &&
    entitlements.data.data.entitlements.some(
      (e) => e.type === "RESEARCH_RETRY" && e.remaining > 0,
    );

  async function continueNext() {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/api/projects/${projectId}/steps/RESEARCH_SOURCES/decision`, {
        method: "POST",
        body: JSON.stringify({ action: "CONTINUE" }),
      });
      if (res.success) {
        router.push(`/projects/${projectId}/dimensions`);
        return;
      }
      setError(res.error.message);
    } catch {
      setError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function addSourceUrl() {
    if (!url.trim()) return;
    setAddingUrl(true);
    setError("");
    try {
      const res = await api(`/api/projects/${projectId}/sources`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || url.trim(),
          url: url.trim(),
          publisher: "用户添加",
        }),
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setUrl("");
      setTitle("");
      await sources.refetch();
    } catch {
      setError("网络异常，请重试");
    } finally {
      setAddingUrl(false);
    }
  }

  async function researchRetry() {
    setRetrying(true);
    setError("");
    try {
      const res = await api<{ remaining: number; agentRunId?: string }>(
        "/api/entitlements/consume",
        {
          method: "POST",
          body: JSON.stringify({ projectId, type: "RESEARCH_RETRY" }),
        },
      );
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      await Promise.all([sources.refetch(), steps.refetch(), entitlements.refetch()]);
    } catch {
      setError("网络异常，请重试");
    } finally {
      setRetrying(false);
    }
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
              <strong style={{ textDecoration: s.excluded ? "line-through" : "none" }}>
                {s.title}
              </strong>
              <div className="sd-muted">
                {s.publisher ?? "未知"} · 可信度 {s.credibility}
                {s.excluded ? " · 已排除" : ""}
              </div>
              <button
                className="sd-btn sd-btn-secondary"
                style={{ minHeight: 32, marginTop: 8 }}
                onClick={async () => {
                  await api(`/api/sources/${s.publicId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ excluded: !s.excluded }),
                  });
                  await sources.refetch();
                }}
              >
                {s.excluded ? "恢复来源" : "排除来源"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <input
            className="sd-input"
            placeholder="资料链接（https://…）"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className="sd-input"
            placeholder="标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="sd-btn sd-btn-secondary"
            style={{ width: "100%" }}
            disabled={!url.trim() || addingUrl}
            onClick={addSourceUrl}
            data-testid="add-source-url"
          >
            {addingUrl ? "添加中…" : "添加资料链接"}
          </button>
        </div>
        {error ? <p style={{ color: "var(--sd-danger)" }}>{error}</p> : null}
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {canResearchRetry ? (
            <button
              className="sd-btn sd-btn-secondary"
              style={{ width: "100%" }}
              disabled={retrying || loading}
              onClick={researchRetry}
              data-testid="research-retry"
            >
              {retrying ? "重试中…" : "重新搜集"}
            </button>
          ) : (
            <button
              className="sd-btn sd-btn-secondary"
              style={{ width: "100%" }}
              disabled
              data-testid="research-retry"
              title="需专业版重试"
            >
              需专业版重试
            </button>
          )}
          <button
            className="sd-btn"
            style={{ width: "100%" }}
            disabled={!done || loading}
            onClick={continueNext}
            data-testid="continue-sources"
          >
            {loading ? "提交中…" : "继续"}
          </button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
