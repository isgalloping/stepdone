"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";

type ProjectItem = {
  publicId: string;
  title: string;
  status: string;
  currentStepCode: string | null;
  progress: number;
  revision: number;
  archivedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  ACTIVE: "进行中",
  WAITING_USER: "等待我处理",
  AI_PROCESSING: "AI 处理中",
  PAYMENT_REQUIRED: "待付费",
  QUALITY_REVIEW: "质量检查",
  COMPLETED: "已完成",
  ARCHIVED: "已归档",
  FAILED: "失败",
  CANCELLED: "已取消",
};

function ProjectsInner() {
  const search = useSearchParams();
  const [localFilter, setLocalFilter] = useState(search.get("filter") ?? "all");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const queryClient = useQueryClient();

  const recycle = localFilter === "deleted";
  const projects = useQuery({
    queryKey: ["projects", recycle ? "deleted" : "active"],
    queryFn: async () =>
      api<{ projects: ProjectItem[] }>(
        recycle ? "/api/projects?view=deleted" : "/api/projects",
      ),
  });

  const list = useMemo(() => {
    const items = projects.data?.success ? projects.data.data.projects : [];
    if (recycle) return items;
    if (localFilter === "archived") return items.filter((p) => p.archivedAt);
    const active = items.filter((p) => !p.archivedAt);
    if (localFilter === "completed")
      return active.filter((p) => p.status === "COMPLETED" || p.progress >= 90);
    if (localFilter === "waiting")
      return active.filter((p) => p.status === "WAITING_USER");
    if (localFilter === "active")
      return active.filter((p) =>
        ["ACTIVE", "AI_PROCESSING", "PAYMENT_REQUIRED", "WAITING_USER"].includes(
          p.status,
        ),
      );
    return active;
  }, [projects.data, localFilter, recycle]);

  const continueHref = (p: ProjectItem) => {
    if (p.status === "PAYMENT_REQUIRED") return `/projects/${p.publicId}/preview`;
    if (p.currentStepCode === "USER_JUDGMENT") return `/projects/${p.publicId}/decisions`;
    if (p.currentStepCode === "SELECT_COMPETITORS") return `/projects/${p.publicId}/competitors`;
    if (p.currentStepCode === "RESEARCH_SOURCES") return `/projects/${p.publicId}/sources`;
    if (p.progress >= 90) return `/projects/${p.publicId}/report`;
    return `/projects/${p.publicId}/plan`;
  };

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  async function rename(p: ProjectItem) {
    const title = window.prompt("重命名项目", p.title);
    if (!title || title.trim() === p.title) return;
    setBusy(p.publicId);
    const res = await api(`/api/projects/${p.publicId}`, {
      method: "PATCH",
      body: JSON.stringify({ revision: p.revision, changes: { title: title.trim() } }),
    });
    setBusy(null);
    if (!res.success) {
      setToast(res.error.code === "PROJECT_REVISION_CONFLICT" ? "版本冲突，请刷新后重试" : res.error.message);
      return;
    }
    setToast("已重命名");
    await refresh();
  }

  async function toggleArchive(p: ProjectItem) {
    setBusy(p.publicId);
    const res = await api(`/api/projects/${p.publicId}/archive`, {
      method: "POST",
      body: JSON.stringify({ archived: !p.archivedAt }),
    });
    setBusy(null);
    if (!res.success) return setToast(res.error.message);
    setToast(p.archivedAt ? "已取消归档" : "已归档");
    await refresh();
  }

  async function remove(p: ProjectItem) {
    if (!window.confirm(`删除「${p.title}」？删除后将在回收站保留 30 天，期间可以恢复。`)) return;
    setBusy(p.publicId);
    const res = await api(`/api/projects/${p.publicId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.success) return setToast(res.error.message);
    setToast("已删除，30 天内可在回收站恢复");
    await refresh();
  }

  async function restore(p: ProjectItem) {
    setBusy(p.publicId);
    const res = await api(`/api/projects/${p.publicId}/restore`, { method: "POST" });
    setBusy(null);
    if (!res.success) return setToast(res.error.message);
    setToast("已恢复");
    await refresh();
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>我的项目</h1>
        <Link href="/projects/new" className="sd-btn">
          新建
        </Link>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "1rem 0" }}>
        {[
          ["all", "全部"],
          ["active", "进行中"],
          ["waiting", "等待我处理"],
          ["completed", "已完成"],
          ["archived", "已归档"],
          ["deleted", "回收站"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="sd-chip"
            data-testid={`filter-${key}`}
            style={{
              border: "none",
              cursor: "pointer",
              background: localFilter === key ? "var(--sd-primary)" : "var(--sd-soft)",
              color: localFilter === key ? "white" : "var(--sd-primary)",
            }}
            onClick={() => setLocalFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {toast ? (
        <div className="sd-card sd-muted" style={{ marginBottom: 10 }} data-testid="projects-toast">
          {toast}
        </div>
      ) : null}
      {!projects.data?.success ? (
        <div className="sd-card">
          请先 <Link href="/login">登录</Link> 查看项目。
        </div>
      ) : list.length === 0 ? (
        <div className="sd-card sd-muted">
          {recycle ? "回收站为空。" : "暂无项目。"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((p) => (
            <div key={p.publicId} className="sd-card" data-testid="project-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{p.title}</strong>
                  {p.archivedAt ? <span className="sd-chip" style={{ marginLeft: 8 }}>已归档</span> : null}
                  <div className="sd-muted" style={{ fontSize: 13 }}>
                    {STATUS_LABEL[p.status] ?? p.status} · {p.currentStepCode ?? "-"} · {p.progress}%
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {recycle ? (
                    <button
                      className="sd-btn sd-btn-secondary"
                      disabled={busy === p.publicId}
                      onClick={() => restore(p)}
                      data-testid="project-restore"
                    >
                      恢复
                    </button>
                  ) : (
                    <>
                      <Link href={continueHref(p)} className="sd-btn" data-testid="project-continue">
                        {p.progress >= 90 ? "查看成果" : "继续"}
                      </Link>
                      <button className="sd-btn sd-btn-secondary" disabled={busy === p.publicId} onClick={() => rename(p)} data-testid="project-rename">
                        重命名
                      </button>
                      <button className="sd-btn sd-btn-secondary" disabled={busy === p.publicId} onClick={() => toggleArchive(p)} data-testid="project-archive">
                        {p.archivedAt ? "取消归档" : "归档"}
                      </button>
                      <button className="sd-btn sd-btn-secondary" disabled={busy === p.publicId} onClick={() => remove(p)} data-testid="project-delete">
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="sd-card">加载中…</div>}>
      <ProjectsInner />
    </Suspense>
  );
}
