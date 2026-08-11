"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Suspense } from "react";

type ProjectItem = {
  publicId: string;
  title: string;
  status: string;
  currentStepCode: string | null;
  progress: number;
  updatedAt: string;
};

function ProjectsInner() {
  const search = useSearchParams();
  const filter = search.get("filter") ?? "all";
  const [localFilter, setLocalFilter] = useState(filter);

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => api<{ projects: ProjectItem[] }>("/api/projects"),
  });

  const list = useMemo(() => {
    const items = projects.data?.success ? projects.data.data.projects : [];
    if (localFilter === "completed") return items.filter((p) => p.status === "COMPLETED" || p.progress >= 90);
    if (localFilter === "waiting") return items.filter((p) => p.status === "WAITING_USER");
    if (localFilter === "active") {
      return items.filter((p) => ["ACTIVE", "AI_PROCESSING", "PAYMENT_REQUIRED", "WAITING_USER"].includes(p.status));
    }
    return items;
  }, [projects.data, localFilter]);

  const continueHref = (p: ProjectItem) => {
    if (p.status === "PAYMENT_REQUIRED") return `/projects/${p.publicId}/preview`;
    if (p.currentStepCode === "USER_JUDGMENT") return `/projects/${p.publicId}/decisions`;
    if (p.currentStepCode === "SELECT_COMPETITORS") return `/projects/${p.publicId}/competitors`;
    if (p.currentStepCode === "RESEARCH_SOURCES") return `/projects/${p.publicId}/sources`;
    if (p.progress >= 90) return `/projects/${p.publicId}/report`;
    return `/projects/${p.publicId}/plan`;
  };

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
        ].map(([key, label]) => (
          <button
            key={key}
            className="sd-chip"
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
      {!projects.data?.success ? (
        <div className="sd-card">
          请先 <Link href="/login">登录</Link> 查看项目。
        </div>
      ) : list.length === 0 ? (
        <div className="sd-card sd-muted">暂无项目。</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((p) => (
            <Link key={p.publicId} href={continueHref(p)} className="sd-card">
              <strong>{p.title}</strong>
              <div className="sd-muted">
                {p.status} · {p.currentStepCode} · {p.progress}%
              </div>
            </Link>
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
